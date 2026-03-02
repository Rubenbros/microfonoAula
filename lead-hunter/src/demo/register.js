import { getDb } from '../db/database.js';
import { createLogger } from '../logger.js';

const log = createLogger('demo');

const DEMO_API_URL = process.env.DEMO_API_URL || 'https://t800labs.com/api/demo';
const DEMO_API_KEY = process.env.DEMO_API_KEY;

/**
 * Genera un slug a partir del nombre del negocio
 * "Peluquería María" → "peluqueria-maria"
 * "Bar El Rincón de Juan" → "bar-el-rincon-de-juan"
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')    // solo alfanuméricos, espacios, guiones
    .trim()
    .replace(/\s+/g, '-')            // espacios → guiones
    .replace(/-+/g, '-')             // guiones múltiples → uno
    .slice(0, 80);                   // máx 80 chars
}

/**
 * Mapea el sector de Lead Hunter al sectorId de la web
 */
const SECTOR_MAP = {
  peluqueria: 'peluqueria',
  restaurante: 'restaurante',
  clinica: 'clinica',
  taller: 'taller',
  academia: 'academia',
  tienda: 'tienda',
  gimnasio: 'gimnasio',
  inmobiliaria: 'inmobiliaria',
};

/**
 * Parsea los horarios del lead (JSON string de Google Maps) al formato de la API
 */
function parseHours(openingHours) {
  if (!openingHours) return undefined;

  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (typeof hours === 'object' && !Array.isArray(hours)) return hours;

    // Si es un array de strings tipo ["Lunes: 9:00–19:00", ...]
    if (Array.isArray(hours)) {
      const parsed = {};
      for (const line of hours) {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (match) parsed[match[1].trim()] = match[2].trim();
      }
      return Object.keys(parsed).length > 0 ? parsed : undefined;
    }
  } catch {
    // no se pudo parsear
  }
  return undefined;
}

/**
 * Registra un negocio en la API de demos de t800labs.com
 * Devuelve la URL de la demo o null si falla
 */
export async function registerDemo(lead) {
  if (!DEMO_API_KEY) {
    log.warn('DEMO_API_KEY no configurada, saltando registro de demo');
    return null;
  }

  const sectorId = SECTOR_MAP[lead.sector];
  if (!sectorId) {
    log.warn(`Sector "${lead.sector}" no tiene demo disponible`);
    return null;
  }

  const slug = generateSlug(lead.name);
  if (!slug) {
    log.warn(`No se pudo generar slug para "${lead.name}"`);
    return null;
  }

  const body = {
    slug,
    sectorId,
    businessName: lead.name,
    address: lead.address || undefined,
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    whatsapp: lead.phone ? lead.phone.replace(/[^0-9]/g, '') : undefined,
    rating: lead.rating || undefined,
    reviewCount: lead.review_count || undefined,
    hours: parseHours(lead.opening_hours),
  };

  try {
    const res = await fetch(`${DEMO_API_URL}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEMO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      log.info(`Demo registrada: ${data.demoUrl}`);
      // Guardar la URL en la BD
      saveDemoUrl(lead.id, data.demoUrl, slug);
      return data.demoUrl;
    }

    // 409 = slug ya existe, intentar con slug + zona
    if (res.status === 409 && lead.zone) {
      const zoneSlug = generateSlug(`${lead.name} ${lead.zone}`);
      body.slug = zoneSlug;

      const retryRes = await fetch(`${DEMO_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEMO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const retryData = await retryRes.json();

      if (retryRes.ok && retryData.success) {
        log.info(`Demo registrada (con zona): ${retryData.demoUrl}`);
        saveDemoUrl(lead.id, retryData.demoUrl, zoneSlug);
        return retryData.demoUrl;
      }

      log.warn(`Error registrando demo (retry): ${retryData.error || retryRes.status}`);
      return null;
    }

    log.warn(`Error registrando demo: ${data.error || res.status}`);
    return null;

  } catch (err) {
    log.error(`Error de conexión con API de demos: ${err.message}`);
    return null;
  }
}

/**
 * Guarda la URL de la demo en la BD del lead
 */
function saveDemoUrl(leadId, demoUrl, slug) {
  try {
    const db = getDb();
    db.prepare(`UPDATE leads SET demo_url = ?, demo_slug = ? WHERE id = ?`).run(demoUrl, slug, leadId);
  } catch (err) {
    log.error(`Error guardando demo_url en BD: ${err.message}`);
  }
}

/**
 * Obtiene la URL de la demo de un lead (si ya fue registrada)
 */
export function getDemoUrl(leadId) {
  const db = getDb();
  const row = db.prepare(`SELECT demo_url FROM leads WHERE id = ?`).get(leadId);
  return row?.demo_url || null;
}
