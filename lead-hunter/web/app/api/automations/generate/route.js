import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const data = await backendFetch('/api/ai/ideas', { method: 'POST' });
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err.message || 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}
