import { auth } from '../../../../../../lib/auth';
import { backendFetch } from '../../../../../../lib/backend';

export async function POST(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { platform } = await params;
  const body = await req.json();
  const data = await backendFetch(`/api/freelance/platforms/${platform}/refill`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
