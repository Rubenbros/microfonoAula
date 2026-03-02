import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { taskId } = await params;
  try {
    const data = await backendFetch(`/api/tasks/${taskId}/execute`, { method: 'POST' });
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err.message || 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}
