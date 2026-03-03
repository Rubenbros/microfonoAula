import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../lib/backend';
import ClientsTable from '../../../components/ClientsTable';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let data = { clients: [], pagination: { page: 1, total: 0, pages: 0 } };
  try {
    data = await backendFetch('/api/freelance/clients?limit=20');
  } catch (err) {
    console.error('Error loading clients:', err.message);
  }

  return <ClientsTable initialData={data} />;
}
