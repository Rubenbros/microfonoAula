import { auth } from '../../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../../lib/backend';
import ClientDetail from '../../../../components/ClientDetail';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  let data = null;
  try {
    data = await backendFetch(`/api/freelance/clients/${id}`);
  } catch (err) {
    console.error('Error loading client:', err.message);
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">Cliente no encontrado</div>;
  }

  return <ClientDetail client={data.client} projects={data.projects} finances={data.finances} />;
}
