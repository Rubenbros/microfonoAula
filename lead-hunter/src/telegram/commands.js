import { Bot, InlineKeyboard } from 'grammy';
import { getLeadStats, getLeadsByTier, getLeadById, updateLeadStatus, getDb, getOnlineLeads, getSetting, setSetting, getLastEmailForLead, getDemoVisitStats, getLeadsWithDemos, getDemoVisit, getEmailOpenStats } from '../db/database.js';
import { sendEmail } from '../emailer/sender.js';
import { scanGoogleMaps, saveResults } from '../scraper/maps.js';
import { scanAllReddit } from '../scraper/reddit.js';
import { scanGoogleLinkedIn } from '../scraper/google-linkedin.js';
import { scoreNewLeads } from '../analyzer/scorer.js';
import { createLogger } from '../logger.js';

const log = createLogger('telegram');

let bot;
const ADMIN_ID = parseInt(process.env.TELEGRAM_ADMIN_ID);

export function createBot() {
  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  // Middleware: solo admin
  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    await next();
  });

  // /start
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '🎯 *Lead Hunter* — Captación automática\n\n' +
      '*Leads locales:*\n' +
      '🔍 /scan — Escanear Google Maps\n' +
      '🔥 /hot — Leads calientes\n' +
      '📋 /leads — Últimos leads\n\n' +
      '*Leads online:*\n' +
      '🌐 /online — Leads online (Reddit, LinkedIn)\n' +
      '🔎 /scanreddit — Escanear Reddit\n' +
      '💼 /scanlinkedin — Escanear LinkedIn via Google\n\n' +
      '*Acciones:*\n' +
      '📧 /send <id> — Enviar email a un lead\n' +
      '📋 /detail <id> — Ver detalle de un lead\n' +
      '⏸️ /pause — Pausar/reanudar envíos\n\n' +
      '*General:*\n' +
      '📊 /stats — Estadísticas\n' +
      '📈 /pipeline — Pipeline de ventas\n' +
      '🔄 /analyze — Puntuar leads nuevos\n' +
      '📡 /sources — Desglose por fuente\n' +
      '🎨 /demos — Estado de demos y visitas',
      { parse_mode: 'Markdown' }
    );
  });

  // /stats — Estadísticas generales
  bot.command('stats', async (ctx) => {
    const stats = getLeadStats();
    const db = getDb();
    const emailsToday = db.prepare("SELECT COUNT(*) as c FROM emails_sent WHERE DATE(sent_at) = DATE('now')").get().c;

    let sourceInfo = '';
    if (stats.bySource && stats.bySource.length > 0) {
      sourceInfo = '\n*Por fuente:*\n';
      for (const s of stats.bySource) {
        const emoji = s.source === 'reddit' ? '🌐' : s.source === 'google_maps' ? '📍' : s.source === 'linkedin' ? '💼' : '📌';
        sourceInfo += `${emoji} ${s.source}: ${s.c}\n`;
      }
    }

    // Stats de demos
    let demoInfo = '';
    try {
      const demoStats = getDemoVisitStats();
      if (demoStats.totalDemos > 0) {
        demoInfo = `\n*Demos:*\n` +
          `🎨 Registradas: ${demoStats.totalDemos}\n` +
          `👀 Visitadas: ${demoStats.demosVisited}\n` +
          `📊 Visitas totales: ${demoStats.totalVisits}\n`;
      }
    } catch { /* tabla puede no existir aún */ }

    // Stats de apertura de emails
    let openInfo = '';
    try {
      const openStats = getEmailOpenStats();
      if (openStats.total > 0) {
        openInfo = `\n*Aperturas:*\n` +
          `📬 Abiertos: ${openStats.opened}/${openStats.total} (${openStats.rate}%)\n` +
          `📬 Abiertos hoy: ${openStats.openedToday}\n`;
      }
    } catch { /* por si acaso */ }

    await ctx.reply(
      '📊 *Estadísticas Lead Hunter*\n\n' +
      `Total leads: *${stats.total}*\n` +
      `📍 Locales: ${stats.totalLocal} | 🌐 Online: ${stats.totalOnline}\n\n` +
      `🔥 Calientes: *${stats.hot}* (📍${stats.hotLocal} / 🌐${stats.hotOnline})\n` +
      `🟡 Tibios: *${stats.warm}*\n` +
      `🔵 Fríos: *${stats.cold}*\n\n` +
      `📧 Emails hoy: *${emailsToday}*\n` +
      `✉️ Contactados: *${stats.contacted}*\n` +
      `💬 Respondidos: *${stats.replied}*\n` +
      `🤝 Reuniones: *${stats.meetings}*\n` +
      `✅ Clientes: *${stats.clients}*` +
      openInfo +
      demoInfo +
      sourceInfo,
      { parse_mode: 'Markdown' }
    );
  });

  // /hot — Leads calientes (locales + online)
  bot.command('hot', async (ctx) => {
    const leads = getLeadsByTier('hot', 15);

    if (leads.length === 0) {
      return ctx.reply('No hay leads calientes. Lanza un escaneo con /scan o /scanreddit');
    }

    const localLeads = leads.filter(l => l.lead_type !== 'online');
    const onlineLeads = leads.filter(l => l.lead_type === 'online');

    let msg = '🔥 *Leads calientes:*\n\n';

    if (localLeads.length > 0) {
      msg += '*📍 Locales:*\n';
      for (const lead of localLeads) {
        msg += `*${lead.name}*\n`;
        msg += `📍 ${lead.address || 'Sin dirección'}\n`;
        msg += `⭐ ${lead.rating || '?'}★ | 📊 ${lead.lead_score}pts | ${lead.status}\n\n`;
      }
    }

    if (onlineLeads.length > 0) {
      msg += '*🌐 Online:*\n';
      for (const lead of onlineLeads) {
        const timeAgo = getTimeAgo(lead.post_date);
        msg += `*${lead.name.slice(0, 80)}*\n`;
        msg += `📌 ${lead.source} ${lead.sector} — ${timeAgo}\n`;
        if (lead.budget_max) msg += `💰 $${lead.budget_min || '?'}-$${lead.budget_max}\n`;
        msg += `🤖 ${lead.service_type || '?'} | 📊 ${lead.lead_score}pts\n\n`;
      }
    }

    const keyboard = new InlineKeyboard()
      .text('📧 Email a hot locales', 'email_all_hot')
      .row()
      .text('📋 Ver detalles', 'details_hot');

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // /leads — Últimos leads (todos)
  bot.command('leads', async (ctx) => {
    const db = getDb();
    const leads = db.prepare('SELECT * FROM leads ORDER BY found_at DESC LIMIT 15').all();

    if (leads.length === 0) {
      return ctx.reply('No hay leads todavía. Lanza un escaneo con /scan o /scanreddit');
    }

    let msg = '📋 *Últimos leads encontrados:*\n\n';
    for (const lead of leads) {
      const tierEmoji = lead.lead_tier === 'hot' ? '🔥' : lead.lead_tier === 'warm' ? '🟡' : '🔵';
      const typeEmoji = lead.lead_type === 'online' ? '🌐' : '📍';
      msg += `${tierEmoji}${typeEmoji} *${lead.name.slice(0, 60)}* (${lead.lead_score}pts)\n`;
      if (lead.lead_type === 'online') {
        msg += `   ${lead.source} — ${lead.service_type || '?'}\n`;
      } else {
        msg += `   ${lead.sector} — ${lead.zone}\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /online — Leads online recientes
  bot.command('online', async (ctx) => {
    const leads = getOnlineLeads(15);

    if (leads.length === 0) {
      return ctx.reply('No hay leads online. Lanza /scanreddit para buscar en Reddit.');
    }

    let msg = '🌐 *Leads online recientes:*\n\n';
    for (const lead of leads) {
      const tierEmoji = lead.lead_tier === 'hot' ? '🔥' : lead.lead_tier === 'warm' ? '🟡' : '🔵';
      const timeAgo = getTimeAgo(lead.post_date);
      msg += `${tierEmoji} *${lead.name.slice(0, 70)}*\n`;
      msg += `📌 ${lead.source} ${lead.sector} — ${timeAgo}\n`;
      if (lead.budget_max) msg += `💰 $${lead.budget_max}`;
      if (lead.service_type) msg += ` | 🤖 ${lead.service_type}`;
      msg += ` | 📊 ${lead.lead_score}pts\n`;
      msg += `🔗 ${lead.source_url || 'sin link'}\n\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  // /sources — Desglose por fuente
  bot.command('sources', async (ctx) => {
    const stats = getLeadStats();

    let msg = '📡 *Leads por fuente:*\n\n';
    if (stats.bySource && stats.bySource.length > 0) {
      for (const s of stats.bySource) {
        const emoji = s.source === 'reddit' ? '🌐' : s.source === 'google_maps' ? '📍' : s.source === 'linkedin' ? '💼' : '📌';
        msg += `${emoji} *${s.source}*: ${s.c} leads\n`;
      }
    } else {
      msg += 'No hay datos todavía.';
    }

    msg += `\n*Total:* ${stats.total} leads`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /demos — Ver estado de demos y visitas
  bot.command('demos', async (ctx) => {
    try {
      const demoStats = getDemoVisitStats();
      const leadsWithDemos = getLeadsWithDemos();

      if (leadsWithDemos.length === 0) {
        return ctx.reply('No hay demos registradas todavía.');
      }

      let msg = '🎨 *Demos personalizadas*\n\n' +
        `Total: *${demoStats.totalDemos}* demos\n` +
        `👀 Visitadas: *${demoStats.demosVisited}*\n` +
        `📊 Visitas totales: *${demoStats.totalVisits}*\n\n`;

      // Últimas visitas
      if (demoStats.recentVisits.length > 0) {
        msg += '*Últimas visitas:*\n';
        for (const v of demoStats.recentVisits) {
          const timeAgo = getTimeAgo(v.last_visit_at);
          msg += `👀 *${v.name}* — ${v.visit_count} visitas (${timeAgo})\n`;
        }
        msg += '\n';
      }

      // Demos sin visitas
      const noVisits = leadsWithDemos.filter(l => {
        const visit = getDemoVisit(l.id);
        return !visit || visit.visit_count === 0;
      });

      if (noVisits.length > 0) {
        msg += `*Sin visitas (${noVisits.length}):*\n`;
        for (const l of noVisits.slice(0, 10)) {
          msg += `🎨 ${l.name} — ${l.demo_slug}\n`;
        }
        if (noVisits.length > 10) msg += `  ... y ${noVisits.length - 10} más\n`;
      }

      await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /scanreddit — Escanear Reddit
  bot.command('scanreddit', async (ctx) => {
    await ctx.reply('🌐 Escaneando Reddit... Esto puede tardar 1-2 minutos.');

    try {
      const result = await scanAllReddit();
      await ctx.reply(
        `✅ *Escaneo Reddit completado*\n\n` +
        `Posts encontrados: ${result.total}\n` +
        `Nuevos: ${result.new}\n\n` +
        `Usa /analyze para puntuar los nuevos leads.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply(`❌ Error en escaneo Reddit: ${err.message}`);
    }
  });

  // /scanlinkedin — Escanear LinkedIn via Google
  bot.command('scanlinkedin', async (ctx) => {
    await ctx.reply('💼 Escaneando LinkedIn via Google... Esto puede tardar 2-3 minutos.');

    try {
      const result = await scanGoogleLinkedIn();
      await ctx.reply(
        `✅ *Escaneo LinkedIn completado*\n\n` +
        `Resultados: ${result.total}\n` +
        `Nuevos: ${result.new}\n\n` +
        `Usa /analyze para puntuar los nuevos leads.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply(`❌ Error en escaneo LinkedIn: ${err.message}`);
    }
  });

  // /scan <zona> <sector> — Lanzar escaneo Google Maps
  bot.command('scan', async (ctx) => {
    const args = ctx.match?.trim();

    if (!args) {
      const keyboard = new InlineKeyboard()
        .text('Peluquerías Zaragoza', 'scan_Zaragoza_peluquería')
        .row()
        .text('Restaurantes Zaragoza', 'scan_Zaragoza_restaurante')
        .row()
        .text('Dentistas Zaragoza', 'scan_Zaragoza_dentista')
        .row()
        .text('Talleres Zaragoza', 'scan_Zaragoza_taller mecánico')
        .row()
        .text('Peluquerías Utebo', 'scan_Utebo_peluquería');

      return ctx.reply(
        '🔍 *Escaneo Google Maps*\n\nElige una opción o escribe:\n`/scan Zaragoza peluquería`',
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }

    const parts = args.split(' ');
    const zone = parts[0];
    const sector = parts.slice(1).join(' ');

    await ctx.reply(`🔍 Escaneando *${sector}* en *${zone}*... Esto puede tardar unos minutos.`, { parse_mode: 'Markdown' });

    try {
      const results = await scanGoogleMaps(zone, sector, 30);
      const saved = await saveResults(results, zone, sector);

      await ctx.reply(
        `✅ *Escaneo completado*\n\n` +
        `Encontrados: ${saved.total}\n` +
        `Nuevos: ${saved.new}\n\n` +
        `Usa /analyze para puntuar los nuevos leads.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply(`❌ Error en escaneo: ${err.message}`);
    }
  });

  // /analyze — Puntuar leads nuevos
  bot.command('analyze', async (ctx) => {
    await ctx.reply('🔄 Analizando y puntuando leads nuevos...');

    try {
      const result = await scoreNewLeads();
      await ctx.reply(
        `✅ *Análisis completado*\n\n` +
        `Procesados: ${result.processed}\n` +
        `🔥 Calientes: ${result.hot}\n` +
        `🟡 Tibios: ${result.warm}\n` +
        `🔵 Fríos: ${result.cold}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /pipeline — Ver pipeline de ventas
  bot.command('pipeline', async (ctx) => {
    const db = getDb();
    const pipeline = {
      new: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'new'").get().c,
      contacted: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'contacted'").get().c,
      replied: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'replied'").get().c,
      meeting: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'meeting'").get().c,
      client: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'client'").get().c,
      discarded: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'discarded'").get().c,
    };

    const total = Object.values(pipeline).reduce((a, b) => a + b, 0);
    const barWidth = 20;

    let msg = '📈 *Pipeline de ventas*\n\n';
    for (const [status, count] of Object.entries(pipeline)) {
      const pct = total > 0 ? (count / total * 100).toFixed(0) : 0;
      const filled = total > 0 ? Math.round(count / total * barWidth) : 0;
      const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
      const emoji = { new: '🆕', contacted: '✉️', replied: '💬', meeting: '🤝', client: '✅', discarded: '❌' }[status];
      msg += `${emoji} ${status}: ${bar} ${count} (${pct}%)\n`;
    }

    const localCount = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'local'").get().c;
    const onlineCount = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'online'").get().c;
    msg += `\n📍 Locales: ${localCount} | 🌐 Online: ${onlineCount}`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /send <id> — Enviar email a un lead específico
  bot.command('send', async (ctx) => {
    const idStr = ctx.match?.trim();
    if (!idStr) {
      return ctx.reply('Uso: `/send 42` — envía email al lead con ese ID', { parse_mode: 'Markdown' });
    }

    const id = parseInt(idStr);
    const lead = getLeadById(id);

    if (!lead) {
      return ctx.reply(`❌ Lead #${id} no encontrado`);
    }

    if (!lead.email) {
      return ctx.reply(`❌ Lead *${lead.name}* no tiene email registrado`, { parse_mode: 'Markdown' });
    }

    const lastEmail = getLastEmailForLead(id);
    const nextStep = lastEmail ? lastEmail.sequence_step + 1 : 1;

    if (nextStep > 3) {
      return ctx.reply(`⚠️ Lead *${lead.name}* ya recibió los 3 emails de la secuencia`, { parse_mode: 'Markdown' });
    }

    await ctx.reply(`📧 Enviando email ${nextStep}/3 a *${lead.name}* (${lead.email})...`, { parse_mode: 'Markdown' });

    try {
      const result = await sendEmail(lead, nextStep);
      if (result.success) {
        await ctx.reply(`✅ Email ${nextStep} enviado a *${lead.name}*`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ Error: ${result.reason}`);
      }
    } catch (err) {
      await ctx.reply(`❌ Error enviando email: ${err.message}`);
    }
  });

  // /pause — Pausar/reanudar envíos automáticos
  bot.command('pause', async (ctx) => {
    const current = getSetting('emails_paused', 'false');
    const newValue = current === 'true' ? 'false' : 'true';
    setSetting('emails_paused', newValue);

    if (newValue === 'true') {
      await ctx.reply('⏸️ Envíos automáticos *pausados*.\nUsa /pause de nuevo para reanudar.', { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('▶️ Envíos automáticos *reanudados*.', { parse_mode: 'Markdown' });
    }
  });

  // /detail <id> — Ver detalles completos de un lead
  bot.command('detail', async (ctx) => {
    const idStr = ctx.match?.trim();
    if (!idStr) {
      return ctx.reply('Uso: `/detail 42`', { parse_mode: 'Markdown' });
    }

    const lead = getLeadById(parseInt(idStr));
    if (!lead) {
      return ctx.reply(`❌ Lead #${idStr} no encontrado`);
    }

    const db = getDb();
    const emails = db.prepare('SELECT * FROM emails_sent WHERE lead_id = ? ORDER BY sent_at DESC').all(lead.id);

    const tierEmoji = lead.lead_tier === 'hot' ? '🔥' : lead.lead_tier === 'warm' ? '🟡' : '🔵';
    const typeEmoji = lead.lead_type === 'online' ? '🌐' : '📍';

    let msg = `${tierEmoji}${typeEmoji} *${lead.name}*\n\n`;
    msg += `📊 Score: *${lead.lead_score}pts* (${lead.lead_tier})\n`;
    msg += `📌 Estado: *${lead.status}*\n`;
    msg += `🏷️ Tipo: ${lead.lead_type} | Fuente: ${lead.source}\n`;

    if (lead.lead_type === 'online') {
      if (lead.description) msg += `📝 ${lead.description.slice(0, 200)}\n`;
      if (lead.budget_max) msg += `💰 $${lead.budget_min || '?'}-$${lead.budget_max}\n`;
      if (lead.service_type) msg += `🤖 Servicio: ${lead.service_type}\n`;
      if (lead.source_url) msg += `🔗 ${lead.source_url}\n`;
    } else {
      if (lead.address) msg += `📍 ${lead.address}\n`;
      if (lead.phone) msg += `📞 ${lead.phone}\n`;
      if (lead.email) msg += `📧 ${lead.email}\n`;
      if (lead.website) msg += `🌐 ${lead.website}\n`;
      if (lead.rating) msg += `⭐ ${lead.rating}★ (${lead.review_count || 0} reseñas)\n`;
      msg += `🔍 Web: ${lead.has_website ? 'sí' : 'no'} | Reservas: ${lead.has_booking_system ? 'sí' : 'no'} | RRSS: ${lead.has_social_media ? 'sí' : 'no'}\n`;
      if (lead.demo_url) msg += `🎨 Demo: ${lead.demo_url}\n`;
    }

    if (emails.length > 0) {
      msg += `\n*Emails enviados (${emails.length}):*\n`;
      for (const e of emails) {
        const openedIcon = e.opened_at ? '👁️' : '—';
        const statusIcon = e.status === 'failed' ? '❌' : '✅';
        msg += `  ${statusIcon} Paso ${e.sequence_step} — ${e.sent_at.slice(0, 10)} ${openedIcon}\n`;
      }
    }

    // Info de demo
    if (lead.demo_slug) {
      try {
        const visit = getDemoVisit(lead.id);
        if (visit && visit.visit_count > 0) {
          msg += `\n👀 *Demo visitada:* ${visit.visit_count} veces (última: ${getTimeAgo(visit.last_visit_at)})\n`;
        } else {
          msg += `\n🎨 Demo registrada (sin visitas aún)\n`;
        }
      } catch {}
    }

    const keyboard = new InlineKeyboard();
    if (lead.email && lead.status === 'new') {
      keyboard.text('📧 Enviar email', `send_${lead.id}`).row();
    }
    keyboard
      .text('✅ Cliente', `status_${lead.id}_client`)
      .text('💬 Respondió', `status_${lead.id}_replied`)
      .row()
      .text('🤝 Reunión', `status_${lead.id}_meeting`)
      .text('❌ Descartar', `status_${lead.id}_discarded`);

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard, disable_web_page_preview: true });
  });

  // Callback queries (botones inline)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('scan_')) {
      const [, zone, ...sectorParts] = data.split('_');
      const sector = sectorParts.join('_');
      await ctx.answerCallbackQuery('Iniciando escaneo...');
      await ctx.reply(`🔍 Escaneando *${sector}* en *${zone}*...`, { parse_mode: 'Markdown' });

      const results = await scanGoogleMaps(zone, sector, 30);
      const saved = await saveResults(results, zone, sector);
      await ctx.reply(`✅ Encontrados: ${saved.total}, Nuevos: ${saved.new}`);
    }

    if (data === 'email_all_hot') {
      await ctx.answerCallbackQuery('Enviando emails...');
      const leads = getLeadsByTier('hot', 10);
      let sent = 0;
      for (const lead of leads) {
        if (lead.email && lead.status === 'new') {
          const result = await sendEmail(lead, 1);
          if (result.success) sent++;
        }
      }
      await ctx.reply(`📧 Enviados ${sent} emails a leads calientes`);
    }

    if (data === 'details_hot') {
      await ctx.answerCallbackQuery();
      const leads = getLeadsByTier('hot', 5);
      for (const lead of leads) {
        const tierEmoji = lead.lead_type === 'online' ? '🌐' : '📍';
        let msg = `${tierEmoji} *${lead.name}*\n📊 ${lead.lead_score}pts | ${lead.status}\n`;
        if (lead.email) msg += `📧 ${lead.email}\n`;
        if (lead.phone) msg += `📞 ${lead.phone}\n`;
        if (lead.demo_url) msg += `🎨 ${lead.demo_url}\n`;

        const kb = new InlineKeyboard()
          .text('📋 Detalle', `detail_${lead.id}`)
          .text('📧 Email', `send_${lead.id}`);

        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb, disable_web_page_preview: true });
      }
    }

    // Enviar email a lead específico desde botón
    if (data.startsWith('send_')) {
      const leadId = parseInt(data.split('_')[1]);
      await ctx.answerCallbackQuery('Enviando...');
      const lead = getLeadById(leadId);
      if (!lead || !lead.email) {
        return ctx.reply('❌ Lead no encontrado o sin email');
      }
      const lastEmail = getLastEmailForLead(leadId);
      const step = lastEmail ? lastEmail.sequence_step + 1 : 1;
      if (step > 3) {
        return ctx.reply(`⚠️ *${lead.name}* ya recibió los 3 emails`, { parse_mode: 'Markdown' });
      }
      const result = await sendEmail(lead, step);
      if (result.success) {
        await ctx.reply(`✅ Email ${step}/3 enviado a *${lead.name}*`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ Error: ${result.reason}`);
      }
    }

    // Cambiar estado de lead desde botón
    if (data.startsWith('status_')) {
      const parts = data.split('_');
      const leadId = parseInt(parts[1]);
      const newStatus = parts[2];
      await ctx.answerCallbackQuery(`Estado → ${newStatus}`);
      updateLeadStatus(leadId, newStatus, null);
      const lead = getLeadById(leadId);
      const emoji = { client: '✅', replied: '💬', meeting: '🤝', discarded: '❌' }[newStatus] || '📌';
      await ctx.reply(`${emoji} *${lead.name}* → *${newStatus}*`, { parse_mode: 'Markdown' });
    }

    // Ver detalle de lead desde botón
    if (data.startsWith('detail_')) {
      const leadId = parseInt(data.split('_')[1]);
      await ctx.answerCallbackQuery();
      const lead = getLeadById(leadId);
      if (!lead) return ctx.reply(`❌ Lead #${leadId} no encontrado`);

      const db = getDb();
      const emails = db.prepare('SELECT * FROM emails_sent WHERE lead_id = ? ORDER BY sent_at DESC').all(lead.id);
      const tierEmoji = lead.lead_tier === 'hot' ? '🔥' : lead.lead_tier === 'warm' ? '🟡' : '🔵';
      const typeEmoji = lead.lead_type === 'online' ? '🌐' : '📍';

      let msg = `${tierEmoji}${typeEmoji} *${lead.name}*\n📊 ${lead.lead_score}pts | ${lead.status}\n`;
      if (lead.email) msg += `📧 ${lead.email}\n`;
      if (lead.phone) msg += `📞 ${lead.phone}\n`;
      if (lead.address) msg += `📍 ${lead.address}\n`;
      if (lead.demo_url) msg += `🎨 ${lead.demo_url}\n`;
      if (emails.length > 0) {
        msg += `\n✉️ ${emails.length} email(s) enviados\n`;
      }

      const kb = new InlineKeyboard();
      if (lead.email && lead.status === 'new') kb.text('📧 Enviar email', `send_${lead.id}`).row();
      kb.text('✅ Cliente', `status_${lead.id}_client`)
        .text('💬 Respondió', `status_${lead.id}_replied`).row()
        .text('🤝 Reunión', `status_${lead.id}_meeting`)
        .text('❌ Descartar', `status_${lead.id}_discarded`);

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb, disable_web_page_preview: true });
    }
  });

  return bot;
}

/**
 * Calcula tiempo relativo (hace Xh, hace Xd)
 */
function getTimeAgo(dateStr) {
  if (!dateStr) return '?';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'hace <1h';
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

/**
 * Envía notificación al admin
 */
export async function notifyAdmin(message) {
  if (!bot) return;
  try {
    await bot.api.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    log.error(`Error enviando notificación: ${err.message}`);
  }
}

/**
 * Envía resumen matutino
 */
export async function sendMorningSummary() {
  const stats = getLeadStats();
  const db = getDb();
  const newToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE DATE(found_at) = DATE('now')").get().c;

  let msg =
    '☀️ *Resumen matutino Lead Hunter*\n\n' +
    `Leads nuevos hoy: ${newToday}\n` +
    `Total: ${stats.total} (📍${stats.totalLocal} locales, 🌐${stats.totalOnline} online)\n` +
    `🔥 Calientes: ${stats.hot} (📍${stats.hotLocal} / 🌐${stats.hotOnline})\n` +
    `Pendientes: ${stats.total - stats.contacted - stats.clients}\n` +
    `Respondidos: ${stats.replied} | Clientes: ${stats.clients}`;

  // Stats de aperturas
  try {
    const openStats = getEmailOpenStats();
    if (openStats.total > 0) {
      msg += `\n\n📬 Aperturas: ${openStats.opened}/${openStats.total} (${openStats.rate}%)`;
    }
  } catch {}

  // Stats de demos
  try {
    const demoStats = getDemoVisitStats();
    if (demoStats.totalVisits > 0) {
      msg += `\n🎨 Demos visitadas: ${demoStats.demosVisited}/${demoStats.totalDemos} (${demoStats.totalVisits} visitas)`;
    }
  } catch {}

  await notifyAdmin(msg);
}

/**
 * Notifica al admin que un lead visitó su demo personalizada
 */
export async function notifyDemoVisit(lead, visitData) {
  const timeAgo = visitData.lastVisitAt ? getTimeAgo(visitData.lastVisitAt) : '?';

  const msg =
    '👀 *Visita a demo!*\n\n' +
    `🏪 *${lead.name}* ha visitado su demo\n` +
    `🔗 ${lead.demo_url || `t800labs.com/demo/${lead.demo_slug}`}\n` +
    `📊 Visitas totales: *${visitData.visitCount}*\n` +
    `🆕 Nuevas: ${visitData.newVisits}\n` +
    `🕐 ${timeAgo}\n` +
    `📋 /detail ${lead.id}`;

  await notifyAdmin(msg);
}

/**
 * Envía resumen nocturno
 */
export async function sendEveningSummary() {
  const db = getDb();
  const emailsToday = db.prepare("SELECT COUNT(*) as c FROM emails_sent WHERE DATE(sent_at) = DATE('now')").get().c;
  const newToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE DATE(found_at) = DATE('now')").get().c;

  let msg =
    '🌙 *Resumen del día*\n\n' +
    `📧 Emails enviados: ${emailsToday}\n` +
    `🆕 Leads nuevos: ${newToday}`;

  // Aperturas de hoy
  try {
    const openStats = getEmailOpenStats();
    if (openStats.openedToday > 0) {
      msg += `\n📬 Emails abiertos hoy: ${openStats.openedToday}`;
    }
  } catch {}

  // Visitas a demos
  try {
    const demoStats = getDemoVisitStats();
    if (demoStats.recentVisits.length > 0) {
      msg += '\n\n*Visitas a demos hoy:*';
      for (const v of demoStats.recentVisits.slice(0, 3)) {
        msg += `\n👀 ${v.name} — ${v.visit_count} visitas`;
      }
    }
  } catch {}

  msg += '\n\nMañana seguimos. Buenas noches.';

  await notifyAdmin(msg);
}
