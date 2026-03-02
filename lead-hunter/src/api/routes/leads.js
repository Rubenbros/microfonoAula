import { Router } from 'express';
import { getDb, getLeadById, getLeadsByTier, updateLeadStatus, getLastEmailForLead, getDemoVisit } from '../../db/database.js';
import { sendEmail } from '../../emailer/sender.js';

const router = Router();

// GET /api/leads — Listar leads con filtros y paginación
router.get('/', (req, res) => {
  const db = getDb();
  const {
    tier, status, source, sector, zone, lead_type,
    search, sort = 'lead_score', order = 'DESC',
    page = 1, limit = 20,
  } = req.query;

  const conditions = [];
  const params = [];

  if (tier) { conditions.push('lead_tier = ?'); params.push(tier); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (source) { conditions.push('source = ?'); params.push(source); }
  if (sector) { conditions.push('sector = ?'); params.push(sector); }
  if (zone) { conditions.push('zone = ?'); params.push(zone); }
  if (lead_type) { conditions.push('lead_type = ?'); params.push(lead_type); }
  if (search) { conditions.push('name LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validar sort para evitar inyección
  const allowedSorts = ['lead_score', 'found_at', 'name', 'updated_at', 'status'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'lead_score';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM leads ${where}`).get(...params).c;
  const leads = db.prepare(
    `SELECT * FROM leads ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  res.json({
    leads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// GET /api/leads/:id — Detalle completo de un lead
router.get('/:id', (req, res) => {
  const db = getDb();
  const lead = getLeadById(parseInt(req.params.id));

  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  // Emails enviados
  const emails = db.prepare(
    'SELECT * FROM emails_sent WHERE lead_id = ? ORDER BY sent_at DESC'
  ).all(lead.id);

  // Demo visits
  const demoVisit = lead.demo_slug ? getDemoVisit(lead.id) : null;

  // Actividades (si la tabla existe)
  let activities = [];
  try {
    activities = db.prepare(
      'SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(lead.id);
  } catch { /* tabla puede no existir aún */ }

  // Propuestas (si la tabla existe)
  let proposals = [];
  try {
    proposals = db.prepare(
      'SELECT * FROM proposals WHERE lead_id = ? ORDER BY created_at DESC'
    ).all(lead.id);
  } catch { /* tabla puede no existir aún */ }

  res.json({ lead, emails, demoVisit, activities, proposals });
});

// PATCH /api/leads/:id — Actualizar lead
router.patch('/:id', (req, res) => {
  const lead = getLeadById(parseInt(req.params.id));
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  const { status, notes } = req.body;

  if (status) {
    updateLeadStatus(lead.id, status, notes || lead.notes);

    // Registrar actividad de cambio de estado
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO activities (lead_id, type, title, content, created_by)
         VALUES (?, 'status_change', ?, ?, 'admin')`
      ).run(lead.id, `Estado → ${status}`, notes || null);
    } catch { /* tabla puede no existir */ }
  } else if (notes !== undefined) {
    const db = getDb();
    db.prepare('UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(notes, lead.id);
  }

  res.json({ success: true, lead: getLeadById(lead.id) });
});

// DELETE /api/leads/:id — Eliminar lead
router.delete('/:id', (req, res) => {
  const db = getDb();
  const lead = getLeadById(parseInt(req.params.id));
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  db.prepare('DELETE FROM emails_sent WHERE lead_id = ?').run(lead.id);
  try { db.prepare('DELETE FROM activities WHERE lead_id = ?').run(lead.id); } catch {}
  try { db.prepare('DELETE FROM proposals WHERE lead_id = ?').run(lead.id); } catch {}
  try { db.prepare('DELETE FROM demo_visits WHERE lead_id = ?').run(lead.id); } catch {}
  db.prepare('DELETE FROM leads WHERE id = ?').run(lead.id);

  res.json({ success: true });
});

// POST /api/leads/:id/email — Enviar email manualmente
router.post('/:id/email', async (req, res) => {
  const lead = getLeadById(parseInt(req.params.id));
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  if (!lead.email) {
    return res.status(400).json({ error: 'Lead no tiene email' });
  }

  const lastEmail = getLastEmailForLead(lead.id);
  const step = lastEmail ? lastEmail.sequence_step + 1 : 1;

  if (step > 3) {
    return res.status(400).json({ error: 'Ya se enviaron los 3 emails de la secuencia' });
  }

  const result = await sendEmail(lead, step);
  res.json(result);
});

export default router;
