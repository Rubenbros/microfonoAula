'use client';

import { Briefcase, Search, FolderKanban, Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import StatsCard from './StatsCard';

export default function FreelanceDashboard({ stats, financeSummary, platforms }) {
  if (!stats) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>No se pudo cargar el dashboard freelance.</p>
        <p className="text-sm mt-2">Verifica que el backend esté corriendo.</p>
      </div>
    );
  }

  const balance = (financeSummary?.income || 0) - (financeSummary?.expenses || 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Freelance Dashboard</h1>

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ingresos este mes"
          value={`${(financeSummary?.income || 0).toLocaleString('es-ES')}€`}
          subtitle={`Año: ${(stats.revenue?.thisYear || 0).toLocaleString('es-ES')}€`}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Proyectos activos"
          value={stats.projects?.active || 0}
          subtitle={`${stats.projects?.proposals || 0} propuestas pendientes`}
          icon={FolderKanban}
          color="blue"
        />
        <StatsCard
          title="Oportunidades hot"
          value={stats.opportunities?.hot || 0}
          subtitle={`${stats.opportunities?.total || 0} total detectadas`}
          icon={Search}
          color="red"
        />
        <StatsCard
          title="Balance mensual"
          value={`${balance >= 0 ? '+' : ''}${balance.toLocaleString('es-ES')}€`}
          subtitle={`Gastos: ${(financeSummary?.expenses || 0).toLocaleString('es-ES')}€`}
          icon={Wallet}
          color={balance >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de clientes */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase size={18} />
            Clientes
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Activos</span>
              <span className="text-emerald-400 font-semibold">{stats.clients?.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Prospects</span>
              <span className="text-yellow-400 font-semibold">{stats.clients?.prospects || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-semibold">{stats.clients?.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Resumen de proyectos */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FolderKanban size={18} />
            Pipeline de proyectos
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Propuesta', key: 'proposals', color: 'text-gray-400' },
              { label: 'En curso', key: 'active', color: 'text-blue-400' },
              { label: 'Entregados', key: 'delivered', color: 'text-yellow-400' },
              { label: 'Cobrados', key: 'paid', color: 'text-emerald-400' },
            ].map(({ label, key, color }) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-gray-400">{label}</span>
                <span className={`${color} font-semibold`}>{stats.projects?.[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ingresos vs gastos */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} />
            Finanzas del mes
          </h2>
          {financeSummary?.monthly?.length > 0 ? (
            <div className="space-y-2">
              {financeSummary.monthly.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-16">{m.month}</span>
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="h-2 bg-emerald-500/30 rounded-full" style={{ width: `${Math.min(100, (m.income / Math.max(1, ...financeSummary.monthly.map(x => x.income))) * 100)}%` }}>
                      <div className="h-2 bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <span className="text-xs text-emerald-400">{m.income.toLocaleString('es-ES')}€</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sin datos financieros aún</p>
          )}
        </div>

        {/* Balances de plataformas */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={18} />
            Créditos en plataformas
          </h2>
          {platforms && platforms.length > 0 ? (
            <div className="space-y-3">
              {platforms.map((p) => (
                <div key={p.platform} className="flex justify-between items-center">
                  <div>
                    <span className="text-white text-sm capitalize">{p.platform}</span>
                    <span className="text-gray-500 text-xs ml-2">({p.credits_unit})</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${p.credits_balance <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {p.credits_balance}
                    </span>
                    {p.cost_per_credit > 0 && (
                      <span className="text-gray-500 text-xs ml-1">
                        (≈${(p.credits_balance * p.cost_per_credit).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Configura tus plataformas en Ajustes</p>
          )}
        </div>
      </div>
    </div>
  );
}
