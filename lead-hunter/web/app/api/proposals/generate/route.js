import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { leadId } = await request.json();

  // Delegar al backend local que usa Claude Code CLI (cubierto por Max)
  const data = await backendFetch('/api/ai/proposal', {
    method: 'POST',
    body: JSON.stringify({ leadId }),
  });
  return Response.json(data);
}
