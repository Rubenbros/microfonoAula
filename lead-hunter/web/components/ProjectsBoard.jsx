'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X, DollarSign } from 'lucide-react';

const columns = [
  { key: 'proposal', label: 'Propuesta', color: 'border-gray-500' },
  { key: 'negotiation', label: 'Negociación', color: 'border-yellow-500' },
  { key: 'in_progress', label: 'En curso', color: 'border-blue-500' },
  { key: 'delivered', label: 'Entregado', color: 'border-purple-500' },
  { key: 'paid', label: 'Cobrado', color: 'border-emerald-500' },
  { key: 'closed', label: 'Cerrado', color: 'border-gray-700' },
];

export default function ProjectsBoard({ initialData, clients }) {
  const [projects, setProjects] = useState(initialData.projects || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    client_id: '', name: '', description: '', service_type: 'web',
    currency: 'EUR', agreed_price: '', payment_type: 'fixed', platform: '',
  });

  async function fetchData() {
    try {
      const res = await fetch('/api/freelance/projects?limit=50');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {}
  }

  async function updateStatus(projectId, newStatus) {
    await fetch(`/api/freelance/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  }

  async function createProject(e) {
    e.preventDefault();
    if (!form.client_id || !form.name) return;

    await fetch('/api/freelance/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, agreed_price: form.agreed_price ? parseFloat(form.agreed_price) : null }),
    });
    setShowForm(false);
    setForm({ client_id: '', name: '', description: '', service_type: 'web', currency: 'EUR', agreed_price: '', payment_type: 'fixed', platform: '' });
    fetchData();
  }

  function onDragStart(e, project) {
    e.dataTransfer.setData('projectId', project.id);
    e.dataTransfer.setData('fromStatus', project.status);
  }

  function onDrop(e, toStatus) {
    e.preventDefault();
    const projectId = parseInt(e.dataTransfer.getData('projectId'));
    updateStatus(projectId, toStatus);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Proyectos</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
          <Plus size={16} /> Nuevo proyecto
        </button>
      </div>

      {/* Modal crear proyecto */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={createProject} className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Nuevo proyecto</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div>
              <label className="text-sm text-gray-400">Cliente *</label>
              <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Nombre del proyecto *</label>
              <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400">Tipo</label>
                <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
                  {['web', 'app', 'ai', 'automation', 'consulting', 'bot', 'scraping', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Precio acordado</label>
                <input type="number" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.agreed_price} onChange={e => setForm(f => ({ ...f, agreed_price: e.target.value }))} placeholder="€" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400">Pago</label>
                <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
                  {['fixed', 'hourly', 'retainer', 'milestone'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Plataforma</label>
                <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  <option value="">Directo</option>
                  {['upwork', 'freelancer', 'toptal', 'linkedin', 'other'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm hover:bg-emerald-500">Crear proyecto</button>
          </form>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(({ key, label, color }) => {
          const columnProjects = projects.filter(p => p.status === key);
          return (
            <div
              key={key}
              className="flex-shrink-0 w-56"
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, key)}
            >
              <div className={`border-t-2 ${color} bg-gray-900 rounded-lg p-3`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-300">{label}</span>
                  <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{columnProjects.length}</span>
                </div>
                <div className="space-y-2">
                  {columnProjects.map(p => (
                    <Link
                      key={p.id}
                      href={`/freelance/projects/${p.id}`}
                      draggable
                      onDragStart={e => onDragStart(e, p)}
                      className="block bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-white text-sm font-medium truncate">{p.name}</div>
                      <div className="text-gray-500 text-xs mt-1">{p.client_name || 'Sin cliente'}</div>
                      {p.agreed_price && (
                        <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
                          <DollarSign size={12} />
                          {p.agreed_price.toLocaleString('es-ES')}€
                        </div>
                      )}
                      {p.service_type && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-[10px]">{p.service_type}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
