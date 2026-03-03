import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, getFreelanceProfile, updateFreelanceOpportunity } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('freelance-scorer');

// Cargar configuración
let CONFIG;
try {
  CONFIG = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
} catch {
  CONFIG = { scoring: { weights: {}, thresholds: { hot: 70, warm: 40 } }, profile: { skills: [], core_skills: [] } };
}

const WEIGHTS = CONFIG.scoring.weights;
const THRESHOLDS = CONFIG.scoring.thresholds;

/**
 * Calcula match score de una oportunidad contra el perfil del freelancer
 */
export function calculateMatchScore(opportunity, profile = null) {
  let score = 0;
  const reasons = [];

  // Usar perfil de BD o de config
  const p = profile || CONFIG.profile;
  const mySkills = (p.skills || []).map(s => s.toLowerCase());
  const coreSkills = (p.core_skills || []).map(s => s.toLowerCase());

  // === BUDGET ===
  const budget = opportunity.budget_max || opportunity.budget_min || 0;
  if (budget >= 3000) {
    score += WEIGHTS.budget_high || 20;
    reasons.push(`Budget alto: $${budget} (+${WEIGHTS.budget_high || 20})`);
  } else if (budget >= 1000) {
    score += WEIGHTS.budget_medium || 12;
    reasons.push(`Budget medio: $${budget} (+${WEIGHTS.budget_medium || 12})`);
  } else if (budget > 0) {
    score += WEIGHTS.budget_exists || 5;
    reasons.push(`Budget mencionado: $${budget} (+${WEIGHTS.budget_exists || 5})`);
  }

  // === SKILLS MATCH ===
  let oppSkills = [];
  if (opportunity.skills_required) {
    try {
      oppSkills = typeof opportunity.skills_required === 'string'
        ? JSON.parse(opportunity.skills_required)
        : opportunity.skills_required;
    } catch { oppSkills = []; }
  }

  // También extraer skills del título y descripción
  if (oppSkills.length === 0 && opportunity.description) {
    const text = (opportunity.title + ' ' + opportunity.description).toLowerCase();
    for (const skill of mySkills) {
      if (text.includes(skill)) oppSkills.push(skill);
    }
  }

  if (oppSkills.length > 0) {
    const matchedSkills = oppSkills.filter(s => mySkills.includes(s.toLowerCase()));
    const matchedCore = oppSkills.filter(s => coreSkills.includes(s.toLowerCase()));
    const matchPct = matchedSkills.length / oppSkills.length;

    if (matchPct >= 0.8 || matchedCore.length >= 2) {
      score += WEIGHTS.skills_high_match || 20;
      reasons.push(`Skills match alto: ${matchedSkills.join(', ')} (+${WEIGHTS.skills_high_match || 20})`);
    } else if (matchPct >= 0.5 || matchedCore.length >= 1) {
      score += WEIGHTS.skills_medium_match || 12;
      reasons.push(`Skills match medio: ${matchedSkills.join(', ')} (+${WEIGHTS.skills_medium_match || 12})`);
    } else if (matchedSkills.length > 0) {
      score += WEIGHTS.skills_low_match || 3;
      reasons.push(`Skills match bajo: ${matchedSkills.join(', ')} (+${WEIGHTS.skills_low_match || 3})`);
    }
  }

  // === CLIENT QUALITY ===
  if (opportunity.client_rating && opportunity.client_rating >= 4.0) {
    score += WEIGHTS.client_good_rating || 10;
    reasons.push(`Buen rating de cliente: ${opportunity.client_rating}★ (+${WEIGHTS.client_good_rating || 10})`);
  }

  if (opportunity.client_spent && opportunity.client_spent >= 1000) {
    score += WEIGHTS.client_history || 8;
    reasons.push(`Cliente con historial: $${opportunity.client_spent} gastados (+${WEIGHTS.client_history || 8})`);
  }

  // === COMPETITION (pocas propuestas = mejor) ===
  if (opportunity.proposals_count !== null && opportunity.proposals_count < 10) {
    score += WEIGHTS.few_proposals || 10;
    reasons.push(`Poca competencia: ${opportunity.proposals_count} propuestas (+${WEIGHTS.few_proposals || 10})`);
  }

  // === URGENCY ===
  if (opportunity.urgency === 'high') {
    score += WEIGHTS.urgency_high || 8;
    reasons.push(`Urgencia alta (+${WEIGHTS.urgency_high || 8})`);
  }

  // === LONG TERM ===
  const desc = (opportunity.description || '').toLowerCase();
  if (/\b(long.?term|ongoing|retainer|monthly|recurring)\b/.test(desc)) {
    score += WEIGHTS.long_term || 8;
    reasons.push(`Proyecto largo plazo (+${WEIGHTS.long_term || 8})`);
  }

  // === LANGUAGE ===
  if (opportunity.language === 'es') {
    score += WEIGHTS.spanish_language || 5;
    reasons.push(`En español (+${WEIGHTS.spanish_language || 5})`);
  }

  // === PREMIUM PLATFORM ===
  if (['toptal'].includes(opportunity.platform)) {
    score += WEIGHTS.premium_platform || 5;
    reasons.push(`Plataforma premium (+${WEIGHTS.premium_platform || 5})`);
  }

  // === RECENCY ===
  if (opportunity.posted_at) {
    const hoursOld = (Date.now() - new Date(opportunity.posted_at).getTime()) / 3600000;
    if (hoursOld < 6) {
      score += WEIGHTS.post_very_recent || 10;
      reasons.push(`Muy reciente: <6h (+${WEIGHTS.post_very_recent || 10})`);
    } else if (hoursOld < 24) {
      score += WEIGHTS.post_recent || 5;
      reasons.push(`Reciente: <24h (+${WEIGHTS.post_recent || 5})`);
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Tier
  let tier = 'cold';
  if (score >= (THRESHOLDS.hot || 70)) tier = 'hot';
  else if (score >= (THRESHOLDS.warm || 40)) tier = 'warm';

  return { score, tier, reasons };
}

/**
 * Puntúa todas las oportunidades sin score
 */
export async function scoreNewOpportunities() {
  const db = getDb();
  const unscored = db.prepare(`
    SELECT * FROM freelance_opportunities WHERE match_score = 0 AND status = 'new' ORDER BY found_at DESC
  `).all();

  if (unscored.length === 0) {
    log.info('No hay oportunidades nuevas para puntuar');
    return { processed: 0, hot: 0, warm: 0, cold: 0 };
  }

  log.info(`Puntuando ${unscored.length} oportunidades...`);

  // Cargar perfil de BD (override config si existe)
  const profileData = getFreelanceProfile();
  const profile = {
    skills: profileData.skills ? JSON.parse(profileData.skills) : CONFIG.profile.skills,
    core_skills: profileData.core_skills ? JSON.parse(profileData.core_skills) : CONFIG.profile.core_skills,
  };

  let hot = 0, warm = 0, cold = 0;

  for (const opp of unscored) {
    const result = calculateMatchScore(opp, profile);

    updateFreelanceOpportunity(opp.id, {
      match_score: result.score,
      match_reasons: JSON.stringify(result.reasons),
    });

    if (result.tier === 'hot') hot++;
    else if (result.tier === 'warm') warm++;
    else cold++;

    log.info(`  ${opp.title.slice(0, 60)}: ${result.score} pts (${result.tier})`);
  }

  log.info(`Scoring completado: ${hot} hot, ${warm} warm, ${cold} cold`);
  return { processed: unscored.length, hot, warm, cold };
}

// Ejecutar directamente
if (process.argv[1] && process.argv[1].includes('freelance_scorer.js')) {
  await scoreNewOpportunities();
  process.exit(0);
}
