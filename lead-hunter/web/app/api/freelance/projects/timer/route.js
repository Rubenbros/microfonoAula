import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

// GET /api/freelance/projects/timer — Timer activo global
export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const data = await backendFetch('/api/freelance/projects/timer/active');
  return Response.json(data);
}
