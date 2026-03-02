'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const tierBadge = {
  hot: 'bg-red-500/20 text-red-400',
  warm: 'bg-yellow-500/20 text-yellow-400',
  cold: 'bg-blue-500/20 text-blue-400',
};

const statusBadge = {
  new: 'bg-gray-500/20 text-gray-400',
  contacted: 'bg-blue-500/20 text-blue-400',
  replied: 'bg-green-500/20 text-green-400',
  meeting: 'bg-purple-500/20 text-purple-400',
  client: 'bg-emerald-500/20 text-emerald-400',
  discarded: 'bg-red-500/20 text-red-400',
};

export default function LeadTable({ leads, pagination, filters }) {
  const router = useRouter();
  const [search, setSearch] = useState(filters?.search || '');

  function updateFilter(key, value) {
    const params = new URLSearchParams(filters || {});
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/leads?${params.toString()}`);
  }

  function handleSearch(e) {
    e.preventDefault();
    updateFilter('search', search);
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <select
          value={filters?.tier || ''}
          onChange={(e) => updateFilter('tier', e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
        >
          <option value="">Todos los tiers</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>

        <select
          value={filters?.status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
        >
          <option value="">Todos los estados</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="meeting">Meeting</option>
          <option value="client">Client</option>
          <option value="discarded">Discarded</option>
        </select>

        <select
          value={filters?.source || ''}
          onChange={(e) => updateFilter('source', e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
        >
          <option value="">Todas las fuentes</option>
          <option value="google_maps">Google Maps</option>
          <option value="reddit">Reddit</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Sector</th>
              <th className="text-left px-4 py-3">Zona</th>
              <th className="text-center px-4 py-3">Score</th>
              <th className="text-center px-4 py-3">Tier</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="text-center px-4 py-3">Fuente</th>
              <th className="text-right px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="text-white hover:text-blue-400 font-medium">
                    {lead.name.slice(0, 50)}
                  </Link>
                  {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{lead.sector || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{lead.zone || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-white">{lead.lead_score}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge[lead.lead_tier] || tierBadge.cold}`}>
                    {lead.lead_tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge[lead.status] || statusBadge.new}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-400">
                  {lead.source === 'google_maps' ? 'Maps' : lead.source === 'reddit' ? 'Reddit' : 'LinkedIn'}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {lead.found_at?.slice(0, 10)}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  No hay leads con estos filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Página {pagination.page} de {pagination.pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => updateFilter('page', Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => updateFilter('page', Math.min(pagination.pages, pagination.page + 1))}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
