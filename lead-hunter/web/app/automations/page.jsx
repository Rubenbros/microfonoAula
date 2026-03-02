import DashboardLayout from '@/components/Layout';
import AutomationsPanel from '@/components/AutomationsPanel';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let data = null;
  let error = null;

  try {
    data = await backendFetch('/api/automations');
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automatizaciones</h1>
          <p className="text-sm text-gray-500">Ideas de negocio y nuevas líneas de ingreso para T800 Labs</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : (
        <AutomationsPanel data={data} />
      )}
    </DashboardLayout>
  );
}
