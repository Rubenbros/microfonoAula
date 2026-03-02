import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const data = await backendFetch(`/api/automations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/automations/${id}`, { method: 'DELETE' });
  return Response.json(data);
}
