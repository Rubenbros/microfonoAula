import { Router } from 'express';
import { getDb, getLeadById } from '../../db/database.js';

const router = Router();

// Asegurar que la tabla activities existe
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      content TEXT,
      metadata TEXT,
      created_by TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at DESC);
  `);
}

// GET /api/activities/lead/:leadId — Timeline de actividades de un lead
router.get('/lead/:leadId', (req, res) => {
  ensureTable();
  const db = getDb();
  const activities = db.prepare(
    'SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(parseInt(req.params.leadId));

  res.json(activities);
});

// POST /api/activities/lead/:leadId — Crear actividad manual
router.post('/lead/:leadId', (req, res) => {
  ensureTable();
  const lead = getLeadById(parseInt(req.params.leadId));
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  const { type, title, content, metadata } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'El campo type es obligatorio' });
  }

  const validTypes = ['note', 'call', 'meeting', 'email_sent', 'email_opened', 'demo_visit', 'status_change', 'proposal'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Válidos: ${validTypes.join(', ')}` });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO activities (lead_id, type, title, content, metadata, created_by)
     VALUES (?, ?, ?, ?, ?, 'admin')`
  ).run(lead.id, type, title || null, content || null, metadata ? JSON.stringify(metadata) : null);

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(activity);
});

// DELETE /api/activities/:id — Eliminar actividad
router.delete('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(parseInt(req.params.id));

  if (!activity) {
    return res.status(404).json({ error: 'Actividad no encontrada' });
  }

  db.prepare('DELETE FROM activities WHERE id = ?').run(activity.id);
  res.json({ success: true });
});

export default router;
