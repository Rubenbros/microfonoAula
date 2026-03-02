import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { leadId } = await request.json();

  try {
    const data = await backendFetch('/api/ai/proposal', {
      method: 'POST',
      body: JSON.stringify({ leadId }),
    });
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err.message || 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}
