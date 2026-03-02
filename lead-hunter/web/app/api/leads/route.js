import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';

export async function GET(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const data = await backendFetch(`/api/leads?${searchParams.toString()}`);
  return Response.json(data);
}
