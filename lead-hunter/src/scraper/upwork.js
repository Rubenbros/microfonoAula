import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('remoteok');

// Cargar configuración (reusa keywords de upwork config)
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
 * Limpia HTML de la descripción
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
 * Extrae skills de tags y descripción
 */
function extractSkills(tags, description) {
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

  const text = [...(tags || []), cleanHtml(description || '')].join(' ').toLowerCase();
  return allSkills.filter(skill => text.includes(skill));
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
  if (/\b(devops|cloud|infrastructure|sre|ci\/cd)\b/.test(t)) return 'devops';
  return 'web';
}

/**
 * Detecta urgencia
 */
function detectUrgency(text) {
  const t = (text || '').toLowerCase();
  if (/\b(asap|urgent|immediately|right away|rush|today|tonight)\b/.test(t)) return 'high';
  if (/\b(soon|this week|next week|quickly|fast)\b/.test(t)) return 'medium';
  return 'low';
}

// Tags relevantes para nuestro perfil (derivados de las keywords del config)
const RELEVANT_TAGS = [
  'react', 'nextjs', 'next.js', 'nodejs', 'node.js', 'node',
  'javascript', 'typescript', 'python', 'django', 'fastapi',
  'full stack', 'fullstack', 'full-stack', 'frontend', 'front end', 'front-end',
  'backend', 'back end', 'back-end',
  'ai', 'machine learning', 'ml', 'llm', 'chatbot', 'openai',
  'automation', 'scraping', 'web scraping',
  'saas', 'startup',
  'software engineer', 'developer', 'dev',
  'devops', 'docker', 'aws', 'cloud',
  'api', 'graphql', 'rest',
  'tech lead', 'engineering manager',
];

/**
 * Filtra jobs de RemoteOK que son relevantes para nuestro perfil
 * Matching amplio: cualquier tag o palabra del título que coincida
 */
function matchesKeywords(job) {
  const text = [
    job.position || '',
    ...(job.tags || []),
    job.company || '',
    job.description ? cleanHtml(job.description).slice(0, 500) : '',
  ].join(' ').toLowerCase();

  return RELEVANT_TAGS.some(tag => text.includes(tag));
}

/**
 * Parsea un job de RemoteOK al formato freelance_opportunities
 */
function parseRemoteOkJob(job) {
  const description = cleanHtml(job.description || '');
  const skills = extractSkills(job.tags, description);
  const fullText = `${job.position || ''} ${description} ${(job.tags || []).join(' ')}`;
  const category = detectCategory(fullText);

  return {
    platform: 'remoteok',
    title: (job.position || 'Remote Job').slice(0, 300),
    description: description.slice(0, 3000),
    url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
    author: job.company || null,
    author_url: null,
    budget_min: job.salary_min > 0 ? job.salary_min : null,
    budget_max: job.salary_max > 0 ? job.salary_max : null,
    budget_type: (job.salary_min > 0 || job.salary_max > 0) ? 'yearly' : null,
    currency: 'USD',
    skills_required: skills,
    category,
    country: job.location || null,
    language: 'en',
    urgency: detectUrgency(description),
    posted_at: job.date || null,
    proposals_count: null,
    client_rating: null,
    client_spent: null,
  };
}

/**
 * Escanea RemoteOK API (reemplazo de Upwork RSS que fue eliminado)
 * RemoteOK tiene una API JSON pública y gratuita
 */
export async function scanAllUpwork() {
  if (!UPWORK_CONFIG.enabled) {
    log.info('RemoteOK scraper desactivado');
    return { total: 0, new: 0 };
  }

  log.info('=== Iniciando escaneo de RemoteOK (reemplazo Upwork) ===');

  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      log.error(`Error HTTP ${response.status} en RemoteOK API`);
      return { total: 0, new: 0 };
    }

    const data = await response.json();
    // Primer elemento es aviso legal, el resto son jobs
    const jobs = data.slice(1);
    log.info(`  RemoteOK API: ${jobs.length} jobs totales`);

    // Filtrar jobs relevantes para nuestro perfil
    const matched = jobs.filter(job => matchesKeywords(job));
    log.info(`  Coinciden con keywords: ${matched.length} de ${jobs.length}`);

    // Parsear y deduplicar
    const seen = new Set();
    const parsed = [];
    for (const job of matched) {
      const opp = parseRemoteOkJob(job);
      if (!seen.has(opp.url)) {
        seen.add(opp.url);
        parsed.push(opp);
      }
    }

    // Guardar en BD
    const saved = await saveUpworkResults(parsed);
    log.info(`=== RemoteOK completado: ${parsed.length} oportunidades, ${saved.new} nuevas ===`);

    insertScan('remoteok', 'freelance', parsed.length, saved.new, 'freelance', 'remoteok');
    return { total: parsed.length, new: saved.new };
  } catch (err) {
    log.error(`Error en RemoteOK API: ${err.message}`);
    return { total: 0, new: 0 };
  }
}

// Alias para compatibilidad con imports existentes
export { scanAllUpwork as scanAllRemoteOK };

/**
 * Escanea una keyword específica (ya no usado, pero mantener export por compatibilidad)
 */
export async function scanUpworkKeyword(keyword) {
  log.info(`  Nota: scanUpworkKeyword ya no se usa, RemoteOK devuelve todos los jobs a la vez`);
  return [];
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
  console.log('\nIniciando escaneo de RemoteOK...\n');
  const result = await scanAllUpwork();
  console.log(`\nResultado: ${result.total} oportunidades, ${result.new} nuevas`);
  process.exit(0);
}
