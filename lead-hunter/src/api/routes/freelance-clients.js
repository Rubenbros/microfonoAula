import { Router } from 'express';
import {
  getFreelanceClients, getFreelanceClientById, insertFreelanceClient,
  updateFreelanceClient, deleteFreelanceClient, getDb
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/clients
router.get('/', (req, res) => {
  const { status, source, search, page, limit } = req.query;
  const result = getFreelanceClients({ status, source, search, page, limit });
  res.json(result);
});

// GET /api/freelance/clients/:id
router.get('/:id', (req, res) => {
  const client = getFreelanceClientById(parseInt(req.params.id));
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const db = getDb();
  const projects = db.prepare('SELECT * FROM freelance_projects WHERE client_id = ? ORDER BY updated_at DESC').all(client.id);
  const finances = db.prepare('SELECT * FROM freelance_finances WHERE client_id = ? ORDER BY date DESC LIMIT 20').all(client.id);

  // Parsear tags
  if (client.tags) {
    try { client.tags = JSON.parse(client.tags); } catch { client.tags = []; }
  }

  res.json({ client, projects, finances });
});

// POST /api/freelance/clients
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const result = insertFreelanceClient(req.body);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// PATCH /api/freelance/clients/:id
router.patch('/:id', (req, res) => {
  const client = getFreelanceClientById(parseInt(req.params.id));
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  updateFreelanceClient(client.id, req.body);
  res.json({ success: true, client: getFreelanceClientById(client.id) });
});

// DELETE /api/freelance/clients/:id
router.delete('/:id', (req, res) => {
  const client = getFreelanceClientById(parseInt(req.params.id));
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  deleteFreelanceClient(client.id);
  res.json({ success: true });
});

export default router;
