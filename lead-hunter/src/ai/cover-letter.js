import { askClaude } from './claude.js';
import { getFreelanceProfile } from '../db/database.js';
import { createLogger } from '../logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const log = createLogger('ai-cover-letter');
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
    title: dbProfile.title || configProfile.title || 'Full Stack Developer & Tech Lead',
    bio: dbProfile.bio || configProfile.bio || '',
    skills: dbProfile.skills ? JSON.parse(dbProfile.skills) : configProfile.skills || [],
    core_skills: dbProfile.core_skills ? JSON.parse(dbProfile.core_skills) : configProfile.core_skills || [],
    experience_years: parseInt(dbProfile.experience_years) || configProfile.experience_years || 5,
    portfolio_url: dbProfile.portfolio_url || configProfile.portfolio_url || 'https://t800labs.com',
  };
}

/**
 * Genera una cover letter corta y directa para aplicar a un proyecto
 * Más breve que una propuesta completa — ideal para mensajes iniciales
 */
export async function generateCoverLetter(opportunity) {
  const profile = loadProfile();
  const skills = opportunity.skills_required ? JSON.parse(opportunity.skills_required) : [];

  const prompt = `Write a SHORT cover letter (80-150 words max) for a freelance application.

OPPORTUNITY:
- Title: ${opportunity.title}
- Platform: ${opportunity.platform}
- Description: ${(opportunity.description || '').slice(0, 1500)}
- Skills needed: ${skills.join(', ') || 'Not specified'}

APPLICANT:
- Name: ${profile.name}
- Role: ${profile.title}
- Key skills: ${profile.core_skills.join(', ')}
- Experience: ${profile.experience_years}+ years
- Portfolio: ${profile.portfolio_url}

Rules:
- Maximum 150 words, aim for 100
- Open with ONE sentence showing you read the project
- Mention 1-2 specific relevant skills or experiences
- End with availability and a question
- Tone: confident, direct, no fluff
- Write in ${opportunity.language === 'es' ? 'Spanish' : 'English'}
- Do NOT start with "Dear" or "I am writing to..." — be modern
- Do NOT include a subject line`;

  log.info(`Generando cover letter para oportunidad #${opportunity.id}`);
  const letter = await askClaude(prompt);
  log.info(`Cover letter generada (${letter.length} chars)`);
  return letter;
}
