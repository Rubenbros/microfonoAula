import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/invoices/${id}`);
  return Response.json(data);
}

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const data = await backendFetch(`/api/freelance/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/invoices/${id}`, {
    method: 'DELETE',
  });
  return Response.json(data);
}
