import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/automations/${id}/tasks`);
  return Response.json(data);
}
