'use client';

import { useState } from 'react';
import { Pause, Play, Mail, Target } from 'lucide-react';

export default function SettingsPanel({ settings: initial }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function togglePause() {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails_paused: !settings.emails_paused }),
      });
      setSettings({ ...settings, emails_paused: !settings.emails_paused });
      setMessage('Guardado');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Error al guardar');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Emails */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mail size={20} /> Envío de emails
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Envíos automáticos</p>
              <p className="text-xs text-gray-500">Secuencia de 3 emails para leads calientes</p>
            </div>
            <button
              onClick={togglePause}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.emails_paused
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              }`}
            >
              {settings.emails_paused ? (
                <><Play size={16} /> Reanudar</>
              ) : (
                <><Pause size={16} /> Pausar</>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <div>
              <p className="text-sm text-white">Límite diario</p>
              <p className="text-xs text-gray-500">Máximo emails por día</p>
            </div>
            <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg">
              {settings.daily_email_limit} emails/día
            </span>
          </div>
        </div>
      </div>

      {/* Scoring */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={20} /> Scoring
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Score mínimo para contactar</p>
              <p className="text-xs text-gray-500">Solo leads con score {'>='}  este valor reciben emails</p>
            </div>
            <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg">
              {settings.lead_score_threshold} pts
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <div>
              <p className="text-sm text-white">Zona por defecto</p>
              <p className="text-xs text-gray-500">Zona para escaneos automáticos</p>
            </div>
            <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg">
              {settings.scan_default_zone}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message === 'Guardado' ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      {/* Backend info */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sistema</h2>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Lead Hunter v2.0</p>
          <p>Backend: conectado</p>
          <p>T800 Labs — t800labs.com</p>
        </div>
      </div>
    </div>
  );
}
