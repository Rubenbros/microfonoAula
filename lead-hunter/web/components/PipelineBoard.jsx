'use client';

import { useState } from 'react';
import Link from 'next/link';

const columnConfig = {
  new: { label: 'Nuevos', emoji: 'NEW', color: 'border-gray-600' },
  contacted: { label: 'Contactados', emoji: 'ENV', color: 'border-blue-600' },
  replied: { label: 'Respondidos', emoji: 'RSP', color: 'border-green-600' },
  meeting: { label: 'Reunión', emoji: 'MTG', color: 'border-purple-600' },
  client: { label: 'Clientes', emoji: 'CLI', color: 'border-emerald-600' },
  discarded: { label: 'Descartados', emoji: 'DES', color: 'border-red-600' },
};

const tierBadge = {
  hot: 'bg-red-500/20 text-red-400',
  warm: 'bg-yellow-500/20 text-yellow-400',
  cold: 'bg-blue-500/20 text-blue-400',
};

export default function PipelineBoard({ columns: initialColumns, totals: initialTotals }) {
  const [columns, setColumns] = useState(initialColumns);
  const [totals, setTotals] = useState(initialTotals || {});
  const [dragging, setDragging] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  function handleDragStart(lead, fromStatus) {
    setDragging({ lead, fromStatus });
  }

  async function handleDrop(toStatus) {
    if (!dragging || dragging.fromStatus === toStatus) {
      setDragging(null);
      return;
    }

    const { lead, fromStatus } = dragging;

    // Optimistic update
    setColumns(prev => {
      const updated = { ...prev };
      updated[fromStatus] = prev[fromStatus].filter(l => l.id !== lead.id);
      updated[toStatus] = [{ ...lead, status: toStatus }, ...prev[toStatus]];
      return updated;
    });
    setTotals(prev => ({
      ...prev,
      [fromStatus]: (prev[fromStatus] || 0) - 1,
      [toStatus]: (prev[toStatus] || 0) + 1,
    }));

    setDragging(null);
    setErrorMsg(null);

    // API call
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      });
      if (!res.ok) throw new Error('Error al mover lead');
    } catch (err) {
      // Revert only this failed drag, not all previous successful ones
      setColumns(prev => {
        const reverted = { ...prev };
        const movedLead = prev[toStatus].find(l => l.id === lead.id);
        if (movedLead) {
          reverted[toStatus] = prev[toStatus].filter(l => l.id !== lead.id);
          reverted[fromStatus] = [{ ...movedLead, status: fromStatus }, ...prev[fromStatus]];
        }
        return reverted;
      });
      setTotals(prev => ({
        ...prev,
        [fromStatus]: (prev[fromStatus] || 0) + 1,
        [toStatus]: (prev[toStatus] || 0) - 1,
      }));
      setErrorMsg(err.message || 'Error al actualizar estado');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  return (
    <div>
      {errorMsg && (
        <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errorMsg}</p>
      )}
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
      {Object.entries(columnConfig).map(([status, config]) => (
        <div
          key={status}
          className={`flex-1 min-w-[220px] bg-gray-900 rounded-xl border-t-2 ${config.color}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(status)}
        >
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                {config.emoji} {config.label}
              </span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {totals[status] ?? columns[status]?.length ?? 0}
              </span>
            </div>
          </div>

          <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
            {columns[status]?.map(lead => (
              <div
                key={lead.id}
                draggable
                onDragStart={() => handleDragStart(lead, status)}
                className="p-3 bg-gray-800/70 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-800 transition-colors"
              >
                <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-white hover:text-blue-400">
                  {lead.name.slice(0, 40)}
                </Link>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tierBadge[lead.lead_tier]}`}>
                    {lead.lead_score}pts
                  </span>
                  <span className="text-[10px] text-gray-500">{lead.sector || lead.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
