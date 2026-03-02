import { getDb, updateOnlineLeadScore } from '../db/database.js';
import { analyzeWebsite } from '../scraper/website.js';
import { registerDemo } from '../demo/register.js';
import { createLogger } from '../logger.js';

const log = createLogger('scorer');

/**
 * Calcula el lead score de un negocio local (0-100)
 */
export function calculateScore(lead, webAnalysis) {
  let score = 0;
  const reasons = [];

  // === SIN WEB (máxima oportunidad) ===
  if (!lead.website || !webAnalysis.exists) {
    score += 30;
    reasons.push('Sin web (+30)');
  }
  // === WEB MALA ===
  else if (webAnalysis.quality < 40) {
    score += 20;
    reasons.push(`Web de baja calidad: ${webAnalysis.quality}/100 (+20)`);
  }
  else if (webAnalysis.quality < 60) {
    score += 10;
    reasons.push(`Web mejorable: ${webAnalysis.quality}/100 (+10)`);
  }

  // === SIN SISTEMA DE RESERVAS ===
  if (!webAnalysis.hasBooking) {
    score += 15;
    reasons.push('Sin reservas online (+15)');
  }

  // === SIN REDES SOCIALES ===
  if (!webAnalysis.hasSocialMedia) {
    score += 10;
    reasons.push('Sin redes sociales (+10)');
  }

  // === NEGOCIO ACTIVO (buenas reseñas = merece la pena) ===
  if (lead.rating && lead.rating >= 4.0) {
    score += 10;
    reasons.push(`Buena valoración: ${lead.rating}★ (+10)`);
  }
  if (lead.review_count && lead.review_count >= 20) {
    score += 5;
    reasons.push(`Muchas reseñas: ${lead.review_count} (+5)`);
  }

  // === SECTOR DE ALTA NECESIDAD ===
  const highNeedSectors = ['peluquería', 'restaurante', 'clínica', 'dentista', 'taller'];
  if (highNeedSectors.some(s => (lead.sector || '').toLowerCase().includes(s))) {
    score += 10;
    reasons.push('Sector con alta necesidad (+10)');
  }

  // === WEB NO RESPONSIVE ===
  if (webAnalysis.exists && !webAnalysis.isMobileResponsive) {
    score += 10;
    reasons.push('Web no adaptada a móvil (+10)');
  }

  // === Sin HTTPS ===
  if (webAnalysis.exists && !webAnalysis.hasSSL) {
    score += 5;
    reasons.push('Sin HTTPS (+5)');
  }

  score = Math.max(0, Math.min(100, score));

  let tier = 'cold';
  if (score >= 70) tier = 'hot';
  else if (score >= 40) tier = 'warm';

  return { score, tier, reasons };
}

/**
 * Calcula el lead score de un lead online (0-100)
 */
export function calculateOnlineScore(lead) {
  let score = 0;
  const reasons = [];

  // === PRESUPUESTO (indica seriedad) ===
  if (lead.budget_max && lead.budget_max >= 1000) {
    score += 25;
    reasons.push(`Presupuesto alto: $${lead.budget_max} (+25)`);
  } else if (lead.budget_max && lead.budget_max >= 300) {
    score += 15;
    reasons.push(`Presupuesto medio: $${lead.budget_max} (+15)`);
  } else if (lead.budget_min && lead.budget_min > 0) {
    score += 5;
    reasons.push(`Presupuesto mencionado: $${lead.budget_min} (+5)`);
  }

  // === TIPO DE SERVICIO (nuestro fuerte) ===
  const highValue = ['automation', 'software', 'chatbot', 'bot', 'ai_training'];
  const mediumValue = ['website', 'ecommerce', 'scraping'];

  if (highValue.includes(lead.service_type)) {
    score += 20;
    reasons.push(`Servicio alto valor: ${lead.service_type} (+20)`);
  } else if (mediumValue.includes(lead.service_type)) {
    score += 10;
    reasons.push(`Servicio web: ${lead.service_type} (+10)`);
  }

  // === URGENCIA ===
  if (lead.urgency === 'high') {
    score += 15;
    reasons.push('Alta urgencia (+15)');
  } else if (lead.urgency === 'medium') {
    score += 8;
    reasons.push('Urgencia media (+8)');
  }

  // === FRESCURA DEL POST ===
  if (lead.post_date) {
    const hoursOld = (Date.now() - new Date(lead.post_date).getTime()) / 3600000;
    if (hoursOld < 6) {
      score += 15;
      reasons.push('Post muy reciente: <6h (+15)');
    } else if (hoursOld < 24) {
      score += 10;
      reasons.push('Post reciente: <24h (+10)');
    } else if (hoursOld < 72) {
      score += 5;
      reasons.push('Post de últimos 3 días (+5)');
    }
  }

  // === IDIOMA (preferencia español) ===
  if (lead.language === 'es') {
    score += 10;
    reasons.push('En español (+10)');
  }

  // === EMAIL DISPONIBLE ===
  if (lead.email) {
    score += 10;
    reasons.push('Email disponible (+10)');
  }

  // === FUENTE DE CALIDAD ===
  if (lead.source === 'reddit' && lead.sector === 'r/forhire') {
    score += 5;
    reasons.push('De r/forhire (+5)');
  }

  score = Math.max(0, Math.min(100, score));

  let tier = 'cold';
  if (score >= 70) tier = 'hot';
  else if (score >= 40) tier = 'warm';

  return { score, tier, reasons };
}

