import { auth } from '../../../../../../lib/auth';
import { backendFetch } from '../../../../../../lib/backend';

// GET /api/freelance/projects/:id/time — Entradas de tiempo del proyecto
export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const data = await backendFetch(`/api/freelance/projects/${id}/time`);
  return Response.json(data);
}
