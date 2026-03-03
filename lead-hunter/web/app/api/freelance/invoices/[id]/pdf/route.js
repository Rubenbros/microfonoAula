import { auth } from '../../../../../../lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/api/freelance/invoices/${id}/pdf`, {
    headers: { 'X-API-Key': API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    return Response.json({ error: 'Error generando factura' }, { status: res.status });
  }

  const html = await res.text();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