/**
 * Analiza y puntúa todos los leads sin puntuar
 */
export async function scoreNewLeads() {
  const db = getDb();
  const unscored = db.prepare(`
    SELECT * FROM leads WHERE lead_score = 0 ORDER BY id ASC
  `).all();

  if (unscored.length === 0) {
    log.info('No hay leads nuevos para puntuar');
    return { processed: 0 };
  }

  log.info(`Puntuando ${unscored.length} leads nuevos...`);

  let hot = 0, warm = 0, cold = 0;

  for (const lead of unscored) {
    try {
      let result;

      if (lead.lead_type === 'online') {
        // Leads online: scoring directo sin análisis web
        result = calculateOnlineScore(lead);
        updateOnlineLeadScore(lead.id, result.score, result.tier, result.reasons.join(' | '));
      } else {
        // Leads locales: análisis web + scoring existente
        const webAnalysis = lead.website
          ? await analyzeWebsite(lead.website)
          : { exists: false, quality: 0, hasBooking: false, hasSocialMedia: false, isMobileResponsive: false, hasSSL: false };

        result = calculateScore(lead, webAnalysis);

        db.prepare(`
          UPDATE leads SET
            lead_score = ?, lead_tier = ?,
            has_website = ?, website_quality = ?,
            has_booking_system = ?, has_social_media = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          result.score, result.tier,
          webAnalysis.exists ? 1 : 0, webAnalysis.quality,
          webAnalysis.hasBooking ? 1 : 0, webAnalysis.hasSocialMedia ? 1 : 0,
          result.reasons.join(' | '),
          lead.id
        );
      }

      if (result.tier === 'hot') hot++;
      else if (result.tier === 'warm') warm++;
      else cold++;

      log.info(`  ${lead.name.slice(0, 50)}: ${result.score} pts (${result.tier}) — ${result.reasons.join(', ')}`);

      // Generar demo personalizada para leads locales calientes/tibios sin web
      if (lead.lead_type !== 'online' && (result.tier === 'hot' || result.tier === 'warm') && !lead.demo_url) {
        try {
          const demoUrl = await registerDemo(lead);
          if (demoUrl) {
            log.info(`  → Demo generada: ${demoUrl}`);
          }
        } catch (err) {
          log.warn(`  → Error generando demo: ${err.message}`);
        }
      }

      // Pausa entre análisis de webs (solo locales con web)
      if (lead.lead_type !== 'online' && lead.website) {
        await new Promise(r => setTimeout(r, 2000));
      }

    } catch (err) {
      log.warn(`  Error puntuando ${lead.name}: ${err.message}`);
    }
  }

  log.info(`Puntuación completada: ${hot} calientes, ${warm} tibios, ${cold} fríos`);
  return { processed: unscored.length, hot, warm, cold };
}

// Ejecutar directamente
if (process.argv[1] && process.argv[1].includes('scorer.js')) {
  await scoreNewLeads();
  process.exit(0);
}
