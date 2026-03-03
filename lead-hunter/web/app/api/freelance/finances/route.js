import { auth } from '../../../../lib/auth';
import { backendFetch } from '../../../../lib/backend';

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const data = await backendFetch(`/api/freelance/finances?${searchParams.toString()}`);
  return Response.json(data);
}

export async function POST(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const data = await backendFetch('/api/freelance/finances', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(data, { status: 201 });
}
