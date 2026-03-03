import { Router } from 'express';
import {
  getPlatformBalances, getPlatformBalance, upsertPlatformBalance,
  addPlatformCredits, getPlatformCreditHistory
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/platforms — Todos los balances
router.get('/', (req, res) => {
  const balances = getPlatformBalances();
  res.json(balances);
});

// GET /api/freelance/platforms/:platform — Balance de una plataforma
router.get('/:platform', (req, res) => {
  const balance = getPlatformBalance(req.params.platform);
  if (!balance) return res.status(404).json({ error: 'Plataforma no encontrada' });

  const history = getPlatformCreditHistory(req.params.platform, 20);
  res.json({ balance, history });
});

// POST /api/freelance/platforms — Crear/actualizar plataforma
router.post('/', (req, res) => {
  const { platform } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform es obligatorio' });

  upsertPlatformBalance(req.body);
  res.json({ success: true, balance: getPlatformBalance(platform) });
});

// POST /api/freelance/platforms/:platform/refill — Añadir créditos
router.post('/:platform/refill', (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount debe ser > 0' });

  const balance = getPlatformBalance(req.params.platform);
  if (!balance) return res.status(404).json({ error: 'Plataforma no encontrada' });

  const newBalance = addPlatformCredits(req.params.platform, amount, description || 'Recarga manual');
  res.json({ success: true, credits_balance: newBalance });
});

// GET /api/freelance/platforms/:platform/history — Historial de transacciones
router.get('/:platform/history', (req, res) => {
  const { limit = 50 } = req.query;
  const history = getPlatformCreditHistory(req.params.platform, parseInt(limit));
  res.json(history);
});

export default router;
