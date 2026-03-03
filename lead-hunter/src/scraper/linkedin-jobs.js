import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('weworkremotely');

let LINKEDIN_CONFIG;
try {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
  LINKEDIN_CONFIG = config.platforms.linkedin;
} catch {
  LINKEDIN_CONFIG = { enabled: false, search_queries: [] };
}

// RSS feeds de We Work Remotely por categoría
const WWR_FEEDS = [
  { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', category: 'programming' },
  { url: 'https://weworkremotely.com/categories/remote-design-jobs.rss', category: 'design' },
  { url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss', category: 'devops' },
];

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Limpia HTML de la descripción
 */
function cleanHtml(text) {
  return (text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parsea RSS XML básico (sin dependencias)
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
      category: getValue('category'),
      region: getValue('region'),
    });
  }

  return items;
}

const SKILL_PATTERNS = {
  react: /\breact\b/i, nextjs: /\bnext\.?js\b/i, nodejs: /\bnode\.?js\b/i,
  typescript: /\btypescript\b/i, javascript: /\bjavascript\b/i, python: /\bpython\b/i,
  ai: /\b(?:ai|artificial intelligence|machine learning|ml)\b/i,
  automation: /\bautomation\b/i, 'full-stack': /\bfull[\s-]?stack\b/i,
  devops: /\bdevops\b/i, aws: /\baws\b/i, docker: /\bdocker\b/i,
  postgresql: /\bpostgres(?:ql)?\b/i, mongodb: /\bmongo(?:db)?\b/i,
  ruby: /\bruby\b/i, rails: /\brails\b/i, go: /\bgolang|\bgo\b/i,
  rust: /\brust\b/i, java: /\bjava\b(?!script)/i, php: /\bphp\b/i,
  vue: /\bvue\.?js?\b/i, angular: /\bangular\b/i,
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
  if (/\b(?:devops|cloud|infrastructure|sre|platform)\b/.test(t)) return 'devops';
  if (/\b(?:automation|scraping|bot)\b/.test(t)) return 'automation';
  if (/\b(?:cto|tech lead|architect|engineering manager)\b/.test(t)) return 'consulting';
  if (/\b(?:frontend|ui|ux|design)\b/.test(t)) return 'frontend';
  if (/\b(?:backend|api|server|database)\b/.test(t)) return 'backend';
  if (/\b(?:fullstack|full.stack)\b/.test(t)) return 'fullstack';
  return 'web';
}

/**
 * Filtra jobs por relevancia (coinciden con skills del perfil)
 * Requiere al menos 1 skill match Y que sea un rol de desarrollo
 */
function isRelevantJob(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Skills que encajan con nuestro perfil
  const devSkills = [
    'react', 'next.js', 'nextjs', 'node', 'nodejs', 'javascript', 'typescript',
    'python', 'ai', 'automation', 'chatbot', 'web scraping', 'saas',
    'tailwind', 'express', 'fastapi', 'django', 'postgresql', 'mongodb',
    'docker', 'aws', 'playwright', 'selenium',
  ];

  // Roles que encajan
  const devRoles = [
    'developer', 'engineer', 'full stack', 'full-stack', 'fullstack',
    'frontend', 'front-end', 'backend', 'back-end', 'tech lead',
    'web dev', 'programmer', 'cto',
  ];

  const hasSkill = devSkills.some(s => text.includes(s));
  const hasRole = devRoles.some(r => text.includes(r));

  // Necesita al menos un skill O un rol relevante
  return hasSkill || hasRole;
}

/**
 * Escanea We Work Remotely RSS feeds (reemplazo de LinkedIn Jobs via Google)
 */
export async function scanLinkedInJobs() {
  if (!LINKEDIN_CONFIG.enabled) {
    log.info('WeWorkRemotely scraper desactivado');
    return { total: 0, new: 0 };
  }

  log.info('=== Iniciando escaneo de We Work Remotely (reemplazo LinkedIn Jobs) ===');
  let totalFound = 0;
  let totalNew = 0;

  for (const feed of WWR_FEEDS) {
    try {
      log.info(`  Escaneando feed: ${feed.category}`);

      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        log.warn(`  Error HTTP ${response.status} en feed ${feed.category}`);
        continue;
      }

      const xml = await response.text();
      const items = parseRssXml(xml);
      log.info(`  ${feed.category}: ${items.length} jobs en RSS`);

      // Filtrar por relevancia
      const relevant = items.filter(item =>
        isRelevantJob(item.title, item.description)
      );
      log.info(`  ${feed.category}: ${relevant.length} relevantes de ${items.length}`);

      for (const item of relevant) {
        const cleanDesc = cleanHtml(item.description);
        const fullText = `${item.title} ${cleanDesc}`;
        const skills = extractSkills(fullText);
        const category = detectCategory(fullText);

        const opp = {
          platform: 'weworkremotely',
          title: cleanHtml(item.title).slice(0, 300),
          description: cleanDesc.slice(0, 3000),
          url: item.link,
          category,
          skills_required: skills,
          language: 'en',
          country: item.region || 'Remote',
          posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        };

        try {
          const result = insertFreelanceOpportunity(opp);
          if (result.changes > 0) totalNew++;
          totalFound++;
        } catch (err) {
          if (!err.message.includes('UNIQUE')) {
            log.error(`  Error insertando: ${err.message}`);
          }
          totalFound++; // Contar aunque sea duplicado
        }
      }

      // Rate limiting entre feeds
      await delay(2000);
    } catch (err) {
      log.error(`  Error en feed ${feed.category}: ${err.message}`);
    }
  }

  // Registrar scan
  try {
    insertScan('weworkremotely', 'freelance', totalFound, totalNew, 'freelance', 'weworkremotely');
  } catch {}

  log.info(`=== WeWorkRemotely completado: ${totalFound} encontradas, ${totalNew} nuevas ===`);
  return { total: totalFound, new: totalNew };
}
