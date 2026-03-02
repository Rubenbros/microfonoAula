import { backendFetch } from '@/lib/backend';
import { auth } from '@/lib/auth';

export async function GET(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'overview';

  const validEndpoints = ['overview', 'timeline', 'conversion', 'by-sector', 'by-source'];
  if (!validEndpoints.includes(endpoint)) {
    return Response.json({ error: 'Endpoint inválido' }, { status: 400 });
  }

  const query = new URLSearchParams(searchParams);
  query.delete('endpoint');
  const qs = query.toString();

  const data = await backendFetch(`/api/stats/${endpoint}${qs ? '?' + qs : ''}`);
  return Response.json(data);
}
