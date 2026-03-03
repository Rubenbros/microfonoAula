import { askClaude } from './claude.js';
import { getFreelanceProfile, getFreelanceProjects } from '../db/database.js';
import { createLogger } from '../logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const log = createLogger('ai-proposal');
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Carga el perfil del freelancer (BD + config fallback)
 */
function loadProfile() {
  const dbProfile = getFreelanceProfile();
  let configProfile = {};
  try {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config/freelance_sources.json'), 'utf-8'));
    configProfile = config.profile || {};
  } catch {}

  return {
    name: dbProfile.name || configProfile.name || 'Rubén Jarne',
    title: dbProfile.title || configProfile.title || 'Full Stack Developer & Tech Lead',
    bio: dbProfile.bio || configProfile.bio || '',
    skills: dbProfile.skills ? JSON.parse(dbProfile.skills) : configProfile.skills || [],
    core_skills: dbProfile.core_skills ? JSON.parse(dbProfile.core_skills) : configProfile.core_skills || [],
    experience_years: parseInt(dbProfile.experience_years) || configProfile.experience_years || 5,
    hourly_rate_min: parseInt(dbProfile.hourly_rate_min) || configProfile.hourly_rate_min || 50,
    hourly_rate_max: parseInt(dbProfile.hourly_rate_max) || configProfile.hourly_rate_max || 120,
    portfolio_url: dbProfile.portfolio_url || configProfile.portfolio_url || 'https://t800labs.com',
    availability: dbProfile.availability || configProfile.availability || 'part-time',
  };
}

/**
 * Obtiene proyectos similares completados para contexto
 */
function getSimilarProjects(opportunity) {
  try {
    const projects = getFreelanceProjects({ status: 'paid', limit: 50 }).projects;
    if (projects.length === 0) return [];

    // Filtrar por tipo de servicio o skills similares
    const oppSkills = opportunity.skills_required ? JSON.parse(opportunity.skills_required) : [];
    return projects
      .filter(p => p.service_type === opportunity.category || oppSkills.length === 0)
      .slice(0, 3)
      .map(p => ({ name: p.name, type: p.service_type, price: p.agreed_price, currency: p.currency }));
  } catch { return []; }
}

/**
 * Genera una propuesta freelance personalizada para una oportunidad
 */
export async function generateFreelanceProposal(opportunity) {
  const profile = loadProfile();
  const similarProjects = getSimilarProjects(opportunity);

  const skills = opportunity.skills_required ? JSON.parse(opportunity.skills_required) : [];
  const budget = opportunity.budget_max
    ? `$${opportunity.budget_min || 0} - $${opportunity.budget_max}`
    : opportunity.budget_min ? `$${opportunity.budget_min}+` : 'Not specified';

  const platformTips = {
    upwork: 'Upwork proposals should be concise (150-300 words), start with a hook showing you read the project, and end with a question.',
    reddit: 'Reddit replies should be casual but professional, show genuine interest, and not feel like a template.',
    hackernews: 'HackerNews replies should be technical and to the point, showing deep expertise.',
    freelancer: 'Freelancer proposals should highlight relevant portfolio pieces and include a clear timeline.',
  };

  const prompt = `You are writing a freelance proposal for ${profile.name}, a ${profile.title} with ${profile.experience_years}+ years of experience.

OPPORTUNITY:
- Title: ${opportunity.title}
- Platform: ${opportunity.platform}
- Description: ${(opportunity.description || '').slice(0, 2000)}
- Skills needed: ${skills.join(', ') || 'Not specified'}
- Budget: ${budget}
- Category: ${opportunity.category || 'web'}
- Language: ${opportunity.language || 'en'}

YOUR PROFILE:
- Skills: ${profile.skills.join(', ')}
- Core strengths: ${profile.core_skills.join(', ')}
- Hourly rate: €${profile.hourly_rate_min}-${profile.hourly_rate_max}/hr
- Portfolio: ${profile.portfolio_url}
- Availability: ${profile.availability}

${similarProjects.length > 0 ? `RELEVANT PAST PROJECTS:\n${similarProjects.map(p => `- ${p.name} (${p.type}) — ${p.price} ${p.currency}`).join('\n')}` : ''}

${platformTips[opportunity.platform] || 'Write a professional but approachable proposal.'}

Write a compelling proposal that:
1. Opens with a hook showing you understood the project requirements
2. Briefly explains your relevant experience (2-3 sentences max)
3. Proposes a clear approach/methodology (3-5 bullet points)
4. Includes a realistic timeline estimate
5. Suggests pricing (if budget allows)
6. Ends with a call to action or question to engage the client

Write in ${opportunity.language === 'es' ? 'Spanish' : 'English'}.
Keep it ${opportunity.platform === 'upwork' ? '150-300' : '200-400'} words.
Do NOT use generic filler. Be specific to this project.`;

  log.info(`Generando propuesta para oportunidad #${opportunity.id} (${opportunity.platform})`);
  const proposal = await askClaude(prompt);
  log.info(`Propuesta generada (${proposal.length} chars)`);
  return proposal;
}
