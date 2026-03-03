'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Clock, Calendar, ExternalLink, Plus, Check, Play, Square, Trash2 } from 'lucide-react';

const statusColors = {
  proposal: 'bg-gray-500/20 text-gray-400', negotiation: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400', delivered: 'bg-purple-500/20 text-purple-400',
  paid: 'bg-emerald-500/20 text-emerald-400', closed: 'bg-gray-700/20 text-gray-500',
  cancelled: 'bg-red-500/20 text-red-400',
};

const milestoneStatusColors = {
  pending: 'text-gray-500', in_progress: 'text-blue-400', delivered: 'text-purple-400',
  approved: 'text-yellow-400', paid: 'text-emerald-400',
};

export default function ProjectDetail({ project: initial }) {
  const [project, setProject] = useState(initial);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', amount: '', due_date: '' });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerDesc, setTimerDesc] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    loadTimeEntries();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (activeTimer) {
      const startedAt = new Date(activeTimer.started_at).getTime();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
  }, [activeTimer]);

  async function loadTimeEntries() {
    try {
      const res = await fetch(`/api/freelance/projects/${initial.id}/time`);
      if (res.ok) {
        const data = await res.json();
        setTimeEntries(data.entries || []);
        setActiveTimer(data.active || null);
      }
    } catch {}
  }

  async function startTimer() {
    try {
      await fetch(`/api/freelance/projects/${initial.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', description: timerDesc }),
      });
      setTimerDesc('');
      loadTimeEntries();
    } catch {}
  }

  async function stopTimer() {
    try {
      await fetch(`/api/freelance/projects/${initial.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      loadTimeEntries();
      // Recargar proyecto para actualizar hours_logged
      const res = await fetch(`/api/freelance/projects/${initial.id}`);
      if (res.ok) { const data = await res.json(); setProject(data); }
    } catch {}
  }

  async function deleteTimeEntry(id) {
    try {
      await fetch(`/api/freelance/projects/time/${id}`, { method: 'DELETE' });
      loadTimeEntries();
    } catch {}
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async function changeStatus(status) {
    const res = await fetch(`/api/freelance/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.project) setProject(p => ({ ...p, ...data.project }));
  }

  async function addMilestone(e) {
    e.preventDefault();
    if (!milestoneForm.title) return;

    await fetch(`/api/freelance/projects/${project.id}`, {
      method: 'POST', // Will go to milestones endpoint
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...milestoneForm, amount: milestoneForm.amount ? parseFloat(milestoneForm.amount) : null }),
    });

    // Reload project
    const res = await fetch(`/api/freelance/projects/${project.id}`);
    const data = await res.json();
    setProject(data);
    setShowMilestoneForm(false);
    setMilestoneForm({ title: '', amount: '', due_date: '' });
  }

  const progressPct = project.milestones?.length > 0
    ? Math.round((project.milestones.filter(m => ['approved', 'paid'].includes(m.status)).length / project.milestones.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Link href="/freelance/projects" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm">
        <ArrowLeft size={16} /> Volver a proyectos
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        <div className="flex items-center gap-3 mt-2">
          {project.client_name && (
            <Link href={`/freelance/clients/${project.client_id}`} className="text-emerald-400 hover:underline text-sm">{project.client_name}</Link>
          )}
          <span className={`px-2 py-0.5 rounded text-xs ${statusColors[project.status]}`}>{project.status}</span>
          {project.service_type && <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{project.service_type}</span>}
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="flex flex-wrap gap-2">
        {['proposal', 'negotiation', 'in_progress', 'delivered', 'paid', 'closed', 'cancelled'].map(s => (
          <button key={s} onClick={() => changeStatus(s)} disabled={project.status === s}
            className={`px-3 py-1 rounded text-xs capitalize ${project.status === s ? 'bg-gray-700 text-gray-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-4">
          {project.description && (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-2">Descripción</h2>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Milestones */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Milestones</h2>
              <button onClick={() => setShowMilestoneForm(true)} className="flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs hover:text-white">
                <Plus size={12} /> Añadir
              </button>
            </div>

            {progressPct > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progreso</span><span>{progressPct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {project.milestones?.length > 0 ? (
              <div className="space-y-2">
                {project.milestones.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Check size={16} className={milestoneStatusColors[m.status]} />
                      <div>
                        <p className="text-white text-sm">{m.title}</p>
                        {m.due_date && <p className="text-gray-500 text-xs">{m.due_date}</p>}
                      </div>
                    </div>
                    {m.amount && <span className="text-emerald-400 text-sm">{m.amount.toLocaleString('es-ES')}€</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin milestones definidos</p>
            )}

            {showMilestoneForm && (
              <form onSubmit={addMilestone} className="mt-3 p-3 bg-gray-800 rounded-lg space-y-2">
                <input className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600" placeholder="Título del milestone" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} required />
                <div className="flex gap-2">
                  <input type="number" className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600" placeholder="Cantidad €" value={milestoneForm.amount} onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} />
                  <input type="date" className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">Añadir</button>
                  <button type="button" onClick={() => setShowMilestoneForm(false)} className="px-3 py-1 bg-gray-700 text-gray-400 rounded text-sm">Cancelar</button>
                </div>
              </form>
            )}
          </div>

          {/* Timer */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Control de horas</h2>

            {/* Timer activo o botón start */}
            {activeTimer ? (
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <div>
                  <p className="text-blue-400 text-sm font-mono text-xl">{formatDuration(elapsed)}</p>
                  {activeTimer.description && <p className="text-gray-400 text-xs mt-1">{activeTimer.description}</p>}
                </div>
                <button onClick={stopTimer} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                  <Square size={20} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mb-4">
                <input
                  value={timerDesc}
                  onChange={e => setTimerDesc(e.target.value)}
                  placeholder="¿En qué trabajas?"
                  className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700"
                />
                <button onClick={startTimer} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors">
                  <Play size={20} />
                </button>
              </div>
            )}

            {/* Entradas de tiempo */}
            {timeEntries.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {timeEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="text-gray-300">{entry.description || 'Sin descripción'}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(entry.started_at).toLocaleDateString('es-ES')} — {entry.duration_minutes ? `${Math.round(entry.duration_minutes)} min` : 'en curso'}
                      </p>
                    </div>
                    {entry.ended_at && (
                      <button onClick={() => deleteTimeEntry(entry.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin entradas de tiempo</p>
            )}
          </div>
        </div>

        {/* Sidebar: detalles financieros */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold text-white">Detalles</h2>

            <div className="space-y-3">
              {project.agreed_price && (
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Precio acordado</p>
                    <p className="text-emerald-400 font-semibold">{project.agreed_price.toLocaleString('es-ES')} {project.currency}</p>
                  </div>
                </div>
              )}

              {project.total_paid > 0 && (
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Cobrado</p>
                    <p className="text-emerald-400">{project.total_paid.toLocaleString('es-ES')} {project.currency}</p>
                  </div>
                </div>
              )}

              {project.hours_estimated && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Horas</p>
                    <p className="text-gray-300">{project.hours_logged || 0} / {project.hours_estimated}h</p>
                  </div>
                </div>
              )}

              {project.deadline && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Deadline</p>
                    <p className="text-gray-300">{new Date(project.deadline).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              )}

              {project.platform && (
                <div>
                  <p className="text-xs text-gray-500">Plataforma</p>
                  <p className="text-gray-300 capitalize">{project.platform}</p>
                  {project.platform_fee_percent > 0 && (
                    <p className="text-gray-500 text-xs">Comisión: {project.platform_fee_percent}%</p>
                  )}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="pt-3 border-t border-gray-800 space-y-2">
              {[
                { key: 'repo_url', label: 'Repositorio' },
                { key: 'deploy_url', label: 'Deploy' },
                { key: 'proposal_url', label: 'Propuesta' },
                { key: 'contract_url', label: 'Contrato' },
              ].filter(({ key }) => project[key]).map(({ key, label }) => (
                <a key={key} href={project[key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                  <ExternalLink size={14} /> {label}
                </a>
              ))}
            </div>
          </div>

          {project.payment_type && (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500">Tipo de pago</p>
              <p className="text-gray-300 capitalize">{project.payment_type}</p>
              {project.hourly_rate && <p className="text-emerald-400 text-sm mt-1">{project.hourly_rate}€/h</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
