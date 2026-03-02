import DashboardLayout from '@/components/Layout';
import LeadTable from '@/components/LeadTable';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({ searchParams }) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.tier) query.set('tier', params.tier);
  if (params.status) query.set('status', params.status);
  if (params.source) query.set('source', params.source);
  if (params.sector) query.set('sector', params.sector);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page);
  query.set('sort', params.sort || 'lead_score');
  query.set('order', params.order || 'DESC');
  query.set('limit', '20');

  let data = { leads: [], pagination: { page: 1, total: 0, pages: 0 } };
  let error = null;

  try {
    data = await backendFetch(`/api/leads?${query.toString()}`);
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="text-sm text-gray-500">{data.pagination.total} leads encontrados</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : (
        <LeadTable leads={data.leads} pagination={data.pagination} filters={params} />
      )}
    </DashboardLayout>
  );
}
