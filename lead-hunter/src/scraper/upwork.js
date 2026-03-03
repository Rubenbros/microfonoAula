import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('upwork');

// Cargar configuración
let UPWORK_CONFIG;
try {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
  UPWORK_CONFIG = config.platforms.upwork;
} catch {
  UPWORK_CONFIG = { enabled: false, keywords: [] };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Parsea un item RSS de Upwork y extrae datos estructurados
 */
function parseUpworkRssItem(item) {
  const title = item.title || '';
  const description = item.description || '';
  const link = item.link || '';
  const pubDate = item.pubDate || '';

  // Extraer budget del texto
  const budget = extractUpworkBudget(description);

  // Extraer skills
  const skills = extractSkills(description);

  // Extraer categoría
  const category = detectCategory(title + ' ' + description);

  // Extraer país del cliente
  const country = extractCountry(description);

  return {
    platform: 'upwork',
    title: title.slice(0, 300),
    description: cleanHtml(description).slice(0, 3000),
    url: link,
    author: null,
    author_url: null,
    budget_min: budget.min,
    budget_max: budget.max,
    budget_type: budget.type,
    currency: 'USD',
    skills_required: skills,
    category,
    country,
    language: 'en',
    urgency: detectUrgency(description),
    posted_at: pubDate ? new Date(pubDate).toISOString() : null,
    proposals_count: extractProposalsCount(description),
    client_rating: null,
    client_spent: null,
  };
}

/**
 * Limpia HTML de la descripción RSS
 */
function cleanHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae budget de la descripción de Upwork
 */
function extractUpworkBudget(text) {
  const clean = cleanHtml(text);

  // Hourly: $X-$Y/hr
  const hourlyMatch = clean.match(/\$(\d+(?:\.\d+)?)\s*[-–]\s*\$(\d+(?:\.\d+)?)\s*\/?\s*(?:hr|hour)/i);
  if (hourlyMatch) {
    return { min: parseFloat(hourlyMatch[1]), max: parseFloat(hourlyMatch[2]), type: 'hourly' };
  }

  // Fixed-price budget range
  const fixedRange = clean.match(/Budget\s*:\s*\$(\d[\d,]*)\s*[-–]\s*\$(\d[\d,]*)/i);
  if (fixedRange) {
    return { min: parseFloat(fixedRange[1].replace(/,/g, '')), max: parseFloat(fixedRange[2].replace(/,/g, '')), type: 'fixed' };
  }

  // Fixed-price single value
  const fixedSingle = clean.match(/Budget\s*:\s*\$(\d[\d,]*)/i);
  if (fixedSingle) {
    const val = parseFloat(fixedSingle[1].replace(/,/g, ''));
    return { min: val, max: val, type: 'fixed' };
  }

  // Generic dollar amounts
  const dollarMatch = clean.match(/\$(\d[\d,]+)/);
  if (dollarMatch) {
    const val = parseFloat(dollarMatch[1].replace(/,/g, ''));
    if (val >= 50 && val <= 500000) {
      return { min: val, max: val, type: 'fixed' };
    }
  }

  return { min: null, max: null, type: null };
}

/**
 * Extrae skills de la descripción
 */
function extractSkills(text) {
  const clean = cleanHtml(text).toLowerCase();
  const allSkills = [
    'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
    'node', 'nodejs', 'node.js', 'express', 'nestjs',
    'python', 'django', 'fastapi', 'flask',
    'typescript', 'javascript',
    'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes',
    'tailwind', 'css', 'html', 'figma',
    'ai', 'machine learning', 'openai', 'chatgpt', 'llm', 'langchain',
    'automation', 'scraping', 'web scraping', 'selenium', 'playwright',
    'shopify', 'wordpress', 'woocommerce',
    'stripe', 'payment', 'api', 'rest', 'graphql',
    'mobile', 'react native', 'flutter', 'ios', 'android',
  ];

  return allSkills.filter(skill => clean.includes(skill));
}

/**
 * Detecta categoría del proyecto
 */
function detectCategory(text) {
  const t = text.toLowerCase();
  if (/\b(ai|artificial intelligence|machine learning|llm|chatgpt|openai|langchain|gpt)\b/.test(t)) return 'ai';
  if (/\b(automat|scraping|web scraping|bot|selenium|playwright)\b/.test(t)) return 'automation';
  if (/\b(mobile|react native|flutter|ios|android|app)\b/.test(t)) return 'mobile';
  if (/\b(shopify|woocommerce|ecommerce|e-commerce|store)\b/.test(t)) return 'ecommerce';
  if (/\b(wordpress|cms|blog)\b/.test(t)) return 'cms';
  if (/\b(api|backend|server|database|microservice)\b/.test(t)) return 'backend';
  if (/\b(frontend|ui|ux|design|figma|landing)\b/.test(t)) return 'frontend';
  if (/\b(fullstack|full stack|full-stack|saas)\b/.test(t)) return 'fullstack';
  if (/\b(consult|architect|review|audit|mentor|cto|tech lead)\b/.test(t)) return 'consulting';
  return 'web';
}

/**
 * Detecta urgencia
 */
function detectUrgency(text) {
  const t = cleanHtml(text).toLowerCase();
  if (/\b(asap|urgent|immediately|right away|rush|today|tonight)\b/.test(t)) return 'high';
  if (/\b(soon|this week|next week|quickly|fast)\b/.test(t)) return 'medium';
  return 'low';
}

/**
 * Extrae país del cliente
 */
function extractCountry(text) {
  const clean = cleanHtml(text);
  const countryMatch = clean.match(/Country\s*:\s*([A-Za-z\s]+?)(?:\s*[|<]|\s{2})/i);
  if (countryMatch) return countryMatch[1].trim();
  return null;
}

/**
 * Extrae número de propuestas
 */
function extractProposalsCount(text) {
  const clean = cleanHtml(text);
  const match = clean.match(/(\d+)\s*(?:to\s*\d+\s*)?proposals?/i);
  if (match) return parseInt(match[1]);
  return null;
}

/**
 * Parsea RSS XML básico (sin dependencias XML)
 */
function parseRssXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getValue = (tag) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    };

    items.push({
      title: getValue('title'),
      link: getValue('link'),
      description: getValue('description'),
      pubDate: getValue('pubDate'),
    });
  }

  return items;
}

