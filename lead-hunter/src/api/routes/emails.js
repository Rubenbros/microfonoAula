import { Router } from 'express';
import { getDb, getEmailOpenStats } from '../../db/database.js';

const router = Router();

// GET /api/emails/stats — Stats de apertura
router.get('/stats', (req, res) => {
  const stats = getEmailOpenStats();
  res.json(stats);
});

// GET /api/emails/recent — Últimos emails enviados
router.get('/recent', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit || '20');

  const emails = db.prepare(`
    SELECT e.*, l.name as lead_name, l.sector, l.zone, l.lead_type
    FROM emails_sent e
    JOIN leads l ON e.lead_id = l.id
    ORDER BY e.sent_at DESC
    LIMIT ?
  `).all(limit);

  res.json(emails);
});

export default router;
