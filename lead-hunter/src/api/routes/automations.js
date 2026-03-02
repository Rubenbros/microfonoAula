import { Router } from 'express';
import { getDb } from '../../db/database.js';

const router = Router();

// Asegurar que la tabla automations existe
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS automations (
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
      generated_by TEXT DEFAULT 'ai',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// GET /api/automations — Listar automatizaciones
router.get('/', (req, res) => {
  ensureTable();
  const db = getDb();
  const { status, category } = req.query;

  let sql = 'SELECT * FROM automations';
  const conditions = [];
  const params = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (category) { conditions.push('category = ?'); params.push(category); }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY created_at DESC';

  const automations = db.prepare(sql).all(...params);

  // Stats resumen
  const all = db.prepare('SELECT * FROM automations').all();
  const stats = {
    total: all.length,
    byStatus: {
      idea: all.filter(a => a.status === 'idea').length,
      evaluating: all.filter(a => a.status === 'evaluating').length,
      in_progress: all.filter(a => a.status === 'in_progress').length,
      launched: all.filter(a => a.status === 'launched').length,
      paused: all.filter(a => a.status === 'paused').length,
      discarded: all.filter(a => a.status === 'discarded').length,
    },
    totalRevenuePotential: all
      .filter(a => a.status !== 'discarded')
      .reduce((sum, a) => sum + (a.monthly_revenue_estimate || 0), 0),
  };

  res.json({ automations, stats });
});

// GET /api/automations/:id — Detalle de una automatización
router.get('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const automation = db.prepare('SELECT * FROM automations WHERE id = ?')
    .get(parseInt(req.params.id));

  if (!automation) {
    return res.status(404).json({ error: 'Automatización no encontrada' });
  }

  res.json(automation);
});

// POST /api/automations — Crear automatización
router.post('/', (req, res) => {
  ensureTable();
  const db = getDb();
  const {
    title, description, category, investment_estimate,
    monthly_revenue_estimate, time_to_launch, difficulty,
    implementation_plan, status, generated_by,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El campo title es obligatorio' });
  }

  const validCategories = ['saas', 'service', 'tool', 'content', 'marketplace', 'automation'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ error: `Categoría inválida. Válidas: ${validCategories.join(', ')}` });
  }

  const result = db.prepare(`
    INSERT INTO automations (title, description, category, investment_estimate,
      monthly_revenue_estimate, time_to_launch, difficulty, implementation_plan,
      status, generated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    category || null,
    investment_estimate || null,
    monthly_revenue_estimate || null,
    time_to_launch || null,
    difficulty || null,
    implementation_plan ? JSON.stringify(implementation_plan) : null,
    status || 'idea',
    generated_by || 'manual',
  );

  const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(automation);
});

// PATCH /api/automations/:id — Actualizar automatización
router.patch('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const automation = db.prepare('SELECT * FROM automations WHERE id = ?')
    .get(parseInt(req.params.id));

  if (!automation) {
    return res.status(404).json({ error: 'Automatización no encontrada' });
  }

  const fields = ['title', 'description', 'category', 'investment_estimate',
    'monthly_revenue_estimate', 'time_to_launch', 'difficulty',
    'implementation_plan', 'status', 'progress', 'notes'];

  const updates = [];
  const params = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      const val = req.body[field];
      params.push(field === 'implementation_plan' && typeof val === 'object' ? JSON.stringify(val) : val);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(automation.id);

  db.prepare(`UPDATE automations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM automations WHERE id = ?').get(automation.id);
  res.json(updated);
});

// DELETE /api/automations/:id — Eliminar automatización
router.delete('/:id', (req, res) => {
  ensureTable();
  const db = getDb();
  const automation = db.prepare('SELECT * FROM automations WHERE id = ?')
    .get(parseInt(req.params.id));

  if (!automation) {
    return res.status(404).json({ error: 'Automatización no encontrada' });
  }

  db.prepare('DELETE FROM automations WHERE id = ?').run(automation.id);
  res.json({ success: true });
});

export default router;
