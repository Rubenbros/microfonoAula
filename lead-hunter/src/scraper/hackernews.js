import { insertFreelanceOpportunity, insertScan } from '../db/database.js';
import { createLogger } from '../logger.js';

const log = createLogger('hackernews');

const HN_API = 'https://hacker-news.firebaseio.com/v0';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Busca el thread más reciente de "Who is hiring?" via Algolia
 */
async function findWhoIsHiringThread() {
  const url = 'https://hn.algolia.com/api/v1/search?query=%22Who%20is%20hiring%22&tags=story&hitsPerPage=5';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'lead-hunter-bot/1.0' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const threads = (data.hits || [])
      .filter(h => h.title && /who is hiring/i.test(h.title) && /ask hn/i.test(h.title))
      .sort((a, b) => b.created_at_i - a.created_at_i);

    return threads[0] || null;
  } catch (err) {
    log.error(`Error buscando thread Who is hiring: ${err.message}`);
    return null;
  }
}

/**
 * Obtiene comentarios de un thread de HN
 */
async function getThreadComments(storyId, maxComments = 200) {
  const url = `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=${maxComments}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'lead-hunter-bot/1.0' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.hits || [];
  } catch (err) {
    log.error(`Error obteniendo comentarios: ${err.message}`);
    return [];
  }
}

/**
 * Detecta si un comentario busca freelancers/contractors
 */
function isRelevantComment(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  // Busca posts que ofrecen trabajo (no buscan trabajo)
  const hiringSignals = [
    'looking for', 'hiring', 'seeking', 'need a developer', 'need a freelance',
    'contractor', 'freelancer', 'consultant', 'part-time', 'remote',
    'react', 'node', 'full stack', 'full-stack', 'frontend', 'backend',
    'ai', 'automation', 'python', 'javascript', 'typescript',
  ];

  const matchCount = hiringSignals.filter(s => t.includes(s)).length;
  return matchCount >= 2;
}

/**
 * Parsea un comentario de HN como oportunidad
 */
function parseHnComment(comment, threadTitle) {
  const text = comment.comment_text || '';
  const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();

  // Extraer título (primera línea o primeros 100 chars)
  const firstLine = cleanText.split(/[.\n]/)[0]?.slice(0, 200) || 'HN Hiring Post';

  // Detectar skills
  const skills = [];
  const skillMap = {
    'react': 'react', 'nextjs': 'nextjs', 'next.js': 'nextjs',
    'node': 'nodejs', 'nodejs': 'nodejs', 'python': 'python',
    'typescript': 'typescript', 'javascript': 'javascript',
    'ai ': 'ai', 'machine learning': 'ml', 'openai': 'ai',
    'automation': 'automation', 'full stack': 'fullstack', 'full-stack': 'fullstack',
    'frontend': 'frontend', 'backend': 'backend',
    'aws': 'aws', 'docker': 'docker', 'kubernetes': 'kubernetes',
    'postgresql': 'postgresql', 'mongodb': 'mongodb',
  };

  const t = cleanText.toLowerCase();
  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (t.includes(keyword) && !skills.includes(skill)) skills.push(skill);
  }

  // Detectar remote
  const isRemote = /\bremote\b/i.test(cleanText);

  // Detectar categoría
  let category = 'web';
  if (/\b(ai|ml|machine learning|llm|gpt)\b/i.test(cleanText)) category = 'ai';
  else if (/\b(automat|scraping|bot)\b/i.test(cleanText)) category = 'automation';
  else if (/\b(mobile|ios|android|flutter|react native)\b/i.test(cleanText)) category = 'mobile';
  else if (/\b(fullstack|full.stack|saas)\b/i.test(cleanText)) category = 'fullstack';

  return {
    platform: 'hackernews',
    title: firstLine,
    description: cleanText.slice(0, 3000),
    url: `https://news.ycombinator.com/item?id=${comment.objectID}`,
    author: comment.author || null,
    author_url: comment.author ? `https://news.ycombinator.com/user?id=${comment.author}` : null,
    budget_min: null,
    budget_max: null,
    budget_type: null,
    currency: 'USD',
    skills_required: skills,
    category,
    country: null,
    language: 'en',
    urgency: 'low',
    posted_at: comment.created_at || null,
    proposals_count: null,
    client_rating: null,
    client_spent: null,
  };
}

/**
 * Escanea el thread "Who is hiring?" más reciente
 */
export async function scanHackerNews() {
  log.info('=== Iniciando escaneo de Hacker News ===');

  // Buscar thread
  const thread = await findWhoIsHiringThread();
  if (!thread) {
    log.warn('No se encontró thread "Who is hiring?"');
    return { total: 0, new: 0 };
  }

  log.info(`Thread encontrado: "${thread.title}" (${thread.objectID})`);

  // Obtener comentarios
  await delay(1000);
  const comments = await getThreadComments(thread.objectID, 300);
  log.info(`  ${comments.length} comentarios obtenidos`);

  // Filtrar relevantes
  const relevant = comments.filter(c => isRelevantComment(c.comment_text));
  log.info(`  ${relevant.length} comentarios relevantes`);

  // Parsear y guardar
  const opportunities = relevant.map(c => parseHnComment(c, thread.title));

  let newCount = 0;
  for (const opp of opportunities) {
    try {
      const result = insertFreelanceOpportunity(opp);
      if (result.changes > 0) newCount++;
    } catch {
      // Duplicado
    }
  }

  log.info(`=== HackerNews completado: ${opportunities.length} oportunidades, ${newCount} nuevas ===`);
  insertScan('hackernews', 'freelance', opportunities.length, newCount, 'freelance', 'hackernews');

  return { total: opportunities.length, new: newCount };
}

// Ejecutar directamente
if (process.argv[1] && process.argv[1].includes('hackernews.js')) {
  console.log('\nIniciando escaneo de HackerNews...\n');
  const result = await scanHackerNews();
  console.log(`\nResultado: ${result.total} oportunidades, ${result.new} nuevas`);
  process.exit(0);
}
