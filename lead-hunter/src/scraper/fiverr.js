import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertOnlineLead, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('fiverr-scraper');

// Cargar configuración de servicios (misma que reddit)
const config = JSON.parse(
  readFileSync(join(__dirname, '../../config/online_sources.json'), 'utf-8')
);
const SERVICES = config.services_offered;

// Búsquedas de Fiverr por categoría
const FIVERR_SEARCHES = [
  'web development spain',
  'booking system website',
  'automation bot developer',
  'wordpress website small business',
  'ecommerce store setup',
  'react nextjs developer',
  'ai chatbot development',
  'web scraping developer',
  'restaurant website',
  'business website design',
];

// Configuración
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DEFAULT_DELAY_MS = 3000;
const MAX_GIGS_PER_CATEGORY = 48; // 2 páginas de 24
const MAX_PAGES = 2;
const GIGS_PER_PAGE = 24;

// Delay entre requests
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Detecta qué tipo de servicio ofrece el gig analizando el texto
 * Misma lógica que reddit.js
 */
function detectServiceType(text) {
  for (const service of SERVICES) {
    if (service.names.some(keyword => text.includes(keyword))) {
      return service.type;
    }
  }
  return 'software'; // por defecto
}

/**
 * Extrae datos de gigs del JSON embebido en __NEXT_DATA__
 */
function parseNextData(html) {
  const gigs = [];

  try {
    const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
    if (!match || !match[1]) {
      return gigs;
    }

    const nextData = JSON.parse(match[1]);

    // Navegar la estructura de datos de Fiverr
    // Fiverr suele poner los resultados en props.pageProps
    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) return gigs;

    // Buscar array de gigs en varias ubicaciones posibles
    const gigResults =
      pageProps?.gigs ||
      pageProps?.results ||
      pageProps?.searchResults?.gigs ||
      pageProps?.data?.gigs ||
      pageProps?.data?.results ||
      [];

    for (const gig of gigResults) {
      try {
        gigs.push({
          id: gig.gig_id || gig.id || gig.slug || null,
          title: gig.title || gig.gig_title || '',
          url: gig.url || gig.gig_url || (gig.seller ? `/${gig.seller.username}/${gig.slug || gig.url_slug}` : null),
          seller: gig.seller?.username || gig.seller_name || gig.username || '',
          price: gig.price || gig.starting_price || gig.price_i || null,
          rating: gig.rating || gig.avg_rating || gig.seller_rating || null,
          reviewCount: gig.num_of_reviews || gig.reviews_count || gig.rating_count || 0,
          category: gig.category || gig.sub_category || gig.category_name || '',
          deliveryTime: gig.delivery_time || gig.delivery || null,
          description: gig.description || gig.seo_title || gig.subcategory || '',
        });
      } catch {
        // Gig malformado, ignorar
      }
    }
  } catch (err) {
    log.warn(`Error parseando __NEXT_DATA__: ${err.message}`);
  }

  return gigs;
}

/**
 * Fallback: parsea HTML con regex para extraer datos de gigs
 */
function parseHtmlFallback(html) {
  const gigs = [];

  try {
    // Buscar gig cards con patrón de URL y título
    const gigPattern = /<a[^>]*href="(\/[^"]+\?[^"]*)"[^>]*class="[^"]*gig[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
    let match;

    while ((match = gigPattern.exec(html)) !== null && gigs.length < MAX_GIGS_PER_CATEGORY) {
      gigs.push({
        id: null,
        title: match[2].trim(),
        url: match[1],
        seller: '',
        price: null,
        rating: null,
        reviewCount: 0,
        category: '',
        deliveryTime: null,
        description: '',
      });
    }

    // Si no encontró gigs con ese patrón, intentar otro
    if (gigs.length === 0) {
      // Buscar títulos de gigs en data attributes o h3/p tags
      const titlePattern = /data-gig-id="(\d+)"[\s\S]*?<(?:h3|p)[^>]*class="[^"]*(?:title|heading)[^"]*"[^>]*>([^<]+)</gi;
      while ((match = titlePattern.exec(html)) !== null && gigs.length < MAX_GIGS_PER_CATEGORY) {
        gigs.push({
          id: match[1],
          title: match[2].trim(),
          url: null,
          seller: '',
          price: null,
          rating: null,
          reviewCount: 0,
          category: '',
          deliveryTime: null,
          description: '',
        });
      }
    }

    // Tercer intento: buscar JSON-LD structured data
    const jsonLdPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const ld = JSON.parse(match[1]);
        if (ld['@type'] === 'ItemList' && ld.itemListElement) {
          for (const item of ld.itemListElement) {
            if (item.item || item.url) {
              gigs.push({
                id: null,
                title: item.item?.name || item.name || '',
                url: item.item?.url || item.url || '',
                seller: '',
                price: item.item?.offers?.price || null,
                rating: item.item?.aggregateRating?.ratingValue || null,
                reviewCount: item.item?.aggregateRating?.reviewCount || 0,
                category: '',
                deliveryTime: null,
                description: item.item?.description || '',
              });
            }
          }
        }
      } catch {
        // JSON-LD malformado, ignorar
      }
    }
  } catch (err) {
    log.warn(`Error en fallback HTML parsing: ${err.message}`);
  }

  return gigs;
}

