import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('linkedin-jobs');

let LINKEDIN_CONFIG;
try {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
  LINKEDIN_CONFIG = config.platforms.linkedin;
} catch {
  LINKEDIN_CONFIG = { enabled: false, search_queries: [] };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Busca oportunidades freelance en LinkedIn via Google Search (sin API)
 * Usa Google search con site:linkedin.com para encontrar posts de hiring
 */
async function searchGoogleForLinkedIn(query) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=15&tbs=qdr:w`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      log.warn(`Google search error: ${res.status}`);
      return [];
    }

    const html = await res.text();
    return parseGoogleResults(html, query);
  } catch (err) {
    log.error(`Error buscando en Google: ${err.message}`);
    return [];
  }
}

/**
 * Extrae resultados de la página de Google
 */
function parseGoogleResults(html, query) {
  const results = [];

  // Buscar bloques de resultados con URLs de LinkedIn
  const urlPattern = /https?:\/\/(?:www\.)?linkedin\.com\/(?:jobs\/view|posts|feed\/update|pulse)\/[^\s"<>]+/g;
  const titlePattern = /<h3[^>]*>(.*?)<\/h3>/gs;

  const urls = [...new Set(html.match(urlPattern) || [])];
  const titles = [];
  let match;
  while ((match = titlePattern.exec(html)) !== null) {
    titles.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  for (let i = 0; i < urls.length && i < 15; i++) {
    const url = urls[i];
    const title = titles[i] || `LinkedIn opportunity: ${query}`;

    // Extraer skills del título y query
    const skills = extractSkills(title + ' ' + query);
    const category = detectCategory(title + ' ' + query);

    results.push({
      platform: 'linkedin',
      title: cleanHtml(title).slice(0, 200),
      description: `Found via Google search: "${query}"`,
      url,
      category,
      skills_required: skills,
      language: query.toLowerCase().includes('español') || query.toLowerCase().includes('spain') ? 'es' : 'en',
      posted_at: new Date().toISOString(),
    });
  }

  return results;
}

function cleanHtml(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

const SKILL_PATTERNS = {
  react: /\breact\b/i, nextjs: /\bnext\.?js\b/i, nodejs: /\bnode\.?js\b/i,
  typescript: /\btypescript\b/i, javascript: /\bjavascript\b/i, python: /\bpython\b/i,
  ai: /\b(?:ai|artificial intelligence|machine learning|ml)\b/i,
  automation: /\bautomation\b/i, 'full-stack': /\bfull[\s-]?stack\b/i,
  devops: /\bdevops\b/i, aws: /\baws\b/i, docker: /\bdocker\b/i,
  postgresql: /\bpostgres(?:ql)?\b/i, mongodb: /\bmongo(?:db)?\b/i,
};

function extractSkills(text) {
  return Object.entries(SKILL_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([skill]) => skill);
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/\b(?:ai|machine learning|ml|llm|gpt|chatbot)\b/.test(t)) return 'ai';
  if (/\b(?:mobile|ios|android|react native|flutter)\b/.test(t)) return 'mobile';
  if (/\b(?:devops|cloud|infrastructure|sre)\b/.test(t)) return 'devops';
  if (/\b(?:automation|scraping|bot)\b/.test(t)) return 'automation';
  if (/\b(?:cto|tech lead|architect)\b/.test(t)) return 'consulting';
  return 'web';
}

/**
 * Scan principal: busca en todas las queries configuradas
 */
export async function scanLinkedInJobs() {
  if (!LINKEDIN_CONFIG.enabled) {
    log.info('LinkedIn Jobs scraper desactivado');
    return { total: 0, new: 0 };
  }

  log.info('Iniciando scan LinkedIn Jobs via Google...');
  let totalFound = 0;
  let totalNew = 0;

  const queries = LINKEDIN_CONFIG.search_queries || [];

  for (const query of queries) {
    const fullQuery = `site:linkedin.com ${query}`;
    log.info(`Buscando: ${fullQuery}`);

    const results = await searchGoogleForLinkedIn(fullQuery);
    totalFound += results.length;

    for (const opp of results) {
      try {
        const result = insertFreelanceOpportunity(opp);
        if (result.changes > 0) totalNew++;
      } catch (err) {
        // UNIQUE constraint = ya existe
        if (!err.message.includes('UNIQUE')) {
          log.error(`Error insertando oportunidad LinkedIn: ${err.message}`);
        }
      }
    }

    // Rate limiting entre queries
    await delay(8000);
  }

  // Registrar scan
  try {
    insertScan({
      zone: 'global',
      sector: 'linkedin-jobs',
      type: 'linkedin-jobs',
      source: 'linkedin',
      results_count: totalFound,
      new_leads: totalNew,
    });
  } catch {}

  log.info(`LinkedIn Jobs scan completado: ${totalFound} encontradas, ${totalNew} nuevas`);
  return { total: totalFound, new: totalNew };
}
