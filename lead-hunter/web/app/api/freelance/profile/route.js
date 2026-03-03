import { auth } from '../../../../lib/auth';
import { backendFetch } from '../../../../lib/backend';

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const data = await backendFetch('/api/freelance/profile');
  return Response.json(data);
}

export async function PATCH(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const data = await backendFetch('/api/freelance/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