/**
 * Escanea una página de resultados de Fiverr para una query
 */
async function fetchFiverrPage(query, page = 1) {
  const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(query)}&source=top-bar&search_in=everywhere&page=${page}`;

  log.info(`  Fetching: ${query} (página ${page})`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  if (response.status === 429) {
    log.warn(`Rate limit en Fiverr (query: ${query}), esperando backoff...`);
    return { status: 429, gigs: [] };
  }

  if (!response.ok) {
    log.error(`Error HTTP ${response.status} en Fiverr (query: ${query})`);
    return { status: response.status, gigs: [] };
  }

  const html = await response.text();

  // Intentar __NEXT_DATA__ primero
  let gigs = parseNextData(html);

  if (gigs.length === 0) {
    log.info(`    __NEXT_DATA__ vacío, usando fallback HTML para "${query}" p${page}`);
    gigs = parseHtmlFallback(html);
  }

  log.info(`    Página ${page}: ${gigs.length} gigs encontrados`);
  return { status: response.status, gigs };
}

/**
 * Escanea una búsqueda en Fiverr (hasta MAX_PAGES páginas)
 */
export async function scanFiverrCategory(query) {
  log.info(`Escaneando Fiverr: "${query}"`);
  const allGigs = [];
  let backoffMs = DEFAULT_DELAY_MS;

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const result = await fetchFiverrPage(query, page);

      if (result.status === 429) {
        // Backoff exponencial
        backoffMs = Math.min(backoffMs * 2, 60000);
        log.warn(`  Rate limit, backoff: ${backoffMs}ms`);
        await delay(backoffMs);
        // Reintentar esta página una vez
        const retry = await fetchFiverrPage(query, page);
        if (retry.status === 429) {
          log.warn(`  Rate limit persistente, abortando categoría`);
          break;
        }
        if (retry.gigs.length > 0) {
          allGigs.push(...retry.gigs);
        }
        continue;
      }

      if (result.gigs.length === 0) {
        log.info(`  No más resultados en página ${page}, terminando`);
        break;
      }

      allGigs.push(...result.gigs);

      // Si obtuvimos menos de una página completa, no hay más
      if (result.gigs.length < GIGS_PER_PAGE) {
        break;
      }

      // Delay entre páginas
      if (page < MAX_PAGES) {
        await delay(DEFAULT_DELAY_MS);
      }
    } catch (err) {
      log.error(`  Error en página ${page} de "${query}": ${err.message}`);
      break;
    }
  }

  // Limitar al máximo por categoría
  const limited = allGigs.slice(0, MAX_GIGS_PER_CATEGORY);
  log.info(`  "${query}": ${limited.length} gigs totales`);

  // Mapear a formato de lead online
  return limited.map(gig => mapGigToLead(gig, query));
}

/**
 * Mapea un gig de Fiverr al formato de lead online
 */
function mapGigToLead(gig, searchQuery) {
  const fullText = `${gig.title} ${gig.description || ''} ${gig.category || ''}`.toLowerCase();
  const basePrice = parsePrice(gig.price);

  // Generar source_id para deduplicación
  const sourceId = gig.id
    ? String(gig.id)
    : gig.url
      ? gig.url.replace(/[?#].*/g, '').replace(/\//g, '_').slice(0, 200)
      : `${gig.seller}_${gig.title}`.slice(0, 200);

  // Construir URL completa
  let sourceUrl = null;
  if (gig.url) {
    sourceUrl = gig.url.startsWith('http') ? gig.url : `https://www.fiverr.com${gig.url}`;
    // Limpiar query params de tracking
    try {
      const parsed = new URL(sourceUrl);
      parsed.search = '';
      sourceUrl = parsed.toString();
    } catch {
      // URL malformada, usar tal cual
    }
  }

  return {
    name: (gig.title || 'Fiverr Gig').slice(0, 200),
    source: 'fiverr',
    source_url: sourceUrl,
    source_id: sourceId,
    source_author: gig.seller || null,
    description: [
      gig.description,
      gig.category ? `Categoría: ${gig.category}` : null,
      gig.deliveryTime ? `Entrega: ${gig.deliveryTime}` : null,
      gig.rating ? `Rating: ${gig.rating} (${gig.reviewCount} reviews)` : null,
    ].filter(Boolean).join(' | ') || null,
    sector: searchQuery,
    service_type: detectServiceType(fullText),
    budget_min: basePrice,
    budget_max: basePrice ? basePrice * 3 : null, // Estimación (Fiverr no expone precios premium en búsqueda)
    language: 'en',
    post_date: null, // No disponible en búsqueda
    zone: 'online',
    lead_type: 'online',
  };
}

