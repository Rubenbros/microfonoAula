'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Map, MessageSquare, Linkedin, BarChart3, ShoppingBag, Loader2, CheckCircle2, XCircle, Clock, Briefcase, Code2, Zap } from 'lucide-react';

const typeLabels = {
  maps: 'Google Maps',
  reddit: 'Reddit',
  fiverr: 'Fiverr',
  linkedin: 'LinkedIn',
  score: 'Scoring',
  upwork: 'Upwork',
  hackernews: 'HackerNews',
  'reddit-freelance': 'Reddit FL',
  'freelance-score': 'Score FL',
  'linkedin-jobs': 'LinkedIn Jobs',
};

const typeColors = {
  maps: 'blue',
  reddit: 'orange',
  fiverr: 'emerald',
  linkedin: 'sky',
  score: 'green',
  upwork: 'emerald',
  hackernews: 'orange',
  'reddit-freelance': 'orange',
  'freelance-score': 'green',
  'linkedin-jobs': 'sky',
};

const colorMap = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-500/20', ring: 'ring-blue-500/30' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', hover: 'hover:bg-orange-500/20', ring: 'ring-orange-500/30' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/20', ring: 'ring-emerald-500/30' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', hover: 'hover:bg-sky-500/20', ring: 'ring-sky-500/30' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', hover: 'hover:bg-green-500/20', ring: 'ring-green-500/30' },
};

