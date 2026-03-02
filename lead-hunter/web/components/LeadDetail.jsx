'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Phone, Mail, Globe, MapPin, Star, ExternalLink,
  Send, Eye
} from 'lucide-react';

const tabs = ['Info', 'Emails', 'CRM', 'Propuesta'];

const tierColors = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/30',
  warm: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors = {
  new: 'bg-gray-600', contacted: 'bg-blue-600', replied: 'bg-green-600',
  meeting: 'bg-purple-600', client: 'bg-emerald-600', discarded: 'bg-red-600',
};

export default function LeadDetail({ data }) {
  const [tab, setTab] = useState('Info');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const { lead, emails, demoVisit, activities, proposals } = data;

  async function changeStatus(newStatus) {
    setStatusUpdating(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      window.location.reload();
    } catch {
      setStatusUpdating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${tierColors[lead.lead_tier]}`}>
                {lead.lead_tier} · {lead.lead_score}pts
              </span>
              <span className={`px-3 py-1 rounded-full text-sm text-white ${statusColors[lead.status]}`}>
                {lead.status}
              </span>
              <span className="text-xs text-gray-500">
                {lead.lead_type === 'online' ? 'Online' : 'Local'} · {lead.source}
              </span>
            </div>
          </div>

          {/* Status buttons */}
          <div className="flex gap-2">
            {['replied', 'meeting', 'client', 'discarded'].map(s => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={statusUpdating || lead.status === s}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  lead.status === s
                    ? 'bg-gray-700 text-gray-500 cursor-default'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            )}
          >
            {t}
            {t === 'Emails' && emails?.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-800 text-xs">{emails.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        {tab === 'Info' && (
          <div className="space-y-4">
            {lead.address && (
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin size={16} className="text-gray-500" />
                <span>{lead.address}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={16} className="text-gray-500" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={16} className="text-gray-500" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-3 text-gray-300">
                <Globe size={16} className="text-gray-500" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  {lead.website}
                </a>
              </div>
            )}
            {lead.rating && (
              <div className="flex items-center gap-3 text-gray-300">
                <Star size={16} className="text-yellow-500" />
                <span>{lead.rating} ({lead.review_count || 0} resenas)</span>
              </div>
            )}
            {lead.demo_url && (
              <div className="flex items-center gap-3">
                <ExternalLink size={16} className="text-purple-400" />
                <a href={lead.demo_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  Demo: {lead.demo_url}
                </a>
                {demoVisit && (
                  <span className="text-xs text-gray-500">
                    ({demoVisit.visit_count} visitas)
                  </span>
                )}
              </div>
            )}

            {/* Analisis */}
            {lead.lead_type === 'local' && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Analisis</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={lead.has_website ? 'text-green-400' : 'text-red-400'}>
                      {lead.has_website ? 'Si' : 'No'}
                    </span>
                    <span className="text-gray-300">Tiene web</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={lead.has_booking_system ? 'text-green-400' : 'text-red-400'}>
                      {lead.has_booking_system ? 'Si' : 'No'}
                    </span>
                    <span className="text-gray-300">Reservas online</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={lead.has_social_media ? 'text-green-400' : 'text-red-400'}>
                      {lead.has_social_media ? 'Si' : 'No'}
                    </span>
                    <span className="text-gray-300">Redes sociales</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Calidad:</span>
                    <span className="text-gray-300">{lead.website_quality}/100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Online lead info */}
            {lead.lead_type === 'online' && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                {lead.description && (
                  <p className="text-sm text-gray-400 mb-3">{lead.description}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-400">
                  {lead.budget_max && <span>${lead.budget_min || '?'}-${lead.budget_max}</span>}
                  {lead.service_type && <span>{lead.service_type}</span>}
                  {lead.urgency && <span>{lead.urgency}</span>}
                  {lead.language && <span>{lead.language}</span>}
                </div>
                {lead.source_url && (
                  <a href={lead.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline mt-2"
                  >
                    <ExternalLink size={14} /> Ver post original
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'Emails' && (
          <div>
            {emails?.length > 0 ? (
              <div className="space-y-3">
                {emails.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{e.status === 'failed' ? 'X' : 'E'}</span>
                      <div>
                        <p className="text-sm text-white">Email {e.sequence_step}/3</p>
                        <p className="text-xs text-gray-500">{e.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {e.opened_at && (
                        <span className="flex items-center gap-1 text-green-400">
                          <Eye size={12} /> Abierto
                        </span>
                      )}
                      <span>{e.sent_at?.slice(0, 16)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No se han enviado emails a este lead</p>
            )}
          </div>
        )}

        {tab === 'CRM' && (
          <div>
            {activities?.length > 0 ? (
              <div className="space-y-3">
                {activities.map(a => {
                  const icons = {
                    note: 'N', call: 'C', meeting: 'M',
                    email_sent: 'E', email_opened: 'O',
                    demo_visit: 'D', status_change: 'S', proposal: 'P',
                  };
                  return (
                    <div key={a.id} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-lg font-bold text-gray-500">{icons[a.type] || '?'}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{a.title || a.type}</p>
                        {a.content && <p className="text-xs text-gray-400 mt-1">{a.content}</p>}
                        <p className="text-xs text-gray-600 mt-1">
                          {a.created_at?.slice(0, 16)} · {a.created_by}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay actividades registradas</p>
            )}
          </div>
        )}

        {tab === 'Propuesta' && (
          <div>
            {proposals?.length > 0 ? (
              <div className="space-y-4">
                {proposals.map(p => (
                  <div key={p.id} className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs',
                        p.status === 'draft' ? 'bg-gray-700 text-gray-400' :
                        p.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                        p.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {p.status}
                      </span>
                      <span className="text-xs text-gray-500">{p.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">
                      {p.content}
                    </div>
                    {(p.total_setup || p.total_monthly) && (
                      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-700 text-sm">
                        {p.total_setup && <span className="text-green-400">Setup: {p.total_setup}EUR</span>}
                        {p.total_monthly && <span className="text-blue-400">Mensual: {p.total_monthly}EUR/mes</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay propuestas para este lead</p>
                <button
                  onClick={async () => {
                    setGeneratingProposal(true);
                    try {
                      await fetch('/api/proposals/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: lead.id }),
                      });
                      window.location.reload();
                    } catch {
                      setGeneratingProposal(false);
                    }
                  }}
                  disabled={generatingProposal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {generatingProposal ? 'Generando...' : 'Generar propuesta con IA'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
