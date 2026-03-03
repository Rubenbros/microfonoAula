import { askClaudeJSON } from './claude.js';
import { getFreelanceProfile } from '../db/database.js';
import { createLogger } from '../logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const log = createLogger('ai-analyzer');
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadProfile() {
  const dbProfile = getFreelanceProfile();
  let configProfile = {};
  try {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
    configProfile = config.profile || {};
  } catch {}

  return {
    name: dbProfile.name || configProfile.name || 'Rubén Jarne',
    skills: dbProfile.skills ? JSON.parse(dbProfile.skills) : configProfile.skills || [],
    core_skills: dbProfile.core_skills ? JSON.parse(dbProfile.core_skills) : configProfile.core_skills || [],
    hourly_rate_min: parseInt(dbProfile.hourly_rate_min) || configProfile.hourly_rate_min || 50,
    hourly_rate_max: parseInt(dbProfile.hourly_rate_max) || configProfile.hourly_rate_max || 120,
    preferred_project_min: parseInt(dbProfile.preferred_project_min) || configProfile.preferred_project_min || 1000,
  };
}

/**
 * Analiza una oportunidad freelance en profundidad:
 * - ¿Merece la pena aplicar?
 * - Red flags del cliente
 * - Estimación realista de horas
 * - Recomendación final
 */
export async function analyzeOpportunity(opportunity) {
  const profile = loadProfile();
  const skills = opportunity.skills_required ? JSON.parse(opportunity.skills_required) : [];

  const budget = opportunity.budget_max
    ? `$${opportunity.budget_min || 0} - $${opportunity.budget_max}`
    : opportunity.budget_min ? `$${opportunity.budget_min}+` : 'Not specified';

  const prompt = `You are an experienced freelance consultant analyzing a project opportunity.

OPPORTUNITY:
- Title: ${opportunity.title}
- Platform: ${opportunity.platform}
- Full description: ${(opportunity.description || '').slice(0, 3000)}
- Skills needed: ${skills.join(', ') || 'Not specified'}
- Budget: ${budget} (${opportunity.budget_type || 'unknown'})
- Category: ${opportunity.category || 'web'}
- Proposals so far: ${opportunity.proposals_count || 'unknown'}
- Client rating: ${opportunity.client_rating || 'unknown'}
- Client total spent: ${opportunity.client_spent || 'unknown'}
- Urgency: ${opportunity.urgency || 'normal'}
- Posted: ${opportunity.posted_at || 'unknown'}

FREELANCER PROFILE:
- Skills: ${profile.skills.join(', ')}
- Core skills: ${profile.core_skills.join(', ')}
- Rate: €${profile.hourly_rate_min}-${profile.hourly_rate_max}/hr
- Minimum project: €${profile.preferred_project_min}

Analyze this opportunity and return JSON with:
{
  "worth_applying": true/false,
  "confidence": 1-10,
  "estimated_hours": number (realistic estimate),
  "estimated_value_eur": number,
  "skills_match_pct": number (0-100),
  "red_flags": ["list of concerns"],
  "green_flags": ["list of positives"],
  "recommendation": "1-2 sentence summary of whether to apply and why",
  "suggested_approach": "Brief technical approach in 2-3 sentences",
  "competition_level": "low" | "medium" | "high"
}

Be honest and critical. Flag unrealistic budgets, scope creep risks, and unclear requirements.`;

  log.info(`Analizando oportunidad #${opportunity.id} (${opportunity.platform})`);
  const analysis = await askClaudeJSON(prompt);
  log.info(`Análisis completado: worth_applying=${analysis.worth_applying}, confidence=${analysis.confidence}`);
  return analysis;
}
