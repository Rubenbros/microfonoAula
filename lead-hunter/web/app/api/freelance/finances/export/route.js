import { auth } from '../../../../../lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const res = await fetch(`${BACKEND_URL}/api/freelance/finances/export?${searchParams.toString()}`, {
    headers: { 'X-API-Key': API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    return Response.json({ error: 'Error exportando' }, { status: res.status });
  }

  const csv = await res.text();
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment; filename="finanzas.csv"',
    },
  });
}
