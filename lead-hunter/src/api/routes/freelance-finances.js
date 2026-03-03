import { Router } from 'express';
import {
  getFreelanceFinances, getFreelanceFinanceSummary,
  insertFreelanceFinance, updateFreelanceFinance, deleteFreelanceFinance
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/finances
router.get('/', (req, res) => {
  const { type, category, date_from, date_to, project_id, client_id, page, limit } = req.query;
  const result = getFreelanceFinances({ type, category, date_from, date_to, project_id, client_id, page, limit });
  res.json(result);
});

// GET /api/freelance/finances/summary
router.get('/summary', (req, res) => {
  const { period = 'month' } = req.query;
  const summary = getFreelanceFinanceSummary(period);
  res.json(summary);
});

// GET /api/freelance/finances/export — Export CSV
router.get('/export', (req, res) => {
  const { type, category, date_from, date_to } = req.query;
  const { finances } = getFreelanceFinances({ type, category, date_from, date_to, limit: 10000 });

  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Importe', 'Moneda', 'Deducible', 'Cliente', 'Proyecto'];
  const rows = finances.map(f => [
    f.date, f.type, f.category, `"${(f.description || '').replace(/"/g, '""')}"`,
    f.amount, f.currency || 'EUR', f.tax_deductible ? 'Sí' : 'No',
    f.client_name || '', f.project_name || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="finanzas_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + csv); // BOM for Excel compatibility
});

// POST /api/freelance/finances
router.post('/', (req, res) => {
  const { type, category, amount, date } = req.body;
  if (!type || !category || amount === undefined || !date) {
    return res.status(400).json({ error: 'type, category, amount y date son obligatorios' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser income o expense' });
  }

  const result = insertFreelanceFinance(req.body);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// PATCH /api/freelance/finances/:id
router.patch('/:id', (req, res) => {
  updateFreelanceFinance(parseInt(req.params.id), req.body);
  res.json({ success: true });
});

// DELETE /api/freelance/finances/:id
router.delete('/:id', (req, res) => {
  deleteFreelanceFinance(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;
