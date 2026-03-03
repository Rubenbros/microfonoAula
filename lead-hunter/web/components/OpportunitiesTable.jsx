'use client';

import { useState } from 'react';
import { Search, ExternalLink, Zap, Clock, Sparkles, FileText, MessageSquare, DollarSign, ChevronDown, ChevronUp, Loader2, Copy, Check, Brain } from 'lucide-react';

const tierColors = { hot: 'bg-red-500/20 text-red-400', warm: 'bg-yellow-500/20 text-yellow-400', cold: 'bg-blue-500/20 text-blue-400' };
const statusColors = {
  new: 'bg-gray-500/20 text-gray-400', interested: 'bg-blue-500/20 text-blue-400',
  applied: 'bg-purple-500/20 text-purple-400', interviewing: 'bg-yellow-500/20 text-yellow-400',
  won: 'bg-emerald-500/20 text-emerald-400', lost: 'bg-red-500/20 text-red-400',
  skipped: 'bg-gray-700/20 text-gray-500',
};

function getTier(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 text-gray-500 hover:text-white transition-colors"
      title="Copiar"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function AiPanel({ opportunity }) {
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  async function runAi(type) {
    if (results[type]) { setActiveTab(type); return; }
    setActiveTab(type);
    setLoading(true);

    try {
      const res = await fetch(`/api/freelance/ai/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setResults(prev => ({ ...prev, [type]: data }));
    } catch (err) {
      setResults(prev => ({ ...prev, [type]: { error: err.message } }));
    }
    setLoading(false);
  }

  const tabs = [
    { key: 'analyze', label: 'Analizar', icon: Brain, color: 'text-purple-400' },
    { key: 'proposal', label: 'Propuesta', icon: FileText, color: 'text-blue-400' },
    { key: 'cover-letter', label: 'Cover Letter', icon: MessageSquare, color: 'text-emerald-400' },
    { key: 'pricing', label: 'Pricing', icon: DollarSign, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-3">
      {/* AI Buttons */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => runAi(tab.key)}
            disabled={loading && activeTab === tab.key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeTab === tab.key
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            {loading && activeTab === tab.key ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <tab.icon size={13} className={results[tab.key] ? tab.color : ''} />
            )}
            {tab.label}
            {results[tab.key] && !results[tab.key].error && <Check size={11} className="text-green-400 ml-1" />}
          </button>
        ))}
      </div>

      {/* Results */}
      {activeTab && results[activeTab] && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          {results[activeTab].error ? (
            <p className="text-red-400 text-sm">{results[activeTab].error}</p>
          ) : activeTab === 'analyze' ? (
            <AnalysisResult data={results[activeTab].analysis} />
          ) : activeTab === 'pricing' ? (
            <PricingResult data={results[activeTab].pricing} />
          ) : activeTab === 'proposal' ? (
            <TextResult text={results[activeTab].proposal} label="Propuesta" />
          ) : activeTab === 'cover-letter' ? (
            <TextResult text={results[activeTab].coverLetter} label="Cover Letter" />
          ) : null}
        </div>
      )}

      {loading && activeTab && !results[activeTab] && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
          <Loader2 size={20} className="animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Generando con IA... (puede tardar 15-30s)</p>
        </div>
      )}
    </div>
  );
}

function AnalysisResult({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${data.worth_applying ? 'text-green-400' : 'text-red-400'}`}>
          {data.worth_applying ? 'Aplicar' : 'No aplicar'}
        </span>
        <span className="text-sm text-gray-400">Confianza: {data.confidence}/10</span>
        <span className="text-sm text-gray-400">Skills match: {data.skills_match_pct}%</span>
        <span className="text-sm text-gray-400">Competencia: {data.competition_level}</span>
      </div>
      <p className="text-sm text-gray-300">{data.recommendation}</p>
      {data.suggested_approach && <p className="text-sm text-gray-400 italic">{data.suggested_approach}</p>}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-500 mb-1">Horas estimadas</p>
          <p className="text-white font-medium">{data.estimated_hours}h</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Valor estimado</p>
          <p className="text-emerald-400 font-medium">{data.estimated_value_eur?.toLocaleString()}€</p>
        </div>
      </div>
      {data.green_flags?.length > 0 && (
        <div>
          <p className="text-green-400 text-xs mb-1 font-medium">Positivo</p>
          <ul className="text-xs text-gray-400 space-y-0.5">{data.green_flags.map((f, i) => <li key={i}>+ {f}</li>)}</ul>
        </div>
      )}
      {data.red_flags?.length > 0 && (
        <div>
          <p className="text-red-400 text-xs mb-1 font-medium">Red flags</p>
          <ul className="text-xs text-gray-400 space-y-0.5">{data.red_flags.map((f, i) => <li key={i}>- {f}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function PricingResult({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-gray-500 text-xs">Precio recomendado</p>
          <p className="text-2xl font-bold text-emerald-400">{data.recommended_price?.toLocaleString()} {data.currency}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Rango</p>
          <p className="text-sm text-gray-300">{data.price_range_low?.toLocaleString()} - {data.price_range_high?.toLocaleString()} {data.currency}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Neto (tras fees)</p>
          <p className="text-sm text-white font-medium">{data.net_after_fees?.toLocaleString()} {data.currency}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div><span className="text-gray-500">Tipo:</span> <span className="text-gray-300">{data.payment_type}</span></div>
        <div><span className="text-gray-500">Horas est.:</span> <span className="text-gray-300">{data.estimated_hours}h</span></div>
        <div><span className="text-gray-500">Fee plataforma:</span> <span className="text-gray-300">{data.platform_fee_pct}%</span></div>
      </div>
      {data.hourly_rate_suggested && (
        <p className="text-xs text-gray-400">Rate sugerido: {data.hourly_rate_suggested} {data.currency}/h</p>
      )}
      <p className="text-sm text-gray-300">{data.justification}</p>
      {data.negotiation_tip && <p className="text-xs text-yellow-400/80 italic">{data.negotiation_tip}</p>}
      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
        data.value_vs_budget === 'within' ? 'bg-green-500/20 text-green-400' :
        data.value_vs_budget === 'below' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        {data.value_vs_budget === 'within' ? 'Dentro del budget' : data.value_vs_budget === 'below' ? 'Por debajo del budget' : 'Por encima del budget'}
      </span>
    </div>
  );
}

function TextResult({ text, label }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <CopyButton text={text} />
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  );
}

export default function OpportunitiesTable({ initialData }) {
  const [opportunities, setOpportunities] = useState(initialData.opportunities || []);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [filters, setFilters] = useState({ platform: '', status: '', min_score: '', search: '' });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  async function fetchData(params = {}) {
    setLoading(true);
    const query = new URLSearchParams({ ...filters, ...params, limit: '20' });
    Object.keys(Object.fromEntries(query)).forEach(k => { if (!query.get(k)) query.delete(k); });

    try {
      const res = await fetch(`/api/freelance/opportunities?${query}`);
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await fetch(`/api/freelance/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Oportunidades</h1>
        <span className="text-sm text-gray-500">{pagination?.total || 0} total</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-2 border border-gray-700" value={filters.platform} onChange={e => { setFilters(f => ({ ...f, platform: e.target.value })); fetchData({ platform: e.target.value }); }}>
          <option value="">Todas las plataformas</option>
          {['upwork', 'freelancer', 'linkedin', 'reddit', 'hackernews', 'twitter'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-2 border border-gray-700" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); fetchData({ status: e.target.value }); }}>
          <option value="">Todos los estados</option>
          {['new', 'interested', 'applied', 'interviewing', 'won', 'lost', 'skipped'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-2 border border-gray-700" value={filters.min_score} onChange={e => { setFilters(f => ({ ...f, min_score: e.target.value })); fetchData({ min_score: e.target.value }); }}>
          <option value="">Cualquier score</option>
          <option value="70">Hot (70+)</option>
          <option value="40">Warm+ (40+)</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-gray-800 text-sm text-gray-300 rounded-lg pl-9 pr-3 py-2 border border-gray-700"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : opportunities.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">No hay oportunidades aún. Lanza un scan desde el Escáner.</td></tr>
            ) : opportunities.map(opp => {
              const tier = getTier(opp.match_score);
              const isExpanded = expandedId === opp.id;
              return (
                <tr key={opp.id} className="border-b border-gray-800/50">
                  <td colSpan={7} className="p-0">
                    {/* Row */}
                    <div
                      className={`flex items-center hover:bg-gray-800/30 cursor-pointer ${isExpanded ? 'bg-gray-800/20' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    >
                      <div className="px-4 py-3 w-[80px]">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tierColors[tier]}`}>
                          {opp.match_score}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{opp.title}</div>
                        {opp.skills_required && (
                          <div className="text-gray-500 text-xs mt-0.5 truncate">
                            {(() => { try { return JSON.parse(opp.skills_required).slice(0, 4).join(', '); } catch { return ''; } })()}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 w-[110px] text-gray-400 capitalize">{opp.platform}</div>
                      <div className="px-4 py-3 w-[120px]">
                        {opp.budget_min || opp.budget_max ? (
                          <span className="text-emerald-400 text-xs">
                            {opp.currency === 'USD' ? '$' : '€'}
                            {opp.budget_min ? opp.budget_min.toLocaleString() : '?'}
                            {opp.budget_max ? ` - ${opp.budget_max.toLocaleString()}` : '+'}
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </div>
                      <div className="px-4 py-3 w-[100px]">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusColors[opp.status] || statusColors.new}`}>
                          {opp.status}
                        </span>
                      </div>
                      <div className="px-4 py-3 w-[90px] text-gray-500 text-xs">
                        {opp.posted_at ? new Date(opp.posted_at).toLocaleDateString('es-ES') : '—'}
                      </div>
                      <div className="px-4 py-3 w-[100px]">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {opp.url && (
                            <a href={opp.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-500 hover:text-white">
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {opp.status === 'new' && (
                            <>
                              <button onClick={() => updateStatus(opp.id, 'interested')} className="p-1 text-yellow-500 hover:text-yellow-300" title="Interesado">
                                <Zap size={14} />
                              </button>
                              <button onClick={() => updateStatus(opp.id, 'skipped')} className="p-1 text-gray-600 hover:text-gray-400" title="Skip">
                                <Clock size={14} />
                              </button>
                            </>
                          )}
                          <button className="p-1 text-gray-600 hover:text-gray-400" onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : opp.id); }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded panel with AI tools */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-900/50 border-t border-gray-800/50">
                        <div className="pt-3 space-y-3">
                          {/* Description */}
                          {opp.description && (
                            <div className="text-sm text-gray-400 max-h-32 overflow-y-auto leading-relaxed">
                              {opp.description.slice(0, 500)}{opp.description.length > 500 ? '...' : ''}
                            </div>
                          )}

                          {/* Meta info */}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {opp.country && <span>País: {opp.country}</span>}
                            {opp.language && <span>Idioma: {opp.language}</span>}
                            {opp.proposals_count && <span>Propuestas: {opp.proposals_count}</span>}
                            {opp.client_rating && <span>Rating cliente: {opp.client_rating}★</span>}
                            {opp.urgency && <span>Urgencia: {opp.urgency}</span>}
                            {opp.category && <span>Categoría: {opp.category}</span>}
                          </div>

                          {/* AI Tools */}
                          <div className="pt-2 border-t border-gray-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles size={14} className="text-purple-400" />
                              <span className="text-xs font-medium text-purple-400">Herramientas IA</span>
                            </div>
                            <AiPanel opportunity={opp} />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
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
