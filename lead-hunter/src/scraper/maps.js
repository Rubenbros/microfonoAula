import { chromium } from 'playwright';
import { insertLead, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const log = createLogger('scraper');

// Delay aleatorio para parecer humano
function delay(min = 1000, max = 3000) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

/**
 * Escanea Google Maps buscando negocios de un sector en una zona
 * @param {string} zone - Zona geográfica (ej: "Zaragoza centro")
 * @param {string} sector - Sector/keyword (ej: "peluquería")
 * @param {number} maxResults - Máximo de resultados a extraer
 * @returns {Array} Lista de negocios encontrados
 */
export async function scanGoogleMaps(zone, sector, maxResults = 40) {
  const query = `${sector} en ${zone}`;
  log.info(`Escaneando: "${query}" (máx ${maxResults} resultados)`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'es-ES',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    // Ir a Google Maps con la búsqueda directa en la URL
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000, 4000);

    // Aceptar cookies — Google muestra consent en iframe o en página completa
    try {
      // Intentar el botón directo
      const acceptBtn = page.locator('button:has-text("Aceptar todo"), button:has-text("Accept all")');
      if (await acceptBtn.first().isVisible({ timeout: 5000 })) {
        await acceptBtn.first().click();
        await delay(2000, 3000);
      }
    } catch { /* sin banner */ }

    // Si hay iframe de consentimiento (consent.google.com)
    try {
      const consentFrame = page.frameLocator('iframe[src*="consent.google"]');
      const consentBtn = consentFrame.locator('button:has-text("Aceptar todo"), button:has-text("Accept all")');
      if (await consentBtn.first().isVisible({ timeout: 3000 })) {
        await consentBtn.first().click();
        await delay(2000, 3000);
      }
    } catch { /* sin iframe de consent */ }

    // Esperar a que carguen los resultados
    await page.waitForSelector('[role="feed"], #searchboxinput', { timeout: 15000 }).catch(() => null);
    await delay(2000, 3000);

    // Scroll en el panel de resultados para cargar más
    const feed = page.locator('[role="feed"]');
    let previousCount = 0;
    let scrollAttempts = 0;

    while (scrollAttempts < 10) {
      // Extraer items visibles
      const items = await feed.locator('[data-result-index]').count().catch(() => 0);

      if (items >= maxResults || items === previousCount) break;
      previousCount = items;

      // Scroll hacia abajo en el panel
      await feed.evaluate(el => el.scrollTop = el.scrollHeight);
      await delay(1500, 3000);
      scrollAttempts++;
    }

    // Extraer datos de cada resultado
    const listings = feed.locator('a[href*="/maps/place/"]');
    const count = Math.min(await listings.count(), maxResults);

    for (let i = 0; i < count; i++) {
      try {
        // Extraer nombre del listing antes de hacer click
        const listingText = await listings.nth(i).getAttribute('aria-label').catch(() => null);

        await listings.nth(i).click();
        await delay(2000, 3500);

        const business = await extractBusinessInfo(page, listingText);
        if (business && business.name && business.name !== 'Resultados') {
          business.zone = zone;
          business.sector = sector;
          results.push(business);
          log.info(`  [${i + 1}/${count}] ${business.name} — ${business.website || 'sin web'}`);
        }
      } catch (err) {
        log.warn(`  [${i + 1}/${count}] Error extrayendo info: ${err.message}`);
      }
    }

    log.info(`Escaneo completado: ${results.length} negocios encontrados`);

  } catch (err) {
    log.error(`Error en escaneo: ${err.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Extrae información del negocio del panel lateral de Google Maps
 */
async function extractBusinessInfo(page, listingName = null) {
  const info = {
    name: null,
    address: null,
    phone: null,
    email: null,
    website: null,
    google_maps_url: null,
    rating: null,
    review_count: null,
  };

  try {
    // Nombre — intentar varios selectores, fallback al aria-label del listing
    info.name = await page.locator('h1.DUwDvf, h1.fontHeadlineLarge, [role="main"] h1').first().textContent().catch(() => null);
    if (!info.name || info.name === 'Resultados') {
      info.name = await page.locator('h1').nth(1).textContent().catch(() => null);
    }
    if (!info.name || info.name === 'Resultados') {
      info.name = listingName;
    }

    // URL de Google Maps
    info.google_maps_url = page.url();

    // Rating y reseñas
    const ratingText = await page.locator('[role="img"][aria-label*="estrellas"]')
      .getAttribute('aria-label').catch(() => null);
    if (ratingText) {
      const match = ratingText.match(/([\d,]+)\s*estrellas/);
      if (match) info.rating = parseFloat(match[1].replace(',', '.'));
    }

    const reviewText = await page.locator('button[aria-label*="reseñas"]')
      .textContent().catch(() => null);
    if (reviewText) {
      const match = reviewText.match(/([\d.]+)/);
      if (match) info.review_count = parseInt(match[1].replace('.', ''));
    }

    // Datos del panel de info (dirección, teléfono, web)
    const infoButtons = page.locator('[data-item-id]');
    const buttonCount = await infoButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const itemId = await infoButtons.nth(i).getAttribute('data-item-id');
      const text = await infoButtons.nth(i).textContent().catch(() => '');

      if (itemId?.startsWith('address')) {
        info.address = text.trim();
      } else if (itemId?.startsWith('phone')) {
        info.phone = text.trim();
      } else if (itemId?.startsWith('authority')) {
        info.website = await infoButtons.nth(i).locator('a').getAttribute('href').catch(() => text.trim());
      }
    }

  } catch (err) {
    log.warn(`Error parseando info: ${err.message}`);
  }

  return info;
}

/**
 * Guarda los resultados del escaneo en la base de datos
 */
export async function saveResults(results, zone, sector) {
  let newCount = 0;

  for (const biz of results) {
    const result = insertLead({
      name: biz.name,
      sector: biz.sector || sector,
      address: biz.address,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      google_maps_url: biz.google_maps_url,
      rating: biz.rating,
      review_count: biz.review_count,
      zone: biz.zone || zone,
    });
    if (result.changes > 0) newCount++;
  }

  insertScan(zone, sector, results.length, newCount);
  log.info(`Guardados: ${newCount} leads nuevos de ${results.length} encontrados`);

  return { total: results.length, new: newCount };
}

// Ejecutar directamente para pruebas
if (process.argv[1] && process.argv[1].includes('maps.js')) {
  const zone = process.argv[2] || 'Zaragoza';
  const sector = process.argv[3] || 'peluquería';

  console.log(`\nIniciando escaneo: "${sector}" en "${zone}"\n`);
  const results = await scanGoogleMaps(zone, sector, 20);
  const saved = await saveResults(results, zone, sector);
  console.log(`\nResultado: ${saved.total} encontrados, ${saved.new} nuevos`);
  process.exit(0);
}
