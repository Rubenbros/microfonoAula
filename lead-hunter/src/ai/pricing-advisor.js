import { askClaudeJSON } from './claude.js';
import { getFreelanceProfile, getFreelanceProjects } from '../db/database.js';
import { createLogger } from '../logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const log = createLogger('ai-pricing');
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadProfile() {
  const dbProfile = getFreelanceProfile();
  let configProfile = {};
  try {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
    configProfile = config.profile || {};
  } catch {}

  return {
    hourly_rate_min: parseInt(dbProfile.hourly_rate_min) || configProfile.hourly_rate_min || 50,
    hourly_rate_max: parseInt(dbProfile.hourly_rate_max) || configProfile.hourly_rate_max || 120,
    preferred_project_min: parseInt(dbProfile.preferred_project_min) || configProfile.preferred_project_min || 1000,
    preferred_project_max: parseInt(dbProfile.preferred_project_max) || configProfile.preferred_project_max || 50000,
  };
}

/**
 * Obtiene historial de precios de proyectos completados
 */
function getPricingHistory() {
  try {
    const projects = getFreelanceProjects({ limit: 100 }).projects;
    const completed = projects.filter(p => ['paid', 'closed', 'delivered'].includes(p.status) && p.agreed_price);
    return completed.map(p => ({
      type: p.service_type,
      price: p.agreed_price,
      currency: p.currency,
      payment_type: p.payment_type,
      hourly_rate: p.hourly_rate,
      hours: p.hours_logged,
      platform: p.platform,
    }));
  } catch { return []; }
}

/**
 * Sugiere pricing basado en la oportunidad, perfil e historial
 */
export async function suggestPricing(opportunity) {
  const profile = loadProfile();
  const history = getPricingHistory();
  const skills = opportunity.skills_required ? JSON.parse(opportunity.skills_required) : [];

  const budget = opportunity.budget_max
    ? `$${opportunity.budget_min || 0} - $${opportunity.budget_max}`
    : opportunity.budget_min ? `$${opportunity.budget_min}+` : 'Not specified';

  const prompt = `You are a freelance pricing consultant. Suggest optimal pricing for this project.

OPPORTUNITY:
- Title: ${opportunity.title}
- Description: ${(opportunity.description || '').slice(0, 2000)}
- Client budget: ${budget} (${opportunity.budget_type || 'unknown'})
- Category: ${opportunity.category || 'web'}
- Skills: ${skills.join(', ') || 'Not specified'}
- Platform: ${opportunity.platform}
- Competition: ${opportunity.proposals_count || 'unknown'} proposals

FREELANCER RATES:
- Hourly range: €${profile.hourly_rate_min}-${profile.hourly_rate_max}/hr
- Project range: €${profile.preferred_project_min}-${profile.preferred_project_max}

${history.length > 0 ? `PRICING HISTORY (past projects):\n${history.map(h => `- ${h.type}: ${h.price} ${h.currency} (${h.payment_type}${h.hours ? `, ${h.hours}h` : ''})`).join('\n')}` : 'No pricing history available.'}

Return JSON with:
{
  "recommended_price": number (in the client's expected currency, or EUR),
  "currency": "EUR" | "USD",
  "price_range_low": number,
  "price_range_high": number,
  "payment_type": "fixed" | "hourly" | "milestone",
  "hourly_rate_suggested": number (if hourly),
  "estimated_hours": number,
  "platform_fee_pct": number (typical fee for this platform),
  "net_after_fees": number,
  "justification": "2-3 sentences explaining the pricing rationale",
  "negotiation_tip": "1 sentence tip for negotiation",
  "value_vs_budget": "below" | "within" | "above" (compared to client budget)
}

Consider: platform fees (Upwork 10%, Freelancer 10%), market rates for these skills, and the project complexity.`;

  log.info(`Calculando pricing para oportunidad #${opportunity.id}`);
  const pricing = await askClaudeJSON(prompt);
  log.info(`Pricing sugerido: ${pricing.recommended_price} ${pricing.currency}`);
  return pricing;
}
