import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const data = await backendFetch(`/api/automations/${id}/tasks/generate`, { method: 'POST' });
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err.message || 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}
