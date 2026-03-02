import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertOnlineLead, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('google-linkedin');

// Cargar configuración
const config = JSON.parse(
  readFileSync(join(__dirname, '../../config/online_sources.json'), 'utf-8')
);
const SERVICES = config.services_offered;

// Delay aleatorio para parecer humano
function delay(min = 2000, max = 5000) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

// Queries de búsqueda en Google → LinkedIn
const SEARCH_QUERIES = [
  // Inglés — búsqueda de desarrolladores
  'site:linkedin.com/posts "looking for a developer"',
  'site:linkedin.com/posts "need a developer"',
  'site:linkedin.com/posts "hiring developer" OR "hiring programmer"',
  'site:linkedin.com/posts "looking for someone to build"',
  'site:linkedin.com/posts "need a website" OR "need a web developer"',
  'site:linkedin.com/posts "chatbot" OR "whatsapp bot" OR "automation"',
  'site:linkedin.com/posts "ai training" OR "ai workshop" OR "ai consulting"',
  'site:linkedin.com/posts "freelance developer needed"',
  // Español — búsqueda de desarrolladores
  'site:linkedin.com/posts "busco programador" OR "busco desarrollador"',
  'site:linkedin.com/posts "necesito web" OR "necesito página web"',
  'site:linkedin.com/posts "necesito bot" OR "necesito automatización"',
  'site:linkedin.com/posts "formación inteligencia artificial" OR "curso IA empresa"',
  // Jobs publicados en LinkedIn
  'site:linkedin.com/jobs "web developer" remote',
  'site:linkedin.com/jobs "java developer" remote',
  'site:linkedin.com/jobs "automation" OR "bot developer" remote',
];

/**
 * Ejecuta una búsqueda en Google y extrae resultados de LinkedIn
 */
