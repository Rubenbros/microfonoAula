import { Router } from 'express';
import { getDb, getLeadById } from '../../db/database.js';

const router = Router();

// Asegurar que la tabla proposals existe
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
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
    );
  `);
}

// GET /api/proposals/lead/:leadId — Propuestas de un lead
router.get('/lead/:leadId', (req, res) => {
  ensureTable();
  const db = getDb();
  const proposals = db.prepare(
    'SELECT * FROM proposals WHERE lead_id = ? ORDER BY created_at DESC'
  ).all(parseInt(req.params.leadId));

  res.json(proposals);
});

// POST /api/proposals/lead/:leadId — Crear propuesta
router.post('/lead/:leadId', (req, res) => {
  ensureTable();
  const lead = getLeadById(parseInt(req.params.leadId));
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  const { content, services, total_setup, total_monthly } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'El campo content es obligatorio' });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO proposals (lead_id, content, services, total_setup, total_monthly)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    lead.id,
    content,
    services ? JSON.stringify(services) : null,
    total_setup || null,
    total_monthly || null,
  );

  // Registrar actividad
  try {
    db.prepare(
      `INSERT INTO activities (lead_id, type, title, content, created_by)
       VALUES (?, 'proposal', 'Propuesta generada', ?, 'admin')`
    ).run(lead.id, `Setup: ${total_setup || '?'}€ | Mensual: ${total_monthly || '?'}€/mes`);
  } catch {}

  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(proposal);
});

// PATCH /api/proposals/:id — Actualizar propuesta
router.patch('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(parseInt(req.params.id));

  if (!proposal) {
    return res.status(404).json({ error: 'Propuesta no encontrada' });
  }

  const { content, services, total_setup, total_monthly, status } = req.body;

  db.prepare(`
    UPDATE proposals SET
      content = COALESCE(?, content),
      services = COALESCE(?, services),
      total_setup = COALESCE(?, total_setup),
      total_monthly = COALESCE(?, total_monthly),
      status = COALESCE(?, status),
      sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    content || null,
    services ? JSON.stringify(services) : null,
    total_setup ?? null,
    total_monthly ?? null,
    status || null,
    status || null,
    proposal.id,
  );

  const updated = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id);
  res.json(updated);
});

// DELETE /api/proposals/:id — Eliminar propuesta
router.delete('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(parseInt(req.params.id));

  if (!proposal) {
    return res.status(404).json({ error: 'Propuesta no encontrada' });
  }

  db.prepare('DELETE FROM proposals WHERE id = ?').run(proposal.id);
  res.json({ success: true });
});

export default router;
