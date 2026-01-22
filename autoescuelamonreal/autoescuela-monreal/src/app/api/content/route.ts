import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

const SESSION_TOKEN = process.env.SESSION_TOKEN || 'autoescuela-session-secret-token';
const CONTENT_FILE = path.join(process.cwd(), 'src/data/content.json');

async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin-session');
  return session?.value === SESSION_TOKEN;
}

export async function GET() {
  try {
    const content = await fs.readFile(CONTENT_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json(
      { error: 'Error al leer el contenido' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const newContent = await request.json();
    await fs.writeFile(CONTENT_FILE, JSON.stringify(newContent, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Error al guardar el contenido' },
      { status: 500 }
    );
  }
}
