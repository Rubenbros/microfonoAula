import { auth } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../lib/backend';
import ProjectsBoard from '../../../components/ProjectsBoard';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  let data = { projects: [], pagination: { page: 1, total: 0, pages: 0 } };
  let clients = [];
  try {
    [data, { clients: clientsList }] = await Promise.all([
      backendFetch('/api/freelance/projects?limit=50'),
      backendFetch('/api/freelance/clients?limit=100'),
    ]);
    clients = clientsList || [];
  } catch (err) {
    console.error('Error loading projects:', err.message);
  }

  return <ProjectsBoard initialData={data} clients={clients} />;
}
