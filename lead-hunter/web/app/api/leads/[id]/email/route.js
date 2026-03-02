import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/leads/${id}/email`, { method: 'POST' });
  return Response.json(data);
}
