import DashboardLayout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Users, Flame, Mail, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let stats = null;
  let timeline = null;
  let conversion = null;
  let error = null;

  try {
    [stats, timeline, conversion] = await Promise.all([
      backendFetch('/api/stats/overview'),
      backendFetch('/api/stats/timeline?days=28'),
      backendFetch('/api/stats/conversion'),
    ]);
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <h2 className="text-red-400 font-bold text-lg">Error de conexión</h2>
          <p className="text-red-300/70 mt-2 text-sm">No se puede conectar al backend: {error}</p>
          <p className="text-red-300/50 mt-1 text-xs">Verifica que el backend esté corriendo y BACKEND_URL sea correcto.</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalLeads = stats?.leads?.total || 0;
  const hotLeads = stats?.leads?.hot || 0;
  const emailsSent = stats?.emails?.sentToday || 0;
  const openRate = stats?.emails?.rate || '0.0';

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen de captación de leads</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Leads"
          value={totalLeads}
          subtitle={`${stats?.leads?.totalLocal || 0} locales - ${stats?.leads?.totalOnline || 0} online`}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Leads Hot"
          value={hotLeads}
          subtitle={`${stats?.leads?.warm || 0} warm - ${stats?.leads?.cold || 0} cold`}
          icon={Flame}
          color="red"
        />
        <StatsCard
          title="Emails Hoy"
          value={emailsSent}
          subtitle={`${stats?.emails?.total || 0} total enviados`}
          icon={Mail}
          color="green"
        />
        <StatsCard
          title="Tasa Apertura"
          value={`${openRate}%`}
          subtitle={`${stats?.emails?.opened || 0} abiertos de ${stats?.emails?.total || 0}`}
          icon={Eye}
          color="yellow"
        />
      </div>

      {/* Conversion funnel */}
      {conversion && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Pipeline de conversión</h2>
          <div className="flex items-center gap-2">
            {Object.entries(conversion).map(([status, count]) => {
              const total = Object.values(conversion).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
              const labels = {
                new: 'Nuevos', contacted: 'Contactados', replied: 'Respondidos',
                meeting: 'Reunión', client: 'Clientes', discarded: 'Descartados'
              };
              return (
                <div key={status} className="flex-1 text-center">
                  <div className="text-xl font-bold text-white">{count}</div>
                  <div className="text-xs text-gray-500">{labels[status] || status}</div>
                  <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Demos stats */}
      {stats?.demos?.totalDemos > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Demos personalizadas</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-400">{stats.demos.totalDemos}</p>
              <p className="text-xs text-gray-500">Registradas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{stats.demos.demosVisited}</p>
              <p className="text-xs text-gray-500">Visitadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{stats.demos.totalVisits}</p>
              <p className="text-xs text-gray-500">Visitas totales</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
