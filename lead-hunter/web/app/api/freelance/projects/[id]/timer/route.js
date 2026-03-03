import { auth } from '../../../../../../lib/auth';
import { backendFetch } from '../../../../../../lib/backend';

// POST /api/freelance/projects/:id/timer — Start/Stop timer
export async function POST(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action || 'start';

  const endpoint = action === 'stop'
    ? `/api/freelance/projects/${id}/timer/stop`
    : `/api/freelance/projects/${id}/timer/start`;

  const data = await backendFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