/**
 * Parsea precio de Fiverr (puede venir como número, string, o objeto)
 */
function parsePrice(price) {
  if (!price) return null;
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const num = parseFloat(price.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  }
  // Podría ser un objeto { amount, currency }
  if (typeof price === 'object' && price.amount) {
    return parseFloat(price.amount) || null;
  }
  return null;
}

/**
 * Escanea todas las categorías configuradas
 */
export async function scanAllFiverr() {
  log.info('=== Iniciando escaneo de Fiverr ===');
  const allGigs = [];

  for (const query of FIVERR_SEARCHES) {
    try {
      const gigs = await scanFiverrCategory(query);
      allGigs.push(...gigs);
      // Delay entre categorías
      await delay(DEFAULT_DELAY_MS);
    } catch (err) {
      log.error(`Error escaneando categoría "${query}": ${err.message}`);
    }
  }

  // Deduplicar por source_id antes de guardar
  const seen = new Set();
  const uniqueGigs = allGigs.filter(gig => {
    if (!gig.source_id || seen.has(gig.source_id)) return false;
    seen.add(gig.source_id);
    return true;
  });

  log.info(`Total gigs (sin dedup): ${allGigs.length}, únicos: ${uniqueGigs.length}`);

  // Guardar en BD
  const saved = await saveFiverrResults(uniqueGigs);
  log.info(`=== Fiverr completado: ${uniqueGigs.length} gigs, ${saved.new} nuevos ===`);

  // Registrar escaneo
  insertScan('fiverr', 'all', uniqueGigs.length, saved.new, 'online', 'fiverr');

  return { total: uniqueGigs.length, new: saved.new };
}

/**
 * Guarda resultados de Fiverr en BD como leads online
 */
export async function saveFiverrResults(gigs) {
  let newCount = 0;

  for (const gig of gigs) {
    try {
      const result = insertOnlineLead({
        name: gig.name,
        source: gig.source,
        source_url: gig.source_url,
        source_id: gig.source_id,
        source_author: gig.source_author,
        email: null, // Fiverr no expone emails
        description: gig.description,
        budget_min: gig.budget_min,
        budget_max: gig.budget_max,
        service_type: gig.service_type,
        urgency: 'low', // No se puede determinar desde búsqueda
        language: gig.language,
        post_date: gig.post_date,
        sector: gig.sector,
        zone: gig.zone,
      });
      if (result.changes > 0) newCount++;
    } catch (err) {
      if (!err.message?.includes('UNIQUE constraint')) {
        log.warn(`  Error guardando gig: ${err.message}`);
      }
    }
  }

  return { new: newCount };
}

// Ejecutar directamente para pruebas
if (process.argv[1] && process.argv[1].includes('fiverr.js')) {
  console.log('\nIniciando escaneo de Fiverr...\n');
  const result = await scanAllFiverr();
  console.log(`\nResultado: ${result.total} gigs encontrados, ${result.new} nuevos`);
  process.exit(0);
}
