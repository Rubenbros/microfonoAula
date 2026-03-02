import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';

export async function GET(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'history';

  if (type === 'config') {
    const data = await backendFetch('/api/scans/config');
    return Response.json(data);
  }

  if (type === 'jobs') {
    const data = await backendFetch('/api/scans/jobs');
    return Response.json(data);
  }

  // Default: history
  const limit = searchParams.get('limit') || '20';
  const data = await backendFetch(`/api/scans/history?limit=${limit}`);
  return Response.json(data);
}
