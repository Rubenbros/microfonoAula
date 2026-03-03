import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../lib/backend';
import FinancesDashboard from '../../../components/FinancesDashboard';

export const dynamic = 'force-dynamic';

export default async function FinancesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let finances = { finances: [], pagination: { page: 1, total: 0, pages: 0 } };
  let summary = null;

  try {
    [finances, summary] = await Promise.all([
      backendFetch('/api/freelance/finances?limit=30'),
      backendFetch('/api/freelance/finances/summary?period=month'),
    ]);
  } catch (err) {
    console.error('Error loading finances:', err.message);
  }

  return <FinancesDashboard initialFinances={finances} summary={summary} />;
}
