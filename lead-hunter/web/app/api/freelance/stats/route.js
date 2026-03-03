import { auth } from '../../../../lib/auth';
import { backendFetch } from '../../../../lib/backend';

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const data = await backendFetch('/api/freelance/stats/dashboard');
  return Response.json(data);
}