async function searchGoogle(page, query, maxResults = 10) {
  log.info(`  Buscando: "${query.slice(0, 60)}..."`);

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&tbs=qdr:w`;
  // tbs=qdr:w = resultados de la última semana

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(1500, 3000);

    // Aceptar cookies si aparece
    try {
      const acceptBtn = page.locator('button:has-text("Aceptar todo")');
      if (await acceptBtn.isVisible({ timeout: 2000 })) {
        await acceptBtn.click();
        await delay(1000, 2000);
      }
    } catch { /* no hay banner */ }

    // Extraer resultados de búsqueda
    const results = await page.evaluate(() => {
      const items = [];
      // Selectores de resultados de Google
      const searchResults = document.querySelectorAll('#search .g, #rso .g');

      for (const result of searchResults) {
        const linkEl = result.querySelector('a[href*="linkedin.com"]');
        const titleEl = result.querySelector('h3');
        const snippetEl = result.querySelector('[data-sncf], .VwiC3b, .lEBKkf');

        if (linkEl && titleEl) {
          items.push({
            title: titleEl.textContent.trim(),
            url: linkEl.href,
            snippet: snippetEl ? snippetEl.textContent.trim() : '',
          });
        }
      }
      return items;
    });

    return results.filter(r =>
      r.url.includes('linkedin.com') &&
      !r.url.includes('/login') &&
      !r.url.includes('/signup')
    );

  } catch (err) {
    log.warn(`  Error buscando "${query.slice(0, 40)}": ${err.message}`);
    return [];
  }
}

/**
 * Parsea un resultado de Google/LinkedIn en un lead
 */
function parseGoogleLinkedInResult(result, query) {
  const fullText = `${result.title} ${result.snippet}`.toLowerCase();

  // Extraer autor de LinkedIn del snippet o URL
  let author = null;
  const authorMatch = result.url.match(/linkedin\.com\/in\/([^/?\s]+)/);
  if (authorMatch) author = authorMatch[1];

  // Determinar si es un post, job o perfil
  let sourceType = 'linkedin_post';
  if (result.url.includes('/jobs/')) sourceType = 'linkedin_job';
  else if (result.url.includes('/in/')) sourceType = 'linkedin_profile';
  else if (result.url.includes('/posts/')) sourceType = 'linkedin_post';
  else if (result.url.includes('/pulse/')) sourceType = 'linkedin_article';

  return {
    name: result.title.slice(0, 200),
    source: 'linkedin',
    source_url: result.url,
    source_id: generateSourceId(result.url),
    source_author: author,
    email: null,
    description: result.snippet.slice(0, 2000),
    budget_min: extractBudget(fullText).min,
    budget_max: extractBudget(fullText).max,
    service_type: detectServiceType(fullText),
    urgency: detectUrgency(fullText),
    language: detectLanguage(fullText),
    post_date: new Date().toISOString(), // Google no da fecha exacta, usamos hoy
    sector: sourceType,
    zone: 'online',
  };
}

/**
 * Genera un ID único a partir de la URL
 */
function generateSourceId(url) {
  // Extraer la parte relevante de la URL de LinkedIn
  const cleaned = url.replace(/[?#].*$/, '').replace(/\/$/, '');
  // Hash simple basado en la URL
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `gli_${Math.abs(hash).toString(36)}`;
}

/**
 * Detecta tipo de servicio (reutiliza lógica de config)
 */
function detectServiceType(text) {
  for (const service of SERVICES) {
    if (service.names.some(keyword => text.includes(keyword))) {
      return service.type;
    }
  }
  return 'software';
}

/**
 * Extrae presupuesto
 */
function extractBudget(text) {
  const patterns = [
    /\$\s*([\d,]+)\s*[-–to]+\s*\$?\s*([\d,]+)/i,
    /([\d,]+)\s*[-–to]+\s*([\d,]+)\s*(?:USD|EUR|€|\$)/i,
    /\$\s*([\d,]+)/,
    /([\d,]+)\s*(?:USD|EUR|€)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val1 = parseInt(match[1].replace(/,/g, ''));
      const val2 = match[2] ? parseInt(match[2].replace(/,/g, '')) : null;
      if (val1 > 10 && val1 < 1000000) {
        return { min: val1, max: val2 && val2 > val1 ? val2 : val1 };
      }
    }
  }
  return { min: null, max: null };
}

/**
 * Detecta urgencia
 */
function detectUrgency(text) {
  const high = ['asap', 'urgent', 'urgente', 'immediately', 'this week', 'esta semana', 'deadline'];
  const medium = ['soon', 'pronto', 'next week', 'this month'];
  if (high.some(kw => text.includes(kw))) return 'high';
  if (medium.some(kw => text.includes(kw))) return 'medium';
  return 'low';
}

/**
 * Detecta idioma
 */
function detectLanguage(text) {
  const spanish = ['necesito', 'busco', 'quiero', 'empresa', 'presupuesto', 'programador', 'desarrollador'];
  const count = spanish.filter(w => text.includes(w)).length;
  return count >= 2 ? 'es' : 'en';
}

/**
 * Escanea Google buscando oportunidades de LinkedIn
 */
export async function scanGoogleLinkedIn() {
  log.info('=== Iniciando escaneo Google → LinkedIn ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'es-ES',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const allResults = [];

  try {
    // Ejecutar solo un subconjunto aleatorio de queries por sesión (evitar bloqueo Google)
    const shuffled = SEARCH_QUERIES.sort(() => Math.random() - 0.5);
    const queriesToRun = shuffled.slice(0, 5); // Máx 5 queries por sesión

    for (const query of queriesToRun) {
      const results = await searchGoogle(page, query, 10);

      for (const result of results) {
        const parsed = parseGoogleLinkedInResult(result, query);
        allResults.push(parsed);
      }

      // Delay largo entre búsquedas de Google (evitar captcha)
      await delay(5000, 10000);
    }

    // Guardar en BD
    let newCount = 0;
    for (const lead of allResults) {
      try {
        const result = insertOnlineLead(lead);
        if (result.changes > 0) newCount++;
      } catch {
        // Duplicado, ignorar
      }
    }

    // Registrar escaneo
    insertScan('linkedin', 'google-search', allResults.length, newCount, 'online', 'linkedin');

    log.info(`=== Google-LinkedIn completado: ${allResults.length} resultados, ${newCount} nuevos ===`);
    return { total: allResults.length, new: newCount };

  } catch (err) {
    log.error(`Error en escaneo Google-LinkedIn: ${err.message}`);
    return { total: 0, new: 0 };
  } finally {
    await browser.close();
  }
}

// Ejecutar directamente para pruebas
if (process.argv[1] && process.argv[1].includes('google-linkedin.js')) {
  console.log('\nIniciando escaneo Google → LinkedIn...\n');
  const result = await scanGoogleLinkedIn();
  console.log(`\nResultado: ${result.total} encontrados, ${result.new} nuevos`);
  process.exit(0);
}
