import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { type, ...params } = body;

  const endpoints = {
    maps: '/api/scans/maps',
    reddit: '/api/scans/reddit',
    linkedin: '/api/scans/linkedin',
    score: '/api/scans/score',
  };

  const endpoint = endpoints[type];
  if (!endpoint) {
    return Response.json({ error: 'Tipo de scan inválido' }, { status: 400 });
  }

  const data = await backendFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return Response.json(data, { status: 202 });
}
