import { Router } from 'express';
import { getSetting, setSetting } from '../../db/database.js';

const router = Router();

// GET /api/settings — Obtener config
router.get('/', (req, res) => {
  res.json({
    emails_paused: getSetting('emails_paused', 'false') === 'true',
    daily_email_limit: parseInt(process.env.DAILY_EMAIL_LIMIT || '30'),
    lead_score_threshold: parseInt(process.env.LEAD_SCORE_THRESHOLD || '50'),
    scan_default_zone: process.env.SCAN_DEFAULT_ZONE || 'Zaragoza',
  });
});

// PATCH /api/settings — Actualizar config
router.patch('/', (req, res) => {
  const { emails_paused } = req.body;

  if (emails_paused !== undefined) {
    setSetting('emails_paused', emails_paused ? 'true' : 'false');
  }

  res.json({ success: true });
});

export default router;
