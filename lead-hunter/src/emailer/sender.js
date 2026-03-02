import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, insertEmailSent, updateEmailStatus, getEmailsSentToday, getLeadsToContact, getLeadsForFollowUp, getSetting } from '../db/database.js';
import { createLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('emailer');

// Cargar y compilar templates
function loadTemplate(name) {
  const path = join(__dirname, '../../templates', `${name}.hbs`);
  const source = readFileSync(path, 'utf-8');
  return Handlebars.compile(source);
}

// Crear transporter SMTP
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Mapa de sector → URL de demo en t800labs.com
const SECTOR_DEMO_URLS = {
  peluqueria: 'https://t800labs.com/demo/peluqueria-glamour',
  restaurante: 'https://t800labs.com/demo/restaurante-el-fogon',
  clinica: 'https://t800labs.com/demo/clinica-salud-plus',
  taller: 'https://t800labs.com/demo/taller-motorpro',
  academia: 'https://t800labs.com/demo/academia-einstein',
  tienda: 'https://t800labs.com/demo/tienda-verde-natura',
  gimnasio: 'https://t800labs.com/demo/gimnasio-titan',
  inmobiliaria: 'https://t800labs.com/demo/inmobiliaria-hogar-ideal',
};

// Mapa de tipos de servicio a descripción legible
const SERVICE_DESCRIPTIONS = {
  website: 'web development',
  ecommerce: 'an ecommerce / online store',
  bot: 'a bot',
  chatbot: 'a chatbot',
  automation: 'process automation',
  software: 'custom software development',
  scraping: 'web scraping / data extraction',
  ai_training: 'AI training & consulting for your team',
};

/**
 * Envía un email a un lead
 */
export async function sendEmail(lead, step = 1) {
  const dailyLimit = parseInt(process.env.DAILY_EMAIL_LIMIT || '30');
  const sentToday = getEmailsSentToday();

  if (sentToday >= dailyLimit) {
    log.warn(`Límite diario alcanzado (${sentToday}/${dailyLimit})`);
    return { success: false, reason: 'daily_limit' };
  }

  if (!lead.email) {
    log.warn(`Lead ${lead.name.slice(0, 50)} no tiene email`);
    return { success: false, reason: 'no_email' };
  }

  // Seleccionar templates según tipo de lead
  const isOnline = lead.lead_type === 'online';

  const templateNames = isOnline
    ? { 1: 'online_email1_intro', 2: 'online_email2_portfolio', 3: 'online_email3_oferta' }
    : { 1: 'email1_intro', 2: 'email2_caso', 3: 'email3_oferta' };

  const templateName = templateNames[step] || templateNames[1];
  const template = loadTemplate(templateName);

  // Datos para el template
  const serviceDesc = SERVICE_DESCRIPTIONS[lead.service_type] || 'your project';

  const data = isOnline
    ? {
        postTitle: lead.name,
        serviceDescription: serviceDesc,
        serviceType: lead.service_type,
        description: lead.description,
        sourceUrl: lead.source_url,
        source: lead.source,
        budget: lead.budget_max || lead.budget_min,
        mainProblem: getOnlineProblem(lead),
        senderName: 'Rubén Jarne',
        senderPhone: '645515267',
        linkedinUrl: 'https://linkedin.com/in/rubenbros',
        portfolioUrl: 'https://t800labs.com',
      }
    : {
        businessName: lead.name,
        sector: lead.sector,
        address: lead.address,
        zone: lead.zone,
        hasWebsite: lead.has_website,
        websiteQuality: lead.website_quality,
        hasBooking: lead.has_booking_system,
        hasSocial: lead.has_social_media,
        mainProblem: getLocalProblem(lead),
        demoUrl: lead.demo_url || SECTOR_DEMO_URLS[lead.sector] || null,
        hasPersonalDemo: !!lead.demo_url,
        senderName: 'Rubén Jarne',
        senderPhone: '645515267',
      };

  // Subjects dinámicos según tipo
  const subjects = isOnline
    ? {
        1: `Re: ${lead.name.slice(0, 60)} — I can help`,
        2: `Following up — ${serviceDesc} project`,
        3: `Last message — risk-free offer for your project`,
      }
    : {
        1: `${lead.name} — una idea para tu negocio`,
        2: `Caso de éxito: cómo un negocio como ${lead.name} duplicó sus reservas`,
        3: `Última propuesta para ${lead.name}`,
      };

  const subject = subjects[step];

  let emailId = null;
  try {
    // Registrar en BD primero para obtener el ID del email
    const result = insertEmailSent(lead.id, step, templateName, subject, lead.email);
    emailId = result.lastInsertRowid;

    // Generar tracking pixel URL si está configurada
    const trackerBaseUrl = process.env.TRACKER_BASE_URL;
    if (trackerBaseUrl) {
      data.trackingPixelUrl = `${trackerBaseUrl}/track/${emailId}`;
    }

    const html = template(data);

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: lead.email,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
      },
    });

    // Actualizar estado del lead
    if (lead.status === 'new') {
      const db = getDb();
      db.prepare(`UPDATE leads SET status = 'contacted', contacted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(lead.id);
    }

    log.info(`Email ${step} enviado a ${lead.name.slice(0, 50)} (${lead.email})`);
    return { success: true };

  } catch (err) {
    log.error(`Error enviando email a ${lead.name.slice(0, 50)}: ${err.message}`);
    // Marcar el email como fallido en BD
    if (emailId) {
      try { updateEmailStatus(emailId, 'failed'); } catch {}
    }
    return { success: false, reason: err.message };
  }
}

/**
 * Problema principal para leads locales
 */
function getLocalProblem(lead) {
  if (!lead.has_website) return 'no tienes presencia online y tus clientes no pueden encontrarte fácilmente';
  if (!lead.has_booking_system) return 'no tienes un sistema de reservas online y pierdes clientes que quieren reservar desde el móvil';
  if (lead.website_quality < 40) return 'tu web actual no está optimizada y podría estar alejando a potenciales clientes';
  if (!lead.has_social_media) return 'no tienes presencia en redes sociales donde están tus clientes';
  return 'podrías automatizar muchos procesos de tu negocio y ahorrar tiempo';
}

/**
 * Problema/contexto para leads online
 */
function getOnlineProblem(lead) {
  const descs = {
    bot: "you're looking for a bot and that's exactly what I build",
    chatbot: "you need a chatbot — I've built several for businesses",
    automation: "you want to automate processes and I have solid experience with that",
    website: "you need a professional website and I can deliver it fast",
    ecommerce: "you want to set up an online store — I can help with that",
    software: "you need custom software built — that's my specialty with 7+ years in Java",
    scraping: "you need web scraping and I have production-grade scrapers running",
    ai_training: "you're looking for AI training — I'm an AI & Software Development teacher with hands-on experience building AI agents and automation",
  };
  return descs[lead.service_type] || "you're looking for development help and I can assist";
}

/**
 * Ejecuta el envío automático de emails (secuencias)
 */
export async function runEmailSequences() {
  // Comprobar si los envíos están pausados
  if (getSetting('emails_paused', 'false') === 'true') {
    log.info('Envíos automáticos pausados. Usa /pause en Telegram para reanudar.');
    return { sent: 0, paused: true };
  }

  log.info('Iniciando secuencia de emails...');

  const dailyLimit = parseInt(process.env.DAILY_EMAIL_LIMIT || '30');
  let sent = getEmailsSentToday();

  // Paso 1: Enviar primer email a leads nuevos calientes
  if (sent < dailyLimit) {
    const newLeads = getLeadsToContact(dailyLimit - sent);
    for (const lead of newLeads) {
      if (sent >= dailyLimit) break;
      const result = await sendEmail(lead, 1);
      if (result.success) sent++;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Paso 2: Follow-up (email 2) a los que no respondieron tras 5 días
  if (sent < dailyLimit) {
    const followUp2 = getLeadsForFollowUp(1, 5);
    for (const lead of followUp2) {
      if (sent >= dailyLimit) break;
      const result = await sendEmail(lead, 2);
      if (result.success) sent++;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Paso 3: Último email (email 3) a los que no respondieron tras 10 días del email 2
  if (sent < dailyLimit) {
    const followUp3 = getLeadsForFollowUp(2, 10);
    for (const lead of followUp3) {
      if (sent >= dailyLimit) break;
      const result = await sendEmail(lead, 3);
      if (result.success) sent++;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  log.info(`Secuencia completada: ${sent} emails enviados hoy`);
  return { sent };
}
