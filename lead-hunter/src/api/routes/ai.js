import { Router } from 'express';
import { getDb, getLeadById } from '../../db/database.js';
import { askClaude, askClaudeJSON } from '../../ai/claude.js';
import { createLogger } from '../../logger.js';

const log = createLogger('api-ai');
const router = Router();

// POST /api/ai/ideas — Genera ideas de negocio con Claude Code
router.post('/ideas', async (req, res) => {
  try {
    // Obtener contexto
    const db = getDb();

    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
    const totalLocal = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'local'").get().c;
    const totalOnline = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'online'").get().c;
    const hotLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'hot'").get().c;

    // Ideas existentes y rechazadas
    let existingIdeas = 'Ninguna todavía';
    let rejectedContext = '';
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS automations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        investment_estimate REAL,
        monthly_revenue_estimate REAL,
        time_to_launch TEXT,
        difficulty TEXT,
        implementation_plan TEXT,
        status TEXT DEFAULT 'idea',
        progress INTEGER DEFAULT 0,
        notes TEXT,
        rejection_reason TEXT,
        generated_by TEXT DEFAULT 'ai',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`);
      try { db.exec('ALTER TABLE automations ADD COLUMN rejection_reason TEXT'); } catch {}

      const existing = db.prepare("SELECT title FROM automations WHERE status != 'rejected'").all();
      if (existing.length > 0) {
        existingIdeas = existing.map(a => a.title).join(', ');
      }

      const rejected = db.prepare("SELECT title, rejection_reason FROM automations WHERE status = 'rejected' AND rejection_reason IS NOT NULL").all();
      if (rejected.length > 0) {
        rejectedContext = '\n\nIDEAS RECHAZADAS (NO proponer nada similar, ten en cuenta los motivos del rechazo):\n' +
          rejected.map(r => `- "${r.title}": rechazada porque ${r.rejection_reason}`).join('\n');
      }
    } catch {}

    const prompt = `Eres el estratega de negocio de T800 Labs, empresa de desarrollo web, apps e IA en Zaragoza.

CONTEXTO:
- Total leads captados: ${totalLeads} (locales: ${totalLocal}, online: ${totalOnline})
- Leads calientes: ${hotLeads}
- Servicios actuales: desarrollo web, apps móviles, automatización, IA, chatbots
- Clientes típicos: pymes locales (peluquerías, restaurantes, clínicas, talleres, academias, tiendas, gimnasios, inmobiliarias)
- Ideas ya propuestas: ${existingIdeas}${rejectedContext}

Propón 3 nuevas ideas de negocio/automatización de ingresos para T800 Labs.

Para cada idea devuelve un JSON array con 3 objetos, cada uno con:
- title: string (nombre corto de la idea)
- description: string (2-3 frases explicando la idea)
- category: "saas" | "service" | "tool" | "content" | "marketplace" | "automation"
- investment_estimate: number (euros necesarios para MVP)
- monthly_revenue_estimate: number (euros mensuales estimados una vez operativo)
- time_to_launch: string (ej: "2 semanas", "1 mes")
- difficulty: "baja" | "media" | "alta"
- implementation_plan: string[] (5-7 pasos de implementación)

Prioriza ideas que:
- Aprovechen los datos/leads que ya tenemos
- Generen ingresos recurrentes
- Sean escalables
- Tengan baja inversión inicial
- Se puedan validar rápido (MVP en <2 semanas)
- NO repitan ideas ya propuestas ni ideas rechazadas

Responde SOLO con el JSON array, sin texto adicional.`;

    const ideas = await askClaudeJSON(prompt);

    if (!Array.isArray(ideas)) {
      return res.status(500).json({ error: 'Respuesta de IA no es un array' });
    }

    // Guardar cada idea
    const saved = [];
    for (const idea of ideas) {
      const result = db.prepare(`
        INSERT INTO automations (title, description, category, investment_estimate,
          monthly_revenue_estimate, time_to_launch, difficulty, implementation_plan,
          status, generated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idea', 'ai')
      `).run(
        idea.title,
        idea.description || null,
        idea.category || null,
        idea.investment_estimate || null,
        idea.monthly_revenue_estimate || null,
        idea.time_to_launch || null,
        idea.difficulty || null,
        idea.implementation_plan ? JSON.stringify(idea.implementation_plan) : null,
      );

      const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
      saved.push(automation);
    }

    log.info(`${saved.length} ideas generadas con Claude Code`);
    res.json({ ideas: saved });

  } catch (err) {
    log.error(`Error generando ideas: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/proposal — Genera propuesta comercial para un lead
router.post('/proposal', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId es obligatorio' });
    }

    const lead = getLeadById(parseInt(leadId));
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    const problems = [];
    if (!lead.has_website) problems.push('No tiene página web');
    if (!lead.has_booking_system) problems.push('No tiene sistema de reservas online');
    if (!lead.has_social_media) problems.push('No tiene presencia en redes sociales');
    if (lead.website_quality < 40) problems.push('Su web actual es de baja calidad');

    const sectorPrices = {
      peluqueria: { setup: 800, monthly: 40 },
      restaurante: { setup: 1200, monthly: 50 },
      clinica: { setup: 2000, monthly: 80 },
      taller: { setup: 1500, monthly: 60 },
      academia: { setup: 1800, monthly: 70 },
      tienda: { setup: 1000, monthly: 40 },
      gimnasio: { setup: 2500, monthly: 100 },
      inmobiliaria: { setup: 2000, monthly: 80 },
    };
    const prices = sectorPrices[lead.sector] || { setup: 1500, monthly: 60 };

    const prompt = `Eres un consultor comercial de T800 Labs (t800labs.com), empresa de desarrollo web, apps e IA en Zaragoza.

Genera una propuesta comercial personalizada para este negocio:
- Nombre: ${lead.name}
- Sector: ${lead.sector || 'general'}
- Zona: ${lead.zone || 'Zaragoza'}
- Problemas detectados: ${problems.join(', ') || 'Necesita mejoras de digitalización'}
- Rating Google: ${lead.rating || '?'}★ (${lead.review_count || 0} reseñas)
- Web actual: ${lead.website || 'No tiene'}
- Calidad web: ${lead.website_quality || 0}/100

Precios de referencia para sector ${lead.sector || 'general'}:
- Setup: ${prices.setup}€
- Mensual: ${prices.monthly}€/mes

La propuesta debe ser concisa, profesional, con:
1. Saludo personalizado mencionando el negocio por su nombre
2. 2-3 problemas detectados (tono consultivo, no agresivo)
3. Solución concreta (servicios específicos para su sector)
4. Presupuesto desglosado: coste inicial + mensualidad
5. 3 beneficios esperados con datos estimados
6. Llamada a la acción (reunión o llamada)

Tono: profesional, cercano, directo. Máximo 400 palabras.

Al final, añade en una línea separada un JSON con este formato exacto:
---JSON---
{"services": ["servicio1", "servicio2"], "totalSetup": X, "totalMonthly": Y}`;

    const text = await askClaude(prompt);

    // Extraer JSON del final
    let services = [];
    let totalSetup = prices.setup;
    let totalMonthly = prices.monthly;
    let content = text;

    const jsonMatch = text.match(/---JSON---\s*(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        services = parsed.services || [];
        totalSetup = parsed.totalSetup || prices.setup;
        totalMonthly = parsed.totalMonthly || prices.monthly;
        content = text.replace(/---JSON---[\s\S]*$/, '').trim();
      } catch {}
    }

    // Guardar propuesta
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      services TEXT,
      total_setup REAL,
      total_monthly REAL,
      status TEXT DEFAULT 'draft',
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    )`);

    const result = db.prepare(
      `INSERT INTO proposals (lead_id, content, services, total_setup, total_monthly)
       VALUES (?, ?, ?, ?, ?)`
    ).run(lead.id, content, JSON.stringify(services), totalSetup, totalMonthly);

    // Actividad
    try {
      db.prepare(
        `INSERT INTO activities (lead_id, type, title, content, created_by)
         VALUES (?, 'proposal', 'Propuesta generada', ?, 'admin')`
      ).run(lead.id, `Setup: ${totalSetup}€ | Mensual: ${totalMonthly}€/mes`);
    } catch {}

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
    log.info(`Propuesta generada para lead #${lead.id} (${lead.name}) con Claude Code`);
    res.status(201).json(proposal);

  } catch (err) {
    log.error(`Error generando propuesta: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
