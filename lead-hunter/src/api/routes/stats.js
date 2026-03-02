import { Router } from 'express';
import { getDb, getLeadStats, getEmailOpenStats, getDemoVisitStats } from '../../db/database.js';

const router = Router();

// GET /api/stats/overview — Estadísticas generales
router.get('/overview', (req, res) => {
  const stats = getLeadStats();

  let emailOpenStats = { total: 0, opened: 0, openedToday: 0, rate: '0.0' };
  try { emailOpenStats = getEmailOpenStats(); } catch {}

  let demoStats = { totalDemos: 0, demosVisited: 0, totalVisits: 0, recentVisits: [] };
  try { demoStats = getDemoVisitStats(); } catch {}

  const db = getDb();
  const emailsToday = db.prepare(
    "SELECT COUNT(*) as c FROM emails_sent WHERE DATE(sent_at) = DATE('now')"
  ).get().c;

  res.json({
    leads: stats,
    emails: { sentToday: emailsToday, ...emailOpenStats },
    demos: demoStats,
  });
});

// GET /api/stats/timeline?days=28 — Leads por día
router.get('/timeline', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days || '28');

  const data = db.prepare(`
    SELECT DATE(found_at) as date, COUNT(*) as count
    FROM leads
    WHERE found_at >= datetime('now', '-${days} days')
    GROUP BY DATE(found_at)
    ORDER BY date ASC
  `).all();

  const emailData = db.prepare(`
    SELECT DATE(sent_at) as date, COUNT(*) as count
    FROM emails_sent
    WHERE sent_at >= datetime('now', '-${days} days')
    GROUP BY DATE(sent_at)
    ORDER BY date ASC
  `).all();

  res.json({ leads: data, emails: emailData });
});

// GET /api/stats/conversion — Funnel de conversión
router.get('/conversion', (req, res) => {
  const db = getDb();

  const funnel = {
    new: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'new'").get().c,
    contacted: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'contacted'").get().c,
    replied: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'replied'").get().c,
    meeting: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'meeting'").get().c,
    client: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'client'").get().c,
    discarded: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'discarded'").get().c,
  };

  res.json(funnel);
});

// GET /api/stats/by-sector — Desglose por sector
router.get('/by-sector', (req, res) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT sector, COUNT(*) as total,
      SUM(CASE WHEN lead_tier = 'hot' THEN 1 ELSE 0 END) as hot,
      SUM(CASE WHEN status = 'client' THEN 1 ELSE 0 END) as clients,
      ROUND(AVG(lead_score), 1) as avg_score
    FROM leads
    WHERE sector IS NOT NULL
    GROUP BY sector
    ORDER BY total DESC
  `).all();

  res.json(data);
});

// GET /api/stats/by-source — Desglose por fuente
router.get('/by-source', (req, res) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT source, COUNT(*) as total,
      SUM(CASE WHEN lead_tier = 'hot' THEN 1 ELSE 0 END) as hot,
      SUM(CASE WHEN status = 'client' THEN 1 ELSE 0 END) as clients,
      ROUND(AVG(lead_score), 1) as avg_score
    FROM leads
    GROUP BY source
    ORDER BY total DESC
  `).all();

  res.json(data);
});

export default router;
