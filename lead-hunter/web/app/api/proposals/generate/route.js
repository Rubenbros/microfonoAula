import { auth } from '@/lib/auth';
import { backendFetch } from '@/lib/backend';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  const session = await auth();
  if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { leadId } = await request.json();

  // Obtener datos del lead del backend
  const { lead } = await backendFetch(`/api/leads/${leadId}`);
  if (!lead) return Response.json({ error: 'Lead no encontrado' }, { status: 404 });

  const client = new Anthropic();

  const problems = [];
  if (!lead.has_website) problems.push('No tiene página web');
  if (!lead.has_booking_system) problems.push('No tiene sistema de reservas online');
  if (!lead.has_social_media) problems.push('No tiene presencia en redes sociales');
  if (lead.website_quality < 40) problems.push('Su web actual es de baja calidad');

  const sectorPrices = {
    peluqueria: { setup: 800, monthly: 40 },
    restaurante: { setup: 1200, monthly: 50 },
    clinica: { setup: 2000, monthly: 80 },
    taller: { setup: 1500, monthly: 60 },
    academia: { setup: 1800, monthly: 70 },
    tienda: { setup: 1000, monthly: 40 },
    gimnasio: { setup: 2500, monthly: 100 },
    inmobiliaria: { setup: 2000, monthly: 80 },
  };

  const prices = sectorPrices[lead.sector] || { setup: 1500, monthly: 60 };

  const prompt = `Eres un consultor comercial de T800 Labs (t800labs.com), empresa de desarrollo web, apps e IA en Zaragoza.

Genera una propuesta comercial personalizada para este negocio:
- Nombre: ${lead.name}
- Sector: ${lead.sector || 'general'}
- Zona: ${lead.zone || 'Zaragoza'}
- Problemas detectados: ${problems.join(', ') || 'Necesita mejoras de digitalización'}
- Rating Google: ${lead.rating || '?'}★ (${lead.review_count || 0} reseñas)
- Web actual: ${lead.website || 'No tiene'}
- Calidad web: ${lead.website_quality || 0}/100

Precios de referencia para sector ${lead.sector || 'general'}:
- Setup: ${prices.setup}€
- Mensual: ${prices.monthly}€/mes

La propuesta debe ser concisa, profesional, con:
1. Saludo personalizado mencionando el negocio por su nombre
2. 2-3 problemas detectados (tono consultivo, no agresivo)
3. Solución concreta (servicios específicos para su sector)
4. Presupuesto desglosado: coste inicial + mensualidad
5. 3 beneficios esperados con datos estimados
6. Llamada a la acción (reunión o llamada)

Tono: profesional, cercano, directo. Máximo 400 palabras.

Al final, añade en una línea separada un JSON con este formato exacto:
---JSON---
{"services": ["servicio1", "servicio2"], "totalSetup": X, "totalMonthly": Y}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;

  // Extraer JSON del final
  let services = [];
  let totalSetup = prices.setup;
  let totalMonthly = prices.monthly;
  let content = text;

  const jsonMatch = text.match(/---JSON---\s*(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      services = parsed.services || [];
      totalSetup = parsed.totalSetup || prices.setup;
      totalMonthly = parsed.totalMonthly || prices.monthly;
      content = text.replace(/---JSON---[\s\S]*$/, '').trim();
    } catch {}
  }

  // Guardar propuesta en backend
  const proposal = await backendFetch(`/api/proposals/lead/${leadId}`, {
    method: 'POST',
    body: JSON.stringify({ content, services, total_setup: totalSetup, total_monthly: totalMonthly }),
  });

  return Response.json(proposal);
}
