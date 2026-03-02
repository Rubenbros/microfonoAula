import DashboardLayout from '@/components/Layout';
import ScanPanel from '@/components/ScanPanel';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let config = null;
  let history = null;
  let error = null;

  try {
    [config, history] = await Promise.all([
      backendFetch('/api/scans/config'),
      backendFetch('/api/scans/history?limit=20'),
    ]);
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Escáner</h1>
        <p className="text-sm text-gray-500">Lanza scans de Google Maps, Reddit, LinkedIn y scoring de leads</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error conectando con backend: {error}</p>
          <p className="text-xs text-gray-500 mt-2">Asegúrate de que el backend está arrancado (start.sh)</p>
        </div>
      ) : (
        <ScanPanel config={config} initialHistory={history} />
      )}
    </DashboardLayout>
  );
}
