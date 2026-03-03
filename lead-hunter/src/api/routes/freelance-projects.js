import { Router } from 'express';
import {
  getFreelanceProjects, getFreelanceProjectById, insertFreelanceProject,
  updateFreelanceProject, deleteFreelanceProject, getFreelanceClientById,
  insertFreelanceMilestone, updateFreelanceMilestone, deleteFreelanceMilestone,
  getTimeEntries, getActiveTimer, getAnyActiveTimer, startTimer, stopTimer, deleteTimeEntry
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/projects
router.get('/', (req, res) => {
  const { status, client_id, service_type, search, page, limit } = req.query;
  const result = getFreelanceProjects({ status, client_id, service_type, search, page, limit });
  res.json(result);
});

// GET /api/freelance/projects/:id
router.get('/:id', (req, res) => {
  const project = getFreelanceProjectById(parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(project);
});

// POST /api/freelance/projects
router.post('/', (req, res) => {
  const { client_id, name } = req.body;
  if (!client_id || !name) return res.status(400).json({ error: 'client_id y name son obligatorios' });

  const client = getFreelanceClientById(parseInt(client_id));
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const result = insertFreelanceProject(req.body);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// PATCH /api/freelance/projects/:id
router.patch('/:id', (req, res) => {
  const project = getFreelanceProjectById(parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  updateFreelanceProject(parseInt(req.params.id), req.body);
  res.json({ success: true, project: getFreelanceProjectById(parseInt(req.params.id)) });
});

// DELETE /api/freelance/projects/:id
router.delete('/:id', (req, res) => {
  const project = getFreelanceProjectById(parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  deleteFreelanceProject(parseInt(req.params.id));
  res.json({ success: true });
});

// POST /api/freelance/projects/:id/milestones
router.post('/:id/milestones', (req, res) => {
  const project = getFreelanceProjectById(parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title es obligatorio' });

  const result = insertFreelanceMilestone({ project_id: parseInt(req.params.id), ...req.body });
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// PATCH /api/freelance/milestones/:id
router.patch('/milestones/:id', (req, res) => {
  updateFreelanceMilestone(parseInt(req.params.id), req.body);
  res.json({ success: true });
});

// DELETE /api/freelance/milestones/:id
router.delete('/milestones/:id', (req, res) => {
  deleteFreelanceMilestone(parseInt(req.params.id));
  res.json({ success: true });
});

// === TIMER DE HORAS ===

// GET /api/freelance/projects/timer/active — Timer activo global
router.get('/timer/active', (req, res) => {
  const active = getAnyActiveTimer();
  res.json({ active: active || null });
});

// GET /api/freelance/projects/:id/time — Entradas de tiempo del proyecto
router.get('/:id/time', (req, res) => {
  const result = getTimeEntries(parseInt(req.params.id), req.query);
  const active = getActiveTimer(parseInt(req.params.id));
  res.json({ ...result, activeTimer: active || null });
});

// POST /api/freelance/projects/:id/timer/start — Iniciar timer
router.post('/:id/timer/start', (req, res) => {
  const project = getFreelanceProjectById(parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const result = startTimer(parseInt(req.params.id), req.body.description);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// POST /api/freelance/projects/:id/timer/stop — Parar timer
router.post('/:id/timer/stop', (req, res) => {
  const active = getActiveTimer(parseInt(req.params.id));
  if (!active) return res.status(400).json({ error: 'No hay timer activo en este proyecto' });

  const entry = stopTimer(active.id);
  res.json({ success: true, entry });
});

// DELETE /api/freelance/projects/time/:id — Eliminar entrada de tiempo
router.delete('/time/:id', (req, res) => {
  deleteTimeEntry(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;
