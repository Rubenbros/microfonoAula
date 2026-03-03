import { auth } from '../../../../../lib/auth';
import { backendFetch } from '../../../../../lib/backend';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const data = await backendFetch('/api/freelance/ai/pricing', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Response.json(data);
}