/**
 * Escanea Upwork por una keyword vía RSS público
 */
export async function scanUpworkKeyword(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://www.upwork.com/ab/feed/jobs/rss?q=${encodedKeyword}&sort=recency`;

  log.info(`  Buscando: "${keyword}"`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (response.status === 429) {
      log.warn(`  Rate limit para "${keyword}", esperando 30s...`);
      await delay(30000);
      return [];
    }

    if (!response.ok) {
      log.error(`  Error HTTP ${response.status} para "${keyword}"`);
      return [];
    }

    const xml = await response.text();
    const items = parseRssXml(xml);

    log.info(`  "${keyword}": ${items.length} resultados`);
    return items.map(item => parseUpworkRssItem(item));
  } catch (err) {
    log.error(`  Error buscando "${keyword}": ${err.message}`);
    return [];
  }
}

/**
 * Escanea todas las keywords configuradas de Upwork
 */
export async function scanAllUpwork() {
  if (!UPWORK_CONFIG.enabled) {
    log.info('Upwork scraper desactivado');
    return { total: 0, new: 0 };
  }

  log.info('=== Iniciando escaneo de Upwork ===');
  const allOpps = [];
  const seen = new Set();

  for (const keyword of UPWORK_CONFIG.keywords) {
    const results = await scanUpworkKeyword(keyword);

    // Deduplicar por URL
    for (const opp of results) {
      if (!seen.has(opp.url)) {
        seen.add(opp.url);
        // Filtrar por budget mínimo si configurado
        if (UPWORK_CONFIG.min_budget && opp.budget_max && opp.budget_max < UPWORK_CONFIG.min_budget) continue;
        // Filtrar por máximo de propuestas
        if (UPWORK_CONFIG.max_proposals && opp.proposals_count && opp.proposals_count > UPWORK_CONFIG.max_proposals) continue;
        allOpps.push(opp);
      }
    }

    await delay(5000); // 5s entre keywords
  }

  // Guardar en BD
  const saved = await saveUpworkResults(allOpps);
  log.info(`=== Upwork completado: ${allOpps.length} oportunidades, ${saved.new} nuevas ===`);

  insertScan('upwork', 'freelance', allOpps.length, saved.new, 'freelance', 'upwork');
  return { total: allOpps.length, new: saved.new };
}

/**
 * Guarda resultados en la tabla freelance_opportunities
 */
export async function saveUpworkResults(opportunities) {
  let newCount = 0;

  for (const opp of opportunities) {
    try {
      const result = insertFreelanceOpportunity(opp);
      if (result.changes > 0) newCount++;
    } catch {
      // Duplicado (UNIQUE constraint), ignorar
    }
  }

  return { new: newCount };
}

// Ejecutar directamente para pruebas
if (process.argv[1] && process.argv[1].includes('upwork.js')) {
  console.log('\nIniciando escaneo de Upwork...\n');
  const result = await scanAllUpwork();
  console.log(`\nResultado: ${result.total} oportunidades, ${result.new} nuevas`);
  process.exit(0);
}
