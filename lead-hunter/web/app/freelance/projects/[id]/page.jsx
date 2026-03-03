import { auth } from '../../../../lib/auth';
import { redirect } from 'next/navigation';
import { backendFetch } from '../../../../lib/backend';
import ProjectDetail from '../../../../components/ProjectDetail';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  let project = null;
  try {
    project = await backendFetch(`/api/freelance/projects/${id}`);
  } catch (err) {
    console.error('Error loading project:', err.message);
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-500">Proyecto no encontrado</div>;
  }

  return <ProjectDetail project={project} />;
}
