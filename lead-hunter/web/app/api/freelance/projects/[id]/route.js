import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function GET(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/projects/${id}`);
  return Response.json(data);
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await backendFetch(`/api/freelance/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/projects/${id}`, { method: 'DELETE' });
  return Response.json(data);
}
