import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('reddit-freelance');

// Cargar config de plataformas freelance
let REDDIT_CONFIG;
try {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
  REDDIT_CONFIG = config.platforms.reddit;
} catch {
  REDDIT_CONFIG = { enabled: false, subreddits: [] };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Escanea un subreddit de freelance y devuelve oportunidades
 */
async function scanFreelanceSubreddit(subreddit) {
  const hiringFlairs = {
    'forhire': '[Hiring]',
    'slavelabour': null, // No tiene flair específico
  };

  const filterTitle = hiringFlairs[subreddit] || null;
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;

  log.info(`  Escaneando r/${subreddit}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'lead-hunter-freelance/1.0 (by /u/t800labs)',
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      log.warn(`  Rate limit en r/${subreddit}, esperando 60s...`);
      await delay(60000);
      return [];
    }

    if (!response.ok) {
      log.error(`  Error HTTP ${response.status} en r/${subreddit}`);
      return [];
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    // Filtrar posts de las últimas 72h que buscan desarrollador
    const maxAge = 72 * 3600;
    const now = Date.now() / 1000;

    const filtered = posts
      .map(p => p.data)
      .filter(post => {
        if (now - post.created_utc > maxAge) return false;
        if (post.removed_by_category || post.selftext === '[removed]' || post.selftext === '[deleted]') return false;
        if (filterTitle && !post.title.includes(filterTitle)) return false;

        // Verificar que buscan desarrollador (no alguien ofreciendo servicios)
        const t = (post.title + ' ' + (post.selftext || '')).toLowerCase();
        const hiringSignals = ['hiring', 'looking for', 'need a', 'seeking', 'want to hire',
          'need developer', 'need someone', 'budget', 'pay', 'rate', '$'];
        return hiringSignals.some(s => t.includes(s));
      });

    log.info(`  r/${subreddit}: ${filtered.length} posts relevantes de ${posts.length}`);
    return filtered.map(post => parseRedditPost(post, subreddit));
  } catch (err) {
    log.error(`  Error en r/${subreddit}: ${err.message}`);
    return [];
  }
}

/**
 * Parsea un post de Reddit como oportunidad freelance
 */
function parseRedditPost(post, subreddit) {
  const fullText = `${post.title} ${post.selftext || ''}`;
  const t = fullText.toLowerCase();

  // Skills detection
  const skills = [];
  const skillPatterns = {
    'react': /\breact\b/, 'nextjs': /\bnext\.?js\b/, 'vue': /\bvue\b/,
    'nodejs': /\bnode\.?js?\b/, 'python': /\bpython\b/, 'typescript': /\btypescript\b/,
    'javascript': /\bjavascript\b/, 'ai': /\b(ai|artificial intelligence|chatgpt|openai|llm)\b/,
    'automation': /\b(automat|selenium|playwright|scraping)\b/,
    'wordpress': /\bwordpress\b/, 'shopify': /\bshopify\b/,
    'fullstack': /\b(fullstack|full.stack)\b/, 'mobile': /\b(mobile|ios|android|flutter)\b/,
    'api': /\bapi\b/, 'database': /\b(database|postgresql|mysql|mongodb)\b/,
  };

  for (const [skill, pattern] of Object.entries(skillPatterns)) {
    if (pattern.test(t)) skills.push(skill);
  }

  // Budget extraction
  const budget = extractBudget(fullText);

  // Category
  let category = 'web';
  if (/\b(ai|ml|llm|chatgpt|gpt|openai)\b/i.test(t)) category = 'ai';
  else if (/\b(automat|bot|scraping)\b/i.test(t)) category = 'automation';
  else if (/\b(mobile|ios|android|app)\b/i.test(t)) category = 'mobile';

  return {
    platform: 'reddit',
    title: post.title.slice(0, 300),
    description: (post.selftext || '').slice(0, 3000),
    url: `https://www.reddit.com${post.permalink}`,
    author: post.author,
    author_url: `https://www.reddit.com/u/${post.author}`,
    budget_min: budget.min,
    budget_max: budget.max,
    budget_type: budget.type,
    currency: 'USD',
    skills_required: skills,
    category,
    country: null,
    language: detectLanguage(t),
    urgency: detectUrgency(t),
    posted_at: new Date(post.created_utc * 1000).toISOString(),
    proposals_count: post.num_comments || 0,
    client_rating: null,
    client_spent: null,
  };
}

function extractBudget(text) {
  const patterns = [
    /\$\s*([\d,]+)\s*[-–to]+\s*\$?\s*([\d,]+)/i,
    /([\d,]+)\s*[-–to]+\s*([\d,]+)\s*(?:USD|EUR|€|\$)/i,
    /budget[:\s]+\$?\s*([\d,]+)/i,
    /\$\s*([\d,]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val1 = parseInt(match[1].replace(/,/g, ''));
      const val2 = match[2] ? parseInt(match[2].replace(/,/g, '')) : null;
      if (val1 > 10 && val1 < 500000) {
        return { min: val1, max: val2 && val2 > val1 ? val2 : val1, type: 'fixed' };
      }
    }
  }

  // Hourly rates
  const hourlyMatch = text.match(/\$\s*(\d+)\s*(?:\/\s*(?:hr|hour|h)|\s*per\s*hour)/i);
  if (hourlyMatch) {
    const rate = parseInt(hourlyMatch[1]);
    if (rate >= 5 && rate <= 500) {
      return { min: rate, max: rate, type: 'hourly' };
    }
  }

  return { min: null, max: null, type: null };
}

function detectUrgency(text) {
  if (/\b(asap|urgent|immediately|rush|today|tonight|this week)\b/i.test(text)) return 'high';
  if (/\b(soon|quickly|next week)\b/i.test(text)) return 'medium';
  return 'low';
}

function detectLanguage(text) {
  const spanishWords = ['necesito', 'busco', 'quiero', 'presupuesto', 'página', 'empresa'];
  return spanishWords.filter(w => text.includes(w)).length >= 2 ? 'es' : 'en';
}

/**
 * Escanea todos los subreddits de freelance configurados
 */
export async function scanRedditFreelance() {
  if (!REDDIT_CONFIG.enabled) {
    log.info('Reddit freelance scraper desactivado');
    return { total: 0, new: 0 };
  }

  log.info('=== Iniciando escaneo Reddit Freelance ===');
  const allOpps = [];
  const seen = new Set();

  for (const subreddit of REDDIT_CONFIG.subreddits) {
    const results = await scanFreelanceSubreddit(subreddit);
    for (const opp of results) {
      if (!seen.has(opp.url)) {
        seen.add(opp.url);
        allOpps.push(opp);
      }
    }
    await delay(3000);
  }

  // Guardar en BD
  let newCount = 0;
  for (const opp of allOpps) {
    try {
      const result = insertFreelanceOpportunity(opp);
      if (result.changes > 0) newCount++;
    } catch {}
  }

  log.info(`=== Reddit Freelance completado: ${allOpps.length} oportunidades, ${newCount} nuevas ===`);
  insertScan('reddit-freelance', 'freelance', allOpps.length, newCount, 'freelance', 'reddit');

  return { total: allOpps.length, new: newCount };
}

if (process.argv[1] && process.argv[1].includes('reddit-freelance.js')) {
  const result = await scanRedditFreelance();
  console.log(`\nResultado: ${result.total} oportunidades, ${result.new} nuevas`);
  process.exit(0);
}
