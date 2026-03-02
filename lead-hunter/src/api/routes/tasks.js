import { Router } from 'express';
import { getDb, getTasksByAutomation, getTaskById, insertTask, updateTaskStatus, deleteTasksByAutomation } from '../../db/database.js';
import { askClaude, askClaudeJSON } from '../../ai/claude.js';
import { createJob, getJob, updateJobProgress, completeJob, failJob } from '../jobs.js';
import { createLogger } from '../../logger.js';

const log = createLogger('api-tasks');
const router = Router();

// Lock para evitar múltiples ejecuciones de Claude simultáneas
let claudeLocked = false;

// GET /api/automations/:id/tasks — Listar tareas de una idea
router.get('/automations/:id/tasks', (req, res) => {
  const tasks = getTasksByAutomation(parseInt(req.params.id));
  res.json({ tasks });
});

// POST /api/automations/:id/tasks/generate — Claude descompone el plan en tareas
router.post('/automations/:id/tasks/generate', (req, res) => {
  const db = getDb();
  const automation = db.prepare('SELECT * FROM automations WHERE id = ?')
    .get(parseInt(req.params.id));

  if (!automation) {
    return res.status(404).json({ error: 'Automatización no encontrada' });
  }

  if (claudeLocked) {
    return res.status(409).json({ error: 'Claude Code está ocupado con otra tarea. Espera a que termine.' });
  }

  const job = createJob('task_generation', { automationId: automation.id });
  res.status(202).json({ jobId: job.id });

  // Ejecución en background
  (async () => {
    claudeLocked = true;
    try {
      updateJobProgress(job.id, 'Analizando plan de implementación...');

      // Parsear plan existente
      let plan = [];
      try {
        plan = typeof automation.implementation_plan === 'string'
          ? JSON.parse(automation.implementation_plan)
          : automation.implementation_plan || [];
      } catch { plan = []; }

      if (plan.length === 0) {
        throw new Error('La idea no tiene plan de implementación');
      }

      // Borrar tareas anteriores si existen
      deleteTasksByAutomation(automation.id);

      updateJobProgress(job.id, 'Claude Code está desglosando el plan en tareas...');

      const prompt = `Eres el gestor de proyectos de T800 Labs (desarrollo web, apps e IA en Zaragoza).

IDEA DE NEGOCIO: "${automation.title}"
DESCRIPCIÓN: ${automation.description || 'Sin descripción'}
CATEGORÍA: ${automation.category || 'general'}
DIFICULTAD: ${automation.difficulty || 'media'}
INVERSIÓN ESTIMADA: ${automation.investment_estimate || '?'}€

PLAN DE IMPLEMENTACIÓN ORIGINAL:
${plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Desglosa este plan en tareas concretas y ejecutables. Para cada tarea incluye:
- title: nombre corto y descriptivo (máximo 60 caracteres)
- description: descripción detallada de qué hay que hacer, con suficiente contexto para que un desarrollador o investigador pueda ejecutarlo. Incluye herramientas, tecnologías, pasos específicos.
- task_type: uno de "research", "code", "config", "test", "deploy", "general"

Reglas:
- Mínimo 3 tareas, máximo 12
- Ordénalas por dependencia (lo que se necesita primero va antes)
- Cada tarea debe ser independientemente ejecutable una vez completadas las anteriores
- Sé práctico y concreto, no genérico

Devuelve un JSON array de objetos con los campos: title, description, task_type`;

      const tasks = await askClaudeJSON(prompt);

      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Claude no devolvió un array de tareas válido');
      }

      updateJobProgress(job.id, `Guardando ${tasks.length} tareas...`);

      // Insertar tareas
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        insertTask({
          automation_id: automation.id,
          step_number: i + 1,
          title: (task.title || `Tarea ${i + 1}`).substring(0, 100),
          description: task.description || null,
          task_type: ['research', 'code', 'config', 'test', 'deploy', 'general'].includes(task.task_type)
            ? task.task_type : 'general',
        });
      }

      // Actualizar automation a in_progress
      db.prepare("UPDATE automations SET status = 'in_progress', progress = 0, updated_at = datetime('now') WHERE id = ?")
        .run(automation.id);

      completeJob(job.id, { tasksCreated: tasks.length });
      log.info(`${tasks.length} tareas generadas para automation #${automation.id}`);

    } catch (err) {
      log.error(`Error generando tareas: ${err.message}`);
      failJob(job.id, err);
    } finally {
      claudeLocked = false;
    }
  })();
});

