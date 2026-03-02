import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertOnlineLead, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('reddit');

// Cargar configuración
const config = JSON.parse(
  readFileSync(join(__dirname, '../../config/online_sources.json'), 'utf-8')
);

const REDDIT_CONFIG = config.reddit;
const SERVICES = config.services_offered;

// Delay entre requests
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Escanea un subreddit via endpoint .json público
 */
export async function scanSubreddit(subreddit) {
  const { name, mode, query, filter_title } = subreddit;
  log.info(`Escaneando r/${name} (modo: ${mode})...`);

  let url;
  if (mode === 'search' && query) {
    url = `https://www.reddit.com/r/${name}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${REDDIT_CONFIG.max_posts_per_subreddit}`;
  } else {
    url = `https://www.reddit.com/r/${name}/new.json?limit=${REDDIT_CONFIG.max_posts_per_subreddit}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': REDDIT_CONFIG.user_agent,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      log.warn(`Rate limit en r/${name}, esperando 60s...`);
      await delay(60000);
      return [];
    }

    if (!response.ok) {
      log.error(`Error HTTP ${response.status} en r/${name}`);
      return [];
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    // Filtrar posts relevantes
    const maxAge = REDDIT_CONFIG.max_post_age_hours * 3600;
    const now = Date.now() / 1000;

    const filtered = posts
      .map(p => p.data)
      .filter(post => {
        // Filtrar por edad
        if (now - post.created_utc > maxAge) return false;
        // Filtrar por título si hay filtro (ej: [Hiring] en r/forhire)
        if (filter_title && !post.title.includes(filter_title)) return false;
        // Ignorar posts eliminados
        if (post.removed_by_category || post.selftext === '[removed]' || post.selftext === '[deleted]') return false;
        return true;
      });

    log.info(`  r/${name}: ${filtered.length} posts relevantes de ${posts.length} totales`);
    return filtered.map(post => parseRedditPost(post, name));

  } catch (err) {
    log.error(`Error escaneando r/${name}: ${err.message}`);
    return [];
  }
}

/**
 * Parsea un post de Reddit y extrae datos relevantes
 */
function parseRedditPost(post, subreddit) {
  const fullText = `${post.title} ${post.selftext || ''}`.toLowerCase();

  return {
    name: post.title.slice(0, 200),
    source: 'reddit',
    source_url: `https://www.reddit.com${post.permalink}`,
    source_id: post.id,
    source_author: post.author,
    description: (post.selftext || '').slice(0, 2000),
    sector: `r/${subreddit}`,
    service_type: detectServiceType(fullText),
    budget_min: extractBudget(fullText).min,
    budget_max: extractBudget(fullText).max,
    urgency: detectUrgency(fullText),
    language: detectLanguage(fullText),
    post_date: new Date(post.created_utc * 1000).toISOString(),
    zone: 'online',
    // Metadatos extra para scoring
    score_reddit: post.score || 0,
    num_comments: post.num_comments || 0,
  };
}

/**
 * Detecta qué tipo de servicio piden analizando el texto
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
 * Extrae presupuesto mencionado con regex
 * Detecta: $500, 500 USD, 500€, budget: 500, presupuesto 500
 */
function extractBudget(text) {
  const patterns = [
    // Rango: $500-$1000, 500-1000 USD
    /\$\s*([\d,]+)\s*[-–to]+\s*\$?\s*([\d,]+)/i,
    /([\d,]+)\s*[-–to]+\s*([\d,]+)\s*(?:USD|EUR|€|\$|dollars|euros)/i,
    // Budget/presupuesto: 500
    /budget[:\s]+\$?\s*([\d,]+)/i,
    /presupuesto[:\s]+€?\s*([\d,]+)/i,
    // Solo cantidad: $500, 500€, 500 USD
    /\$\s*([\d,]+)/,
    /([\d,]+)\s*(?:USD|EUR|€|dollars|euros)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val1 = parseInt(match[1].replace(/,/g, ''));
      const val2 = match[2] ? parseInt(match[2].replace(/,/g, '')) : null;

      if (val1 > 10 && val1 < 1000000) { // Filtrar valores absurdos
        return {
          min: val1,
          max: val2 && val2 > val1 ? val2 : val1,
        };
      }
    }
  }

  return { min: null, max: null };
}

/**
 * Detecta urgencia del post
 */
function detectUrgency(text) {
  const highUrgency = ['asap', 'urgent', 'urgente', 'immediately', 'right away', 'this week', 'esta semana', 'deadline', 'rush', 'today', 'tomorrow'];
  const mediumUrgency = ['soon', 'pronto', 'next week', 'próxima semana', 'this month', 'este mes'];

  if (highUrgency.some(kw => text.includes(kw))) return 'high';
  if (mediumUrgency.some(kw => text.includes(kw))) return 'medium';
  return 'low';
}

/**
 * Detecta idioma del post (básico)
 */
function detectLanguage(text) {
  const spanishWords = ['necesito', 'busco', 'hola', 'quiero', 'para', 'negocio', 'empresa', 'presupuesto', 'página', 'también'];
  const spanishCount = spanishWords.filter(w => text.includes(w)).length;
  return spanishCount >= 2 ? 'es' : 'en';
}

/**
 * Escanea todos los subreddits configurados
 */
export async function scanAllReddit() {
  if (!REDDIT_CONFIG.enabled) {
    log.info('Reddit scraper desactivado en config');
    return { total: 0, new: 0 };
  }

  log.info('=== Iniciando escaneo de Reddit ===');
  const allPosts = [];

  for (const subreddit of REDDIT_CONFIG.subreddits) {
    const posts = await scanSubreddit(subreddit);
    allPosts.push(...posts);
    await delay(REDDIT_CONFIG.delay_between_requests_ms);
  }

  // Guardar en BD
  const saved = await saveRedditResults(allPosts);
  log.info(`=== Reddit completado: ${allPosts.length} posts, ${saved.new} nuevos ===`);

  // Registrar escaneo
  insertScan('reddit', 'all', allPosts.length, saved.new, 'online', 'reddit');

  return { total: allPosts.length, new: saved.new };
}

/**
 * Guarda resultados de Reddit en BD como leads online
 */
export async function saveRedditResults(posts) {
  let newCount = 0;

  for (const post of posts) {
    try {
      const result = insertOnlineLead({
        name: post.name,
        source: post.source,
        source_url: post.source_url,
        source_id: post.source_id,
        source_author: post.source_author,
        email: null, // Reddit no da emails directamente
        description: post.description,
        budget_min: post.budget_min,
        budget_max: post.budget_max,
        service_type: post.service_type,
        urgency: post.urgency,
        language: post.language,
        post_date: post.post_date,
        sector: post.sector,
        zone: post.zone,
      });
      if (result.changes > 0) newCount++;
    } catch (err) {
      // Duplicado (source_id ya existe), ignorar
    }
  }

  return { new: newCount };
}

// Ejecutar directamente para pruebas
if (process.argv[1] && process.argv[1].includes('reddit.js')) {
  console.log('\nIniciando escaneo de Reddit...\n');
  const result = await scanAllReddit();
  console.log(`\nResultado: ${result.total} posts encontrados, ${result.new} nuevos`);
  process.exit(0);
}
