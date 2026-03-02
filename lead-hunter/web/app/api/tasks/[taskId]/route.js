import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { taskId } = await params;
  const body = await request.json();
  const data = await backendFetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
