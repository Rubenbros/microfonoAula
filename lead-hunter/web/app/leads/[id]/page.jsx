import DashboardLayout from '@/components/Layout';
import LeadDetail from '@/components/LeadDetail';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;

  let data = null;
  let error = null;

  try {
    data = await backendFetch(`/api/leads/${id}`);
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-4">
        <ArrowLeft size={14} /> Volver a leads
      </Link>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      ) : data ? (
        <LeadDetail data={data} />
      ) : (
        <p className="text-gray-500">Lead no encontrado</p>
      )}
    </DashboardLayout>
  );
}
