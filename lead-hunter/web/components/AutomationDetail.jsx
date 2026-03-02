'use client';

import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles, Play, SkipForward, RotateCcw, Loader2,
  CheckCircle2, XCircle, Circle, Clock,
  Search, Code, Settings, TestTube2, Rocket, ListTodo,
  ChevronDown, ChevronRight, TrendingUp, Zap, AlertCircle,
} from 'lucide-react';

const categoryConfig = {
  saas: { label: 'SaaS', color: 'bg-blue-500/20 text-blue-400' },
  service: { label: 'Servicio', color: 'bg-green-500/20 text-green-400' },
  tool: { label: 'Herramienta', color: 'bg-purple-500/20 text-purple-400' },
  content: { label: 'Contenido', color: 'bg-yellow-500/20 text-yellow-400' },
  marketplace: { label: 'Marketplace', color: 'bg-pink-500/20 text-pink-400' },
  automation: { label: 'Automatización', color: 'bg-cyan-500/20 text-cyan-400' },
};

const statusConfig = {
  idea: { label: 'Idea', color: 'bg-gray-500/20 text-gray-400' },
  evaluating: { label: 'Evaluando', color: 'bg-yellow-500/20 text-yellow-400' },
  in_progress: { label: 'En desarrollo', color: 'bg-blue-500/20 text-blue-400' },
  launched: { label: 'Lanzado', color: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Pausado', color: 'bg-orange-500/20 text-orange-400' },
  discarded: { label: 'Descartado', color: 'bg-red-500/20 text-red-400' },
  rejected: { label: 'Rechazada', color: 'bg-red-500/20 text-red-400' },
};

const taskTypeConfig = {
  research: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Investigación' },
  code: { icon: Code, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Código' },
  config: { icon: Settings, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Configuración' },
  test: { icon: TestTube2, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Testing' },
  deploy: { icon: Rocket, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Despliegue' },
  general: { icon: ListTodo, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'General' },
};

const taskStatusConfig = {
  pending: { icon: Circle, color: 'text-gray-500', label: 'Pendiente' },
  running: { icon: Loader2, color: 'text-blue-400', spin: true, label: 'Ejecutando...' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completada' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Fallida' },
  skipped: { icon: SkipForward, color: 'text-gray-600', label: 'Omitida' },
};

export default function AutomationDetail({ automation, initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [generating, setGenerating] = useState(false);
  const [executingTask, setExecutingTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/automations/${automation.id}/tasks`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {}
  }, [automation.id]);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function pollJob(jobId, onComplete) {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/jobs/${jobId}`);
        const job = await res.json();

        if (job.status === 'completed') {
          stopPolling();
          await refreshTasks();
          onComplete?.(job);
        } else if (job.status === 'failed') {
          stopPolling();
          setError(job.error || 'Error desconocido');
          await refreshTasks();
          onComplete?.(job);
        }
      } catch {
        stopPolling();
      }
    }, 3000);
  }

  async function generateTasks() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${automation.id}/tasks/generate`, { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setGenerating(false);
        return;
      }

      if (data.jobId) {
        pollJob(data.jobId, () => setGenerating(false));
      } else {
        await refreshTasks();
        setGenerating(false);
      }
    } catch (err) {
      setError(err.message || 'Error al generar tareas');
      setGenerating(false);
    }
  }

  async function executeTask(taskId) {
    setExecutingTask(taskId);
    setError(null);

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'running' } : t));

    try {
      const res = await fetch(`/api/tasks/${taskId}/execute`, { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setExecutingTask(null);
        await refreshTasks();
        return;
      }

      if (data.jobId) {
        pollJob(data.jobId, () => {
          setExecutingTask(null);
          setExpandedTask(taskId);
        });
      }
    } catch (err) {
      setError(err.message);
      setExecutingTask(null);
      await refreshTasks();
    }
  }

  async function skipTask(taskId) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      });
      await refreshTasks();
    } catch {}
  }

  return (
    <div>
      {/* Header de la idea */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-white">{automation.title}</h1>
              {automation.category && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryConfig[automation.category]?.color || ''}`}>
                  {categoryConfig[automation.category]?.label || automation.category}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig[automation.status]?.color || ''}`}>
                {statusConfig[automation.status]?.label || automation.status}
              </span>
            </div>
            <p className="text-sm text-gray-400">{automation.description}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Inversión</p>
            <p className="text-white font-medium flex items-center gap-1">
              <Zap size={14} className="text-yellow-400" />
              {automation.investment_estimate ? `${automation.investment_estimate}€` : '?'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Revenue/mes</p>
            <p className="text-green-400 font-medium flex items-center gap-1">
              <TrendingUp size={14} />
              {automation.monthly_revenue_estimate ? `${automation.monthly_revenue_estimate}€` : '?'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Tiempo</p>
            <p className="text-gray-300 flex items-center gap-1">
              <Clock size={14} className="text-gray-500" />
              {automation.time_to_launch || '?'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Dificultad</p>
            <p className={clsx(
              'font-medium',
              automation.difficulty === 'baja' && 'text-green-400',
              automation.difficulty === 'media' && 'text-yellow-400',
              automation.difficulty === 'alta' && 'text-red-400',
              !automation.difficulty && 'text-gray-400',
            )}>
              {automation.difficulty || '?'}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      {tasks.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">
              Progreso: {completedCount}/{tasks.length} tareas
            </p>
            <p className="text-sm font-medium text-white">{progress}%</p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-medium">Error</p>
            <p className="text-sm text-red-300/70">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 ml-auto text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* Botón generar tareas */}
      {tasks.length === 0 && (
        <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800 mb-6">
          <Sparkles size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 mb-1">No hay tareas todavía</p>
          <p className="text-sm text-gray-600 mb-6">Claude Code analizará el plan y lo desglosará en tareas ejecutables</p>
          <button
            onClick={generateTasks}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Claude Code está trabajando...' : 'Generar tareas con IA'}
          </button>
        </div>
      )}

      {/* Botón regenerar */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tareas</h2>
          <button
            onClick={generateTasks}
            disabled={generating || executingTask !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Regenerar tareas
          </button>
        </div>
      )}

      {/* Lista de tareas */}
      <div className="space-y-2">
        {tasks.map(task => {
          const isExpanded = expandedTask === task.id;
          const typeConf = taskTypeConfig[task.task_type] || taskTypeConfig.general;
          const statusConf = taskStatusConfig[task.status] || taskStatusConfig.pending;
          const TypeIcon = typeConf.icon;
          const StatusIcon = statusConf.icon;
          const canExecute = (task.status === 'pending' || task.status === 'failed') && executingTask === null && !generating;

          return (
            <div
              key={task.id}
              className={clsx(
                'bg-gray-900 rounded-xl border overflow-hidden transition-colors',
                task.status === 'running' ? 'border-blue-500/30' :
                task.status === 'completed' ? 'border-green-500/20' :
                task.status === 'failed' ? 'border-red-500/20' :
                'border-gray-800'
              )}
            >
              {/* Task header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Step number */}
                  <span className="text-xs text-gray-600 font-mono w-6 text-center shrink-0">
                    {task.step_number}
                  </span>

                  {/* Type icon */}
                  <div className={`p-1.5 rounded-lg ${typeConf.bg} shrink-0`}>
                    <TypeIcon size={14} className={typeConf.color} />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{task.title}</p>
                    <p className="text-[10px] text-gray-500">{typeConf.label}</p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusIcon size={16} className={clsx(statusConf.color, statusConf.spin && 'animate-spin')} />
                    <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {canExecute && (
                      <button
                        onClick={() => executeTask(task.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Play size={12} />
                        Ejecutar
                      </button>
                    )}
                    {task.status === 'pending' && (
                      <button
                        onClick={() => skipTask(task.id)}
                        className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
                        title="Omitir tarea"
                      >
                        <SkipForward size={14} />
                      </button>
                    )}
                  </div>

                  {/* Expand icon */}
                  {isExpanded
                    ? <ChevronDown size={16} className="text-gray-600 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-600 shrink-0" />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                  {/* Description */}
                  {task.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase mb-1">Descripción</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}

                  {/* Result */}
                  {task.result && (
                    <div className="mb-3">
                      <p className="text-xs text-green-400/70 uppercase mb-1">Resultado</p>
                      <pre className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3 max-h-80 overflow-auto whitespace-pre-wrap font-sans">
                        {task.result}
                      </pre>
                    </div>
                  )}

                  {/* Error */}
                  {task.error && (
                    <div className="mb-3">
                      <p className="text-xs text-red-400/70 uppercase mb-1">Error</p>
                      <pre className="text-sm text-red-300 bg-red-500/10 rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap font-sans">
                        {task.error}
                      </pre>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex gap-4 text-[10px] text-gray-600">
                    {task.started_at && <span>Inicio: {new Date(task.started_at).toLocaleString('es-ES')}</span>}
                    {task.completed_at && <span>Fin: {new Date(task.completed_at).toLocaleString('es-ES')}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
