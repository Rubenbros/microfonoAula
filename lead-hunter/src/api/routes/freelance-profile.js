import { Router } from 'express';
import { getFreelanceProfile, setFreelanceProfileBulk } from '../../db/database.js';

const router = Router();

// GET /api/freelance/profile
router.get('/', (req, res) => {
  const profile = getFreelanceProfile();
  res.json(profile);
});

// PATCH /api/freelance/profile — Actualizar campos del perfil
router.patch('/', (req, res) => {
  const entries = req.body;
  if (!entries || typeof entries !== 'object' || Object.keys(entries).length === 0) {
    return res.status(400).json({ error: 'Envía un objeto con los campos a actualizar' });
  }
  setFreelanceProfileBulk(entries);
  res.json({ success: true, profile: getFreelanceProfile() });
});

export default router;
