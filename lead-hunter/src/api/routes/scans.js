import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../../db/database.js';
import { scanGoogleMaps, saveResults } from '../../scraper/maps.js';
import { scanAllReddit, saveRedditResults } from '../../scraper/reddit.js';
import { scanGoogleLinkedIn } from '../../scraper/google-linkedin.js';
import { scoreNewLeads } from '../../analyzer/scorer.js';
import {
  createJob, getJob, getAllJobs,
  updateJobProgress, completeJob, failJob,
  isPlaywrightLocked, lockPlaywright, unlockPlaywright,
} from '../jobs.js';
import { createLogger } from '../../logger.js';

const log = createLogger('api-scans');
const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../../config/sectors.json');

// GET /api/scans/config — Zonas y sectores disponibles
router.get('/config', (req, res) => {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    res.json(config);
  } catch (err) {
    log.error(`Error leyendo config: ${err.message}`);
    res.status(500).json({ error: 'Error leyendo configuración' });
  }
});

// GET /api/scans/history — Historial de scans
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 20;
    const scans = db.prepare(
      'SELECT * FROM scans ORDER BY scanned_at DESC LIMIT ?'
    ).all(limit);
    res.json(scans);
  } catch (err) {
    log.error(`Error obteniendo historial: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/jobs — Lista todos los jobs activos
router.get('/jobs', (req, res) => {
  res.json(getAllJobs());
});

// GET /api/scans/jobs/:id — Estado de un job
router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job no encontrado' });
  res.json(job);
});

// POST /api/scans/maps — Lanzar scan Google Maps
router.post('/maps', (req, res) => {
  if (isPlaywrightLocked()) {
    return res.status(409).json({ error: 'Ya hay un scan con navegador en curso. Espera a que termine.' });
  }

  const { zone, sector, maxResults = 20 } = req.body;
  if (!zone || !sector) {
    return res.status(400).json({ error: 'zone y sector son obligatorios' });
  }

  const job = createJob('maps', { zone, sector, maxResults });
  res.status(202).json({ jobId: job.id, message: 'Scan iniciado' });

  // Ejecutar en background
  (async () => {
    lockPlaywright();
    try {
      updateJobProgress(job.id, 'Escaneando Google Maps...');
      const results = await scanGoogleMaps(zone, sector, maxResults);
      updateJobProgress(job.id, `Guardando ${results.length} resultados...`);
      const saved = await saveResults(results, zone, sector);
      completeJob(job.id, {
        found: saved.total,
        new: saved.new,
        duplicates: saved.duplicates,
      });
    } catch (err) {
      failJob(job.id, err);
    } finally {
      unlockPlaywright();
    }
  })();
});

// POST /api/scans/reddit — Lanzar scan Reddit
router.post('/reddit', (req, res) => {
  const job = createJob('reddit', {});
  res.status(202).json({ jobId: job.id, message: 'Scan Reddit iniciado' });

  (async () => {
    try {
      updateJobProgress(job.id, 'Escaneando subreddits...');
      const posts = await scanAllReddit();
      updateJobProgress(job.id, `Guardando ${posts.length} posts...`);
      const saved = await saveRedditResults(posts);
      completeJob(job.id, {
        found: posts.length,
        new: saved.new,
        duplicates: saved.duplicates,
      });
    } catch (err) {
      failJob(job.id, err);
    }
  })();
});

// POST /api/scans/linkedin — Lanzar scan LinkedIn
router.post('/linkedin', (req, res) => {
  if (isPlaywrightLocked()) {
    return res.status(409).json({ error: 'Ya hay un scan con navegador en curso. Espera a que termine.' });
  }

  const job = createJob('linkedin', {});
  res.status(202).json({ jobId: job.id, message: 'Scan LinkedIn iniciado' });

  (async () => {
    lockPlaywright();
    try {
      updateJobProgress(job.id, 'Escaneando Google → LinkedIn...');
      const results = await scanGoogleLinkedIn();
      completeJob(job.id, { found: results?.length || 0 });
    } catch (err) {
      failJob(job.id, err);
    } finally {
      unlockPlaywright();
    }
  })();
});

// POST /api/scans/score — Ejecutar scoring de leads
router.post('/score', (req, res) => {
  const job = createJob('score', {});
  res.status(202).json({ jobId: job.id, message: 'Scoring iniciado' });

  (async () => {
    try {
      updateJobProgress(job.id, 'Analizando y puntuando leads...');
      await scoreNewLeads();
      completeJob(job.id, { message: 'Scoring completado' });
    } catch (err) {
      failJob(job.id, err);
    }
  })();
});

export default router;
