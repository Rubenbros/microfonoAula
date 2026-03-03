import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function GET(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/opportunities/${id}`);
  return Response.json(data);
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await backendFetch(`/api/freelance/opportunities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}

// POST /api/freelance/opportunities/:id/apply
export async function POST(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await backendFetch(`/api/freelance/opportunities/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
