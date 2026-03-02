import DashboardLayout from '@/components/Layout';
import AutomationDetail from '@/components/AutomationDetail';
import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AutomationDetailPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;

  let automation = null;
  let tasks = [];
  let error = null;

  try {
    const [autoData, tasksData] = await Promise.all([
      backendFetch(`/api/automations/${id}`),
      backendFetch(`/api/automations/${id}/tasks`).catch(() => ({ tasks: [] })),
    ]);
    automation = autoData;
    tasks = tasksData.tasks || [];
  } catch (err) {
    error = err.message;
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/automations"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Automatizaciones
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-300">{automation?.title || 'Detalle'}</span>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <p className="text-red-400 font-medium">Error de conexión</p>
          <p className="text-red-300/70 mt-1 text-sm">{error}</p>
        </div>
      ) : automation ? (
        <AutomationDetail automation={automation} initialTasks={tasks} />
      ) : (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
          <p className="text-gray-400">Automatización no encontrada</p>
        </div>
      )}
    </DashboardLayout>
  );
}