function ScanCard({ type, icon: Icon, title, description, children, onLaunch, loading, result, error }) {
  const color = colorMap[typeColors[type]];

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color.bg}`}>
          <Icon size={20} className={color.text} />
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>

      {children && <div className="mb-4 space-y-3">{children}</div>}

      <button
        onClick={onLaunch}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
          loading
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : `${color.bg} ${color.text} ${color.hover} border ${color.border}`
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Escaneando...
          </span>
        ) : (
          'Lanzar'
        )}
      </button>

      {result && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 size={16} />
            <span>Completado</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {result.found !== undefined && <span>Encontrados: {result.found}</span>}
            {result.new !== undefined && <span> | Nuevos: {result.new}</span>}
            {result.duplicates !== undefined && <span> | Duplicados: {result.duplicates}</span>}
            {result.message && <span>{result.message}</span>}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle size={16} />
            <span>Error</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function ScanPanel({ config, initialHistory }) {
  const [zone, setZone] = useState(config?.zones?.[0]?.name || '');
  const [sector, setSector] = useState(config?.sectors?.[0]?.id || '');
  const [maxResults, setMaxResults] = useState(20);
  const [history, setHistory] = useState(initialHistory || []);

  // Estado de cada tipo de scan
  const [scanState, setScanState] = useState({
    maps: { loading: false, result: null, error: null, jobId: null },
    reddit: { loading: false, result: null, error: null, jobId: null },
    fiverr: { loading: false, result: null, error: null, jobId: null },
    linkedin: { loading: false, result: null, error: null, jobId: null },
    score: { loading: false, result: null, error: null, jobId: null },
    upwork: { loading: false, result: null, error: null, jobId: null },
    hackernews: { loading: false, result: null, error: null, jobId: null },
    'reddit-freelance': { loading: false, result: null, error: null, jobId: null },
    'freelance-score': { loading: false, result: null, error: null, jobId: null },
    'linkedin-jobs': { loading: false, result: null, error: null, jobId: null },
  });

  const pollIntervals = useRef({});

  const pollJob = useCallback((type, jobId) => {
    if (pollIntervals.current[type]) clearInterval(pollIntervals.current[type]);

    pollIntervals.current[type] = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === 'completed') {
          clearInterval(pollIntervals.current[type]);
          setScanState(prev => ({
            ...prev,
            [type]: { loading: false, result: job.result, error: null, jobId: null },
          }));
          refreshHistory();
        } else if (job.status === 'failed') {
          clearInterval(pollIntervals.current[type]);
          setScanState(prev => ({
            ...prev,
            [type]: { loading: false, result: null, error: job.error, jobId: null },
          }));
        }
      } catch {
        // Silenciar errores de polling
      }
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, []);

  async function refreshHistory() {
    try {
      const res = await fetch('/api/scans?type=history&limit=20');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {}
  }

  async function launchScan(type, params = {}) {
    setScanState(prev => ({
      ...prev,
      [type]: { loading: true, result: null, error: null, jobId: null },
    }));

    try {
      const res = await fetch('/api/scans/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...params }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error ${res.status}`);
      }

      const { jobId } = await res.json();
      setScanState(prev => ({
        ...prev,
        [type]: { ...prev[type], jobId },
      }));
      pollJob(type, jobId);
    } catch (err) {
      setScanState(prev => ({
        ...prev,
        [type]: { loading: false, result: null, error: err.message, jobId: null },
      }));
    }
  }

  const zones = config?.zones || [];
  const sectors = config?.sectors || [];

  return (
    <div className="space-y-6">
      {/* Tarjetas de scan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Maps */}
        <ScanCard
          type="maps"
          icon={Map}
          title="Google Maps"
          description="Escanea negocios por zona y sector"
          onLaunch={() => launchScan('maps', { zone, sector, maxResults })}
          loading={scanState.maps.loading}
          result={scanState.maps.result}
          error={scanState.maps.error}
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1">Zona</label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {zones.map(z => (
                <option key={z.name} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sector</label>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {sectors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Máx. resultados</label>
            <input
              type="number"
              value={maxResults}
              onChange={e => setMaxResults(parseInt(e.target.value) || 20)}
              min={5}
              max={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </ScanCard>

        {/* Reddit */}
        <ScanCard
          type="reddit"
          icon={MessageSquare}
          title="Reddit"
          description="Escanea subreddits de freelance"
          onLaunch={() => launchScan('reddit')}
          loading={scanState.reddit.loading}
          result={scanState.reddit.result}
          error={scanState.reddit.error}
        />

        {/* Fiverr */}
        <ScanCard
          type="fiverr"
          icon={ShoppingBag}
          title="Fiverr"
          description="Escanea gigs y demanda en Fiverr"
          onLaunch={() => launchScan('fiverr')}
          loading={scanState.fiverr.loading}
          result={scanState.fiverr.result}
          error={scanState.fiverr.error}
        />

        {/* LinkedIn */}
        <ScanCard
          type="linkedin"
          icon={Linkedin}
          title="LinkedIn"
          description="Google → LinkedIn de decision-makers"
          onLaunch={() => launchScan('linkedin')}
          loading={scanState.linkedin.loading}
          result={scanState.linkedin.result}
          error={scanState.linkedin.error}
        />

        {/* Scoring */}
        <ScanCard
          type="score"
          icon={BarChart3}
          title="Scoring"
          description="Analiza y puntúa leads pendientes"
          onLaunch={() => launchScan('score')}
          loading={scanState.score.loading}
          result={scanState.score.result}
          error={scanState.score.error}
        />
      </div>

      {/* Scrapers Freelance */}
      <h2 className="text-lg font-semibold text-white mt-8">Freelance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upwork */}
        <ScanCard
          type="upwork"
          icon={Briefcase}
          title="Upwork"
          description="Escanea proyectos vía RSS feeds"
          onLaunch={() => launchScan('upwork')}
          loading={scanState.upwork.loading}
          result={scanState.upwork.result}
          error={scanState.upwork.error}
        />

        {/* HackerNews */}
        <ScanCard
          type="hackernews"
          icon={Code2}
          title="Hacker News"
          description="Thread 'Who is hiring?' mensual"
          onLaunch={() => launchScan('hackernews')}
          loading={scanState.hackernews.loading}
          result={scanState.hackernews.result}
          error={scanState.hackernews.error}
        />

        {/* Reddit Freelance */}
        <ScanCard
          type="reddit-freelance"
          icon={MessageSquare}
          title="Reddit Freelance"
          description="r/forhire, r/freelance, r/remotejs..."
          onLaunch={() => launchScan('reddit-freelance')}
          loading={scanState['reddit-freelance'].loading}
          result={scanState['reddit-freelance'].result}
          error={scanState['reddit-freelance'].error}
        />

        {/* LinkedIn Jobs */}
        <ScanCard
          type="linkedin-jobs"
          icon={Linkedin}
          title="LinkedIn Jobs"
          description="Ofertas freelance via Google Search"
          onLaunch={() => launchScan('linkedin-jobs')}
          loading={scanState['linkedin-jobs'].loading}
          result={scanState['linkedin-jobs'].result}
          error={scanState['linkedin-jobs'].error}
        />

        {/* Freelance Scoring */}
        <ScanCard
          type="freelance-score"
          icon={Zap}
          title="Scoring Freelance"
          description="Puntúa oportunidades según tu perfil"
          onLaunch={() => launchScan('freelance-score')}
          loading={scanState['freelance-score'].loading}
          result={scanState['freelance-score'].result}
          error={scanState['freelance-score'].error}
        />
      </div>

      {/* Historial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Historial de scans</h2>
          <button
            onClick={refreshHistory}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Actualizar
          </button>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl bg-gray-800/50 border border-gray-800 p-6 text-center">
            <p className="text-gray-500 text-sm">No hay scans registrados</p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-800/50 border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left py-3 px-4">Fecha</th>
                  <th className="text-left py-3 px-4">Tipo</th>
                  <th className="text-left py-3 px-4">Zona</th>
                  <th className="text-left py-3 px-4">Sector</th>
                  <th className="text-right py-3 px-4">Encontrados</th>
                  <th className="text-right py-3 px-4">Nuevos</th>
                </tr>
              </thead>
              <tbody>
                {history.map(scan => (
                  <tr key={scan.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2.5 px-4 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-500" />
                        {new Date(scan.scanned_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        colorMap[typeColors[scan.source === 'google_maps' ? 'maps' : scan.source] || 'blue']?.bg || 'bg-gray-700'
                      } ${
                        colorMap[typeColors[scan.source === 'google_maps' ? 'maps' : scan.source] || 'blue']?.text || 'text-gray-300'
                      }`}>
                        {scan.source === 'google_maps' ? 'Maps' : scan.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-300">{scan.zone}</td>
                    <td className="py-2.5 px-4 text-gray-300">{scan.sector}</td>
                    <td className="py-2.5 px-4 text-right text-gray-300">{scan.results_count}</td>
                    <td className="py-2.5 px-4 text-right text-green-400">{scan.new_leads_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
