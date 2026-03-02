import { getLeadsWithDemos, getDemoVisit, upsertDemoVisit, getDemoVisitStats } from '../db/database.js';
import { notifyDemoVisit } from '../telegram/commands.js';
import { createLogger } from '../logger.js';

const log = createLogger('demo-visits');

const DEMO_API_URL = process.env.DEMO_API_URL || 'https://t800labs.com/api/demo';
const DEMO_API_KEY = process.env.DEMO_API_KEY;

// Rate limiting: máximo 1 petición por segundo a la API
const REQUEST_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Consulta las visitas de un slug en la API de demos
 * GET /api/demo/visits/:slug
 * Respuesta esperada: { slug, visitCount, lastVisitAt, visits: [...] }
 */
async function fetchDemoVisits(slug) {
  try {
    const res = await fetch(`${DEMO_API_URL}/visits/${slug}`, {
      headers: {
        'Authorization': `Bearer ${DEMO_API_KEY}`,
      },
    });

    if (res.status === 404) {
      // Endpoint no existe aún o slug no encontrado — no es un error crítico
      log.debug(`Visitas para "${slug}": endpoint 404 (no disponible aún)`);
      return null;
    }

    if (!res.ok) {
      log.warn(`Error consultando visitas de "${slug}": HTTP ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    log.error(`Error de conexión consultando visitas de "${slug}": ${err.message}`);
    return null;
  }
}

/**
 * Revisa las visitas de todos los leads con demo y notifica si hay nuevas
 */
export async function checkDemoVisits() {
  if (!DEMO_API_KEY) {
    log.warn('DEMO_API_KEY no configurada, saltando chequeo de visitas');
    return { checked: 0, newVisits: 0 };
  }

  const leads = getLeadsWithDemos();
  if (leads.length === 0) {
    log.info('No hay leads con demos registradas');
    return { checked: 0, newVisits: 0 };
  }

  log.info(`Chequeando visitas de ${leads.length} demos...`);

  let checked = 0;
  let newVisits = 0;

  for (const lead of leads) {
    try {
      const data = await fetchDemoVisits(lead.demo_slug);

      if (!data || data.visitCount === undefined) {
        checked++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const existing = getDemoVisit(lead.id);
      const previousCount = existing?.visit_count || 0;

      if (data.visitCount > previousCount) {
        // Hay visitas nuevas
        const newCount = data.visitCount - previousCount;
        newVisits += newCount;

        log.info(`${lead.name}: ${newCount} visita(s) nueva(s) (total: ${data.visitCount})`);

        // Actualizar BD
        upsertDemoVisit(lead.id, lead.demo_slug, data.visitCount, data.lastVisitAt);

        // Notificar por Telegram
        await notifyDemoVisit(lead, {
          visitCount: data.visitCount,
          newVisits: newCount,
          lastVisitAt: data.lastVisitAt,
        });
      } else if (!existing && data.visitCount === 0) {
        // Primera vez que chequeamos, sin visitas aún — registrar en BD
        upsertDemoVisit(lead.id, lead.demo_slug, 0, null);
      }

      checked++;
    } catch (err) {
      log.error(`Error procesando visitas de "${lead.name}": ${err.message}`);
    }

    // Rate limiting entre peticiones
    await sleep(REQUEST_DELAY_MS);
  }

  log.info(`Chequeo completado: ${checked} demos revisadas, ${newVisits} visitas nuevas`);
  return { checked, newVisits };
}

/**
 * Obtiene estadísticas de visitas a demos (para /stats y /demos)
 */
export { getDemoVisitStats };
