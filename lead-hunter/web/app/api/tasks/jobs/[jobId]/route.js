import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { jobId } = await params;
  const data = await backendFetch(`/api/tasks/jobs/${jobId}`);
  return Response.json(data);
}
