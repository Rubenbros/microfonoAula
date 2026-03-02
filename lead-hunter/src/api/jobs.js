import { createLogger } from '../logger.js';

const log = createLogger('jobs');

// Jobs en memoria (Map)
const jobs = new Map();
let nextId = 1;

const JOB_TTL = 24 * 60 * 60 * 1000; // 24h

/**
 * Crea un nuevo job
 */
export function createJob(type, params = {}) {
  cleanup();
  const id = String(nextId++);
  const job = {
    id,
    type,
    params,
    status: 'pending',
    progress: null,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  log.info(`Job #${id} creado (${type})`);
  return job;
}

/**
 * Obtiene un job por ID
 */
export function getJob(id) {
  return jobs.get(String(id)) || null;
}

/**
 * Lista todos los jobs
 */
export function getAllJobs() {
  cleanup();
  return Array.from(jobs.values()).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Actualiza progreso de un job
 */
export function updateJobProgress(id, progress) {
  const job = jobs.get(String(id));
  if (!job) return;
  job.progress = progress;
  job.status = 'running';
  job.updatedAt = new Date().toISOString();
}

/**
 * Marca job como completado
 */
export function completeJob(id, result) {
  const job = jobs.get(String(id));
  if (!job) return;
  job.status = 'completed';
  job.result = result;
  job.updatedAt = new Date().toISOString();
  log.info(`Job #${id} completado`);
}

/**
 * Marca job como fallido
 */
export function failJob(id, error) {
  const job = jobs.get(String(id));
  if (!job) return;
  job.status = 'failed';
  job.error = typeof error === 'string' ? error : error.message;
  job.updatedAt = new Date().toISOString();
  log.error(`Job #${id} fallido: ${job.error}`);
}

/**
 * Limpia jobs antiguos (>24h)
 */
function cleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - new Date(job.createdAt).getTime() > JOB_TTL) {
      jobs.delete(id);
    }
  }
}

// Lock para scans que usan Playwright (solo 1 a la vez)
let playwrightLocked = false;

export function isPlaywrightLocked() {
  return playwrightLocked;
}

export function lockPlaywright() {
  playwrightLocked = true;
}

export function unlockPlaywright() {
  playwrightLocked = false;
}
