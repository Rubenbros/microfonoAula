import DashboardLayout from '@/components/Layout';
import PipelineBoard from '@/components/PipelineBoard';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const columns = {};
  const totals = {};
  const statuses = ['new', 'contacted', 'replied', 'meeting', 'client', 'discarded'];

  let error = null;

  try {
    const results = await Promise.all(
      statuses.map(s => backendFetch(`/api/leads?status=${s}&limit=500&sort=lead_score&order=DESC`))
    );
    statuses.forEach((s, i) => {
      columns[s] = results[i].leads;
      totals[s] = results[i].pagination?.total ?? results[i].leads.length;
    });
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-gray-500">Arrastra leads entre columnas para cambiar su estado</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : (
        <PipelineBoard columns={columns} totals={totals} />
      )}
    </DashboardLayout>
  );
}
