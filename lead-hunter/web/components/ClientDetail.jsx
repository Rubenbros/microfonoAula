'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Globe, DollarSign, FolderKanban, Edit2, Check, X } from 'lucide-react';

const statusColors = {
  prospect: 'bg-gray-500/20 text-gray-400', active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400', recurring: 'bg-purple-500/20 text-purple-400',
  lost: 'bg-red-500/20 text-red-400',
};

export default function ClientDetail({ client: initialClient, projects, finances }) {
  const [client, setClient] = useState(initialClient);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...initialClient });

  async function save() {
    const res = await fetch(`/api/freelance/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.client) setClient(data.client);
    setEditing(false);
  }

  async function changeStatus(status) {
    const res = await fetch(`/api/freelance/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.client) setClient(data.client);
  }

  return (
    <div className="space-y-6">
      <Link href="/freelance/clients" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm">
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          {client.company && <p className="text-gray-400">{client.company}</p>}
          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${statusColors[client.status]}`}>{client.status}</span>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-gray-400 rounded text-sm hover:text-white">
              <Edit2 size={14} /> Editar
            </button>
          ) : (
            <>
              <button onClick={save} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-sm"><Check size={14} /> Guardar</button>
              <button onClick={() => { setEditing(false); setForm({ ...client }); }} className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-gray-400 rounded text-sm"><X size={14} /></button>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Información</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email', key: 'email' },
                { icon: Phone, label: 'Teléfono', key: 'phone' },
                { icon: Globe, label: 'País', key: 'country' },
              ].map(({ icon: Icon, label, key }) => (
                <div key={key} className="flex items-start gap-3">
                  <Icon size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    {editing ? (
                      <input className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 w-full" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    ) : (
                      <p className="text-sm text-gray-300">{client[key] || '—'}</p>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <DollarSign size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Revenue total</p>
                  <p className="text-sm text-emerald-400 font-semibold">{(client.total_revenue || 0).toLocaleString('es-ES')}€</p>
                </div>
              </div>
            </div>
            {editing && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <textarea className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700" rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            )}
            {!editing && client.notes && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-300">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Cambiar estado */}
          <div className="flex gap-2">
            {['prospect', 'active', 'completed', 'recurring', 'lost'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={client.status === s}
                className={`px-3 py-1 rounded text-xs capitalize ${client.status === s ? 'bg-gray-700 text-gray-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar: proyectos */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FolderKanban size={18} /> Proyectos ({projects?.length || 0})
            </h2>
            {projects?.length > 0 ? (
              <div className="space-y-2">
                {projects.map(p => (
                  <Link key={p.id} href={`/freelance/projects/${p.id}`} className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700">
                    <div className="text-white text-sm font-medium">{p.name}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 text-xs capitalize">{p.status}</span>
                      {p.agreed_price && <span className="text-emerald-400 text-xs">{p.agreed_price.toLocaleString('es-ES')}€</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin proyectos aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
