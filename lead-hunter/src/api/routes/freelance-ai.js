import { Router } from 'express';
import { getFreelanceOpportunityById, updateFreelanceOpportunity } from '../../db/database.js';
import { generateFreelanceProposal } from '../../ai/freelance-proposal.js';
import { generateCoverLetter } from '../../ai/cover-letter.js';
import { analyzeOpportunity } from '../../ai/opportunity-analyzer.js';
import { suggestPricing } from '../../ai/pricing-advisor.js';
import { createLogger } from '../../logger.js';

const log = createLogger('api-freelance-ai');
const router = Router();

// POST /api/freelance/ai/proposal — Genera propuesta para oportunidad
router.post('/proposal', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    if (!opportunityId) {
      return res.status(400).json({ error: 'opportunityId es obligatorio' });
    }

    const opp = getFreelanceOpportunityById(parseInt(opportunityId));
    if (!opp) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    const proposal = await generateFreelanceProposal(opp);

    // Guardar la propuesta en la oportunidad
    updateFreelanceOpportunity(opp.id, { proposal_text: proposal });

    log.info(`Propuesta generada para oportunidad #${opp.id}`);
    res.json({ proposal, opportunityId: opp.id });
  } catch (err) {
    log.error(`Error generando propuesta: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/freelance/ai/cover-letter — Genera cover letter
router.post('/cover-letter', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    if (!opportunityId) {
      return res.status(400).json({ error: 'opportunityId es obligatorio' });
    }

    const opp = getFreelanceOpportunityById(parseInt(opportunityId));
    if (!opp) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    const coverLetter = await generateCoverLetter(opp);

    log.info(`Cover letter generada para oportunidad #${opp.id}`);
    res.json({ coverLetter, opportunityId: opp.id });
  } catch (err) {
    log.error(`Error generando cover letter: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/freelance/ai/analyze — Analiza oportunidad
router.post('/analyze', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    if (!opportunityId) {
      return res.status(400).json({ error: 'opportunityId es obligatorio' });
    }

    const opp = getFreelanceOpportunityById(parseInt(opportunityId));
    if (!opp) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    const analysis = await analyzeOpportunity(opp);

    log.info(`Análisis completado para oportunidad #${opp.id}`);
    res.json({ analysis, opportunityId: opp.id });
  } catch (err) {
    log.error(`Error analizando oportunidad: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/freelance/ai/pricing — Sugiere pricing
router.post('/pricing', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    if (!opportunityId) {
      return res.status(400).json({ error: 'opportunityId es obligatorio' });
    }

    const opp = getFreelanceOpportunityById(parseInt(opportunityId));
    if (!opp) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    const pricing = await suggestPricing(opp);

    log.info(`Pricing sugerido para oportunidad #${opp.id}`);
    res.json({ pricing, opportunityId: opp.id });
  } catch (err) {
    log.error(`Error sugiriendo pricing: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
