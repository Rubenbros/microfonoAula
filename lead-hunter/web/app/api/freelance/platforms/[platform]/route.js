import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function GET(req, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { platform } = await params;
  const data = await backendFetch(`/api/freelance/platforms/${platform}`);
  return Response.json(data);
}