// POST /api/tasks/:taskId/execute — Ejecutar una tarea con Claude Code
router.post('/tasks/:taskId/execute', (req, res) => {
  const task = getTaskById(parseInt(req.params.taskId));
  if (!task) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  if (task.status === 'running') {
    return res.status(409).json({ error: 'Esta tarea ya se está ejecutando' });
  }

  if (claudeLocked) {
    return res.status(409).json({ error: 'Claude Code está ocupado con otra tarea. Espera a que termine.' });
  }

  const db = getDb();
  const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(task.automation_id);
  if (!automation) {
    return res.status(404).json({ error: 'Automatización padre no encontrada' });
  }

  const job = createJob('task_execution', { taskId: task.id, automationId: automation.id });
  res.status(202).json({ jobId: job.id });

  // Ejecución en background
  (async () => {
    claudeLocked = true;
    try {
      // Marcar tarea como running
      updateTaskStatus(task.id, 'running');
      updateJobProgress(job.id, `Ejecutando: ${task.title}...`);

      // Obtener contexto de tareas previas completadas
      const allTasks = getTasksByAutomation(automation.id);
      const completedTasks = allTasks.filter(t => t.status === 'completed');

      let contextPrev = 'Ninguna todavía (esta es la primera tarea)';
      if (completedTasks.length > 0) {
        contextPrev = completedTasks.map(t =>
          `- ${t.title}: ${(t.result || 'Completada sin detalles').substring(0, 300)}`
        ).join('\n');
      }

      const prompt = `Eres un desarrollador/consultor senior de T800 Labs (desarrollo web, apps e IA en Zaragoza).

PROYECTO: ${automation.title}
DESCRIPCIÓN: ${automation.description || 'Sin descripción'}
CATEGORÍA: ${automation.category || 'general'}

CONTEXTO — Tareas anteriores completadas:
${contextPrev}

TAREA ACTUAL (#${task.step_number}): ${task.title}
TIPO: ${task.task_type}
DESCRIPCIÓN DETALLADA:
${task.description || 'Sin descripción adicional'}

Ejecuta esta tarea. Proporciona:
1. Un resumen claro de lo que has investigado/analizado/decidido
2. Resultados concretos: datos, recomendaciones, código, configuraciones, o pasos específicos
3. Conclusiones y siguientes pasos si los hay

Sé detallado y práctico. Tu respuesta será guardada como resultado de esta tarea y servirá de contexto para las siguientes.`;

      const result = await askClaude(prompt, { timeout: 300000 });

      // Guardar resultado
      updateTaskStatus(task.id, 'completed', result);
      updateJobProgress(job.id, 'Actualizando progreso...');

      // Recalcular progreso de la automation
      const updatedTasks = getTasksByAutomation(automation.id);
      const done = updatedTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
      const progress = Math.round((done / updatedTasks.length) * 100);

      const newStatus = progress >= 100 ? 'launched' : 'in_progress';
      db.prepare('UPDATE automations SET progress = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(progress, newStatus, automation.id);

      completeJob(job.id, { taskId: task.id, progress });
      log.info(`Tarea #${task.id} completada (progress: ${progress}%)`);

    } catch (err) {
      log.error(`Error ejecutando tarea #${task.id}: ${err.message}`);
      updateTaskStatus(task.id, 'failed', null, err.message);
      failJob(job.id, err);
    } finally {
      claudeLocked = false;
    }
  })();
});

// PATCH /api/tasks/:taskId — Actualizar tarea manualmente
router.patch('/tasks/:taskId', (req, res) => {
  const task = getTaskById(parseInt(req.params.taskId));
  if (!task) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  const { status, result, notes } = req.body;

  if (status) {
    updateTaskStatus(task.id, status, result || null, null);

    // Recalcular progreso
    const db = getDb();
    const allTasks = getTasksByAutomation(task.automation_id);
    const done = allTasks.filter(t => {
      const s = t.id === task.id ? status : t.status;
      return s === 'completed' || s === 'skipped';
    }).length;
    const progress = Math.round((done / allTasks.length) * 100);

    const newStatus = progress >= 100 ? 'launched' : 'in_progress';
    db.prepare("UPDATE automations SET progress = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(progress, newStatus, task.automation_id);
  }

  res.json({ success: true, task: getTaskById(task.id) });
});

// GET /api/tasks/jobs/:jobId — Estado del job
router.get('/tasks/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job no encontrado' });
  }
  res.json(job);
});

export default router;
