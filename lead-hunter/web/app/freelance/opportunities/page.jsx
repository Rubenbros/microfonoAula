import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../lib/backend';
import OpportunitiesTable from '../../../components/OpportunitiesTable';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let data = { opportunities: [], pagination: { page: 1, total: 0, pages: 0 } };
  try {
    data = await backendFetch('/api/freelance/opportunities?limit=20');
  } catch (err) {
    console.error('Error loading opportunities:', err.message);
  }

  return <OpportunitiesTable initialData={data} />;
}
