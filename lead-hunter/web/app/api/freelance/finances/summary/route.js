import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const data = await backendFetch(`/api/freelance/finances/summary?period=${period}`);
  return Response.json(data);
}
