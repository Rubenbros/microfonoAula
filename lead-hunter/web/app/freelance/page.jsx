import { auth } from '../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../lib/backend';
import FreelanceDashboard from '../../components/FreelanceDashboard';

export const dynamic = 'force-dynamic';

export default async function FreelancePage() {
  const session = await auth();
  if (!session) redirect('/login');

  let stats = null;
  let financeSummary = null;
  let platforms = [];

  try {
    [stats, financeSummary, platforms] = await Promise.all([
      backendFetch('/api/freelance/stats/dashboard'),
      backendFetch('/api/freelance/finances/summary?period=month'),
      backendFetch('/api/freelance/platforms'),
    ]);
  } catch (err) {
    console.error('Error loading freelance dashboard:', err.message);
  }

  return <FreelanceDashboard stats={stats} financeSummary={financeSummary} platforms={platforms} />;
}
