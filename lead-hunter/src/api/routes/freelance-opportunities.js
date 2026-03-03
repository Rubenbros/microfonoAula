import { Router } from 'express';
import {
  getFreelanceOpportunities, getFreelanceOpportunityById,
  updateFreelanceOpportunity, spendPlatformCredits, getPlatformBalance
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/opportunities
router.get('/', (req, res) => {
  const { platform, status, min_score, category, search, page, limit } = req.query;
  const result = getFreelanceOpportunities({ platform, status, min_score, category, search, page, limit });
  res.json(result);
});

// GET /api/freelance/opportunities/:id
router.get('/:id', (req, res) => {
  const opp = getFreelanceOpportunityById(parseInt(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Oportunidad no encontrada' });

  // Parsear JSON fields
  if (opp.skills_required) {
    try { opp.skills_required = JSON.parse(opp.skills_required); } catch { opp.skills_required = []; }
  }
  if (opp.match_reasons) {
    try { opp.match_reasons = JSON.parse(opp.match_reasons); } catch { opp.match_reasons = []; }
  }

  // Info del balance de la plataforma
  const platformBalance = getPlatformBalance(opp.platform);

  res.json({ opportunity: opp, platformBalance });
});

// PATCH /api/freelance/opportunities/:id
router.patch('/:id', (req, res) => {
  const opp = getFreelanceOpportunityById(parseInt(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Oportunidad no encontrada' });

  updateFreelanceOpportunity(parseInt(req.params.id), req.body);
  res.json({ success: true, opportunity: getFreelanceOpportunityById(parseInt(req.params.id)) });
});

// POST /api/freelance/opportunities/:id/apply — Marcar como aplicado + gastar créditos
router.post('/:id/apply', (req, res) => {
  const opp = getFreelanceOpportunityById(parseInt(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Oportunidad no encontrada' });

  const { proposal_text, credits_cost } = req.body;

  // Gastar créditos si aplica
  if (credits_cost && credits_cost > 0) {
    const balance = getPlatformBalance(opp.platform);
    if (!balance || balance.credits_balance < credits_cost) {
      return res.status(400).json({
        error: `Créditos insuficientes en ${opp.platform}. Tienes ${balance?.credits_balance || 0}, necesitas ${credits_cost}`,
      });
    }
    spendPlatformCredits(opp.platform, credits_cost, opp.id, `Aplicación: ${opp.title.substring(0, 50)}`);
  }

  updateFreelanceOpportunity(opp.id, {
    status: 'applied',
    applied_at: new Date().toISOString(),
    proposal_text: proposal_text || null,
  });

  res.json({ success: true, opportunity: getFreelanceOpportunityById(opp.id) });
});

export default router;
