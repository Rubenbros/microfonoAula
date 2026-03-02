import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const data = await backendFetch('/api/settings');
  return Response.json(data);
}

export async function PATCH(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const data = await backendFetch('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
