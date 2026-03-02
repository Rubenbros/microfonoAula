import DashboardLayout from '@/components/Layout';
import SettingsPanel from '@/components/SettingsPanel';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let settings = null;
  let error = null;

  try {
    settings = await backendFetch('/api/settings');
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ajustes</h1>
        <p className="text-sm text-gray-500">Configuración del sistema</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : (
        <SettingsPanel settings={settings} />
      )}
    </DashboardLayout>
  );
}
