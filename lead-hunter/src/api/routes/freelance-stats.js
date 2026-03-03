import { Router } from 'express';
import { getFreelanceStats } from '../../db/database.js';

const router = Router();

// GET /api/freelance/stats/dashboard
router.get('/dashboard', (req, res) => {
  const stats = getFreelanceStats();
  res.json(stats);
});

export default router;
