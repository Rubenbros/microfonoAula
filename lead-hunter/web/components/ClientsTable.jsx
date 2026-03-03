'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, UserCheck, X } from 'lucide-react';

const statusColors = {
  prospect: 'bg-gray-500/20 text-gray-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400',
  recurring: 'bg-purple-500/20 text-purple-400',
  lost: 'bg-red-500/20 text-red-400',
};

export default function ClientsTable({ initialData }) {
  const [clients, setClients] = useState(initialData.clients || []);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', country: '', language: 'en', source: '', notes: '' });

  async function fetchData(params = {}) {
    setLoading(true);
    const query = new URLSearchParams({ search, status: statusFilter, ...params, limit: '20' });
    Object.keys(Object.fromEntries(query)).forEach(k => { if (!query.get(k)) query.delete(k); });

    try {
      const res = await fetch(`/api/freelance/clients?${query}`);
      const data = await res.json();
      setClients(data.clients || []);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  }

  async function createClient(e) {
    e.preventDefault();
    if (!form.name) return;

    await fetch('/api/freelance/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: '', company: '', email: '', phone: '', country: '', language: 'en', source: '', notes: '' });
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Modal crear cliente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={createClient} className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Nuevo cliente</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            {[
              { key: 'name', label: 'Nombre *', required: true },
              { key: 'company', label: 'Empresa' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Teléfono' },
              { key: 'country', label: 'País (código)', placeholder: 'ES, US, UK...' },
            ].map(({ key, label, ...props }) => (
              <div key={key}>
                <label className="text-sm text-gray-400">{label}</label>
                <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
              </div>
            ))}
            <div>
              <label className="text-sm text-gray-400">Fuente</label>
              <select className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {['upwork', 'freelancer', 'linkedin', 'reddit', 'referral', 'cold_email', 'website', 'other'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Notas</label>
              <textarea className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-1 border border-gray-700 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm hover:bg-emerald-500">Crear cliente</button>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <select className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-2 border border-gray-700" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchData({ status: e.target.value }); }}>
          <option value="">Todos los estados</option>
          {['prospect', 'active', 'completed', 'recurring', 'lost'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          <input type="text" placeholder="Buscar por nombre, empresa o email..." className="w-full bg-gray-800 text-sm text-gray-300 rounded-lg pl-9 pr-3 py-2 border border-gray-700" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Fuente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Proyectos</th>
              <th className="px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">No hay clientes aún. Crea el primero.</td></tr>
            ) : clients.map(c => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <Link href={`/freelance/clients/${c.id}`} className="text-white hover:text-emerald-400 font-medium">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{c.company || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.email || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{c.country || '—'}</td>
                <td className="px-4 py-3 text-gray-500 capitalize text-xs">{c.source || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusColors[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-gray-400">{c.projects_count || 0}</td>
                <td className="px-4 py-3 text-emerald-400 font-medium">{c.total_revenue ? `${c.total_revenue.toLocaleString('es-ES')}€` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={pagination.page <= 1} onClick={() => fetchData({ page: pagination.page - 1 })} className="px-3 py-1 text-sm bg-gray-800 text-gray-400 rounded disabled:opacity-50">Anterior</button>
          <span className="px-3 py-1 text-sm text-gray-500">{pagination.page} / {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => fetchData({ page: pagination.page + 1 })} className="px-3 py-1 text-sm bg-gray-800 text-gray-400 rounded disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
}
