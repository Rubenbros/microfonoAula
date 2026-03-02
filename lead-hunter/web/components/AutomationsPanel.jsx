'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles, TrendingUp, Clock, Zap,
  ChevronDown, ChevronUp, Trash2, Plus
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
};

const difficultyColors = {
  baja: 'text-green-400',
  media: 'text-yellow-400',
  alta: 'text-red-400',
};

export default function AutomationsPanel({ data: initial }) {
  const [data, setData] = useState(initial);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');

  async function generateIdeas() {
    setGenerating(true);
    try {
      const res = await fetch('/api/automations/generate', { method: 'POST' });
      const result = await res.json();

      if (result.ideas) {
        // Refrescar lista
        const fresh = await fetch('/api/automations').then(r => r.json());
        setData(fresh);
      }
    } catch (err) {
      console.error('Error generando ideas:', err);
    }
    setGenerating(false);
  }

  async function updateStatus(id, newStatus) {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const fresh = await fetch('/api/automations').then(r => r.json());
      setData(fresh);
    } catch {}
  }

  async function deleteAutomation(id) {
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      const fresh = await fetch('/api/automations').then(r => r.json());
      setData(fresh);
    } catch {}
  }

  const automations = filter === 'all'
    ? data?.automations || []
    : (data?.automations || []).filter(a => a.status === filter);

  const stats = data?.stats || {};

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
          <p className="text-xs text-gray-500">Total ideas</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-blue-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.byStatus?.in_progress || 0}</p>
          <p className="text-xs text-gray-500">En desarrollo</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-green-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.byStatus?.launched || 0}</p>
          <p className="text-xs text-gray-500">Lanzadas</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-yellow-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {stats.totalRevenuePotential ? `${stats.totalRevenuePotential}€` : '0€'}
          </p>
          <p className="text-xs text-gray-500">Ingreso potencial/mes</p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['all', 'idea', 'evaluating', 'in_progress', 'launched'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === s
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800'
              )}
            >
              {s === 'all' ? 'Todas' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>

        <button
          onClick={generateIdeas}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
        >
          <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generando ideas...' : 'Generar ideas con IA'}
        </button>
      </div>

      {/* Automation cards */}
      <div className="space-y-3">
        {automations.length === 0 && (
          <div className="text-center py-16 bg-gray-900 rounded-xl border border-gray-800">
            <Sparkles size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No hay ideas todavía</p>
            <p className="text-sm text-gray-600 mt-1">Pulsa "Generar ideas con IA" para empezar</p>
          </div>
        )}

        {automations.map(auto => {
          const isExpanded = expanded === auto.id;
          let plan = [];
          try {
            plan = typeof auto.implementation_plan === 'string'
              ? JSON.parse(auto.implementation_plan)
              : auto.implementation_plan || [];
          } catch { plan = []; }

          return (
            <div key={auto.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {/* Card header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : auto.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{auto.title}</h3>
                      {auto.category && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryConfig[auto.category]?.color || ''}`}>
                          {categoryConfig[auto.category]?.label || auto.category}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig[auto.status]?.color || ''}`}>
                        {statusConfig[auto.status]?.label || auto.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{auto.description}</p>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp size={14} className="text-green-400" />
                        <span className="text-green-400 font-medium">
                          {auto.monthly_revenue_estimate ? `${auto.monthly_revenue_estimate}€/mes` : '?'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Zap size={12} />
                        <span>Inversión: {auto.investment_estimate ? `${auto.investment_estimate}€` : '?'}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-4">
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Tiempo lanzamiento</p>
                      <p className="text-gray-300 flex items-center gap-1">
                        <Clock size={14} /> {auto.time_to_launch || '?'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Dificultad</p>
                      <p className={difficultyColors[auto.difficulty] || 'text-gray-300'}>
                        {auto.difficulty || '?'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Generado por</p>
                      <p className="text-gray-300">{auto.generated_by === 'ai' ? 'IA' : 'Manual'}</p>
                    </div>
                  </div>

                  {/* Implementation plan */}
                  {plan.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase mb-2">Plan de implementación</p>
                      <div className="space-y-1.5">
                        {plan.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-600 font-mono text-xs mt-0.5">{i + 1}.</span>
                            <span className="text-gray-300">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                    <select
                      value={auto.status}
                      onChange={(e) => updateStatus(auto.id, e.target.value)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300"
                    >
                      {Object.entries(statusConfig).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => deleteAutomation(auto.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
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
