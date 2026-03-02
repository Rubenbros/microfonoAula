import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  // Obtener datos del contexto
  const [stats, existingAutomations] = await Promise.all([
    backendFetch('/api/stats/overview'),
    backendFetch('/api/automations'),
  ]);

  const existingIdeas = existingAutomations.automations
    .map(a => a.title)
    .join(', ') || 'Ninguna todavía';

  const sectorInfo = stats.leads?.bySource?.map(s => `${s.source}: ${s.c}`)?.join(', ') || 'Sin datos';

  const client = new Anthropic();

  const prompt = `Eres el estratega de negocio de T800 Labs, empresa de desarrollo web, apps e IA en Zaragoza.

CONTEXTO:
- Total leads captados: ${stats.leads?.total || 0} (locales: ${stats.leads?.totalLocal || 0}, online: ${stats.leads?.totalOnline || 0})
- Leads calientes: ${stats.leads?.hot || 0}
- Fuentes: ${sectorInfo}
- Servicios actuales: desarrollo web, apps móviles, automatización, IA, chatbots
- Clientes típicos: pymes locales (peluquerías, restaurantes, clínicas, talleres, academias, tiendas, gimnasios, inmobiliarias)
- Ideas ya propuestas: ${existingIdeas}

Propón 3 nuevas ideas de negocio/automatización de ingresos para T800 Labs.

Para cada idea devuelve un JSON array con 3 objetos, cada uno con:
- title: string (nombre corto de la idea)
- description: string (2-3 frases explicando la idea)
- category: "saas" | "service" | "tool" | "content" | "marketplace" | "automation"
- investment_estimate: number (euros necesarios para MVP)
- monthly_revenue_estimate: number (euros mensuales estimados una vez operativo)
- time_to_launch: string (ej: "2 semanas", "1 mes")
- difficulty: "baja" | "media" | "alta"
- implementation_plan: string[] (5-7 pasos de implementación)

Prioriza ideas que:
- Aprovechen los datos/leads que ya tenemos
- Generen ingresos recurrentes
- Sean escalables
- Tengan baja inversión inicial
- Se puedan validar rápido (MVP en <2 semanas)
- NO repitan ideas ya propuestas

Responde SOLO con el JSON array, sin texto adicional.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;

  // Parsear JSON
  let ideas = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      ideas = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return Response.json({ error: 'Error parseando respuesta de IA', raw: text }, { status: 500 });
  }

  // Guardar cada idea en backend
  const saved = [];
  for (const idea of ideas) {
    const result = await backendFetch('/api/automations', {
      method: 'POST',
      body: JSON.stringify({
        ...idea,
        generated_by: 'ai',
      }),
    });
    saved.push(result);
  }

  return Response.json({ ideas: saved });
}
