import { Bot, InlineKeyboard } from 'grammy';
import { getLeadStats, getLeadsByTier, getLeadById, updateLeadStatus, getDb, getOnlineLeads, getSetting, setSetting, getLastEmailForLead, getDemoVisitStats, getLeadsWithDemos, getDemoVisit, getEmailOpenStats, getFreelanceStats, getFreelanceOpportunities, getFreelanceOpportunityById, updateFreelanceOpportunity, getFreelanceClients, getFreelanceProjects, getFreelanceFinanceSummary, insertFreelanceFinance, getPlatformBalances } from '../db/database.js';
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
      '*Freelance:*\n' +
      '💼 /freelance — Dashboard freelance\n' +
      '🔍 /opportunities — Top oportunidades\n' +
      '👤 /clients — Clientes activos\n' +
      '📁 /projects — Proyectos en curso\n' +
      '💰 /income — Ingresos del mes\n' +
      '💸 /expense — Registrar gasto\n' +
      '💳 /balance — Balance mensual\n' +
      '🎫 /credits — Créditos plataformas\n\n' +
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

  // === COMANDOS FREELANCE ===

  // /freelance — Dashboard rápido freelance
  bot.command('freelance', async (ctx) => {
    try {
      const stats = getFreelanceStats();
      const balance = stats.revenue.thisMonth - stats.expenses.thisMonth;
      const balanceEmoji = balance >= 0 ? '📈' : '📉';

      let msg = '💼 *Dashboard Freelance*\n\n';
      msg += `*Ingresos este mes:* ${stats.revenue.thisMonth.toLocaleString()}€\n`;
      msg += `*Gastos este mes:* ${stats.expenses.thisMonth.toLocaleString()}€\n`;
      msg += `${balanceEmoji} *Balance:* ${balance.toLocaleString()}€\n\n`;
      msg += `👤 Clientes: ${stats.clients.active} activos (${stats.clients.total} total)\n`;
      msg += `📁 Proyectos: ${stats.projects.active} en curso\n`;
      msg += `🔍 Oportunidades: ${stats.opportunities.hot} hot | ${stats.opportunities.total} total\n`;
      msg += `✅ Aplicados: ${stats.opportunities.applied} | Ganados: ${stats.opportunities.won}\n\n`;
      msg += `*Año:* ${stats.revenue.thisYear.toLocaleString()}€ ingresos`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /opportunities — Top oportunidades por match score
  bot.command('opportunities', async (ctx) => {
    try {
      const { opportunities } = getFreelanceOpportunities({ min_score: 40, limit: 10 });

      if (opportunities.length === 0) {
        return ctx.reply('No hay oportunidades interesantes. Lanza un scan desde /scan o el panel web.');
      }

      let msg = '🔍 *Top oportunidades freelance:*\n\n';
      for (const opp of opportunities) {
        const tier = opp.match_score >= 70 ? '🔥' : opp.match_score >= 40 ? '🟡' : '🔵';
        const budget = opp.budget_max ? `$${opp.budget_min || '?'}-$${opp.budget_max}` :
          opp.budget_min ? `$${opp.budget_min}+` : '?';
        const skills = opp.skills_required ? JSON.parse(opp.skills_required).slice(0, 3).join(', ') : '';

        msg += `${tier} *${opp.title.slice(0, 60)}*\n`;
        msg += `📊 ${opp.match_score}pts | ${opp.platform} | ${budget}\n`;
        if (skills) msg += `🔧 ${skills}\n`;
        msg += `📋 /opp\\_${opp.id}\n\n`;
      }

      await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /opp_<id> — Detalle de oportunidad (via texto, no comando real)
  bot.hears(/^\/opp_(\d+)$/, async (ctx) => {
    try {
      const id = parseInt(ctx.match[1]);
      const opp = getFreelanceOpportunityById(id);
      if (!opp) return ctx.reply(`❌ Oportunidad #${id} no encontrada`);

      const tier = opp.match_score >= 70 ? '🔥' : opp.match_score >= 40 ? '🟡' : '🔵';
      const skills = opp.skills_required ? JSON.parse(opp.skills_required).join(', ') : 'No especificadas';
      const budget = opp.budget_max ? `$${opp.budget_min || '?'} - $${opp.budget_max}` :
        opp.budget_min ? `$${opp.budget_min}+` : 'No especificado';

      let msg = `${tier} *${opp.title}*\n\n`;
      msg += `📊 Score: *${opp.match_score}pts* | Estado: ${opp.status}\n`;
      msg += `📌 Plataforma: ${opp.platform}\n`;
      msg += `💰 Budget: ${budget} (${opp.budget_type || '?'})\n`;
      msg += `🔧 Skills: ${skills}\n`;
      if (opp.country) msg += `🌍 País: ${opp.country}\n`;
      if (opp.proposals_count) msg += `📝 Propuestas: ${opp.proposals_count}\n`;
      if (opp.client_rating) msg += `⭐ Rating cliente: ${opp.client_rating}\n`;
      if (opp.urgency) msg += `⚡ Urgencia: ${opp.urgency}\n`;
      msg += `\n📝 ${(opp.description || 'Sin descripción').slice(0, 300)}`;
      if (opp.description?.length > 300) msg += '...';

      const keyboard = new InlineKeyboard();
      if (opp.url) keyboard.url('🔗 Ver original', opp.url).row();
      if (opp.status === 'new' || opp.status === 'interested') {
        keyboard
          .text('⚡ Interesado', `fopp_interested_${opp.id}`)
          .text('✅ Aplicar', `fopp_applied_${opp.id}`)
          .row()
          .text('❌ Skip', `fopp_skipped_${opp.id}`);
      }

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard, disable_web_page_preview: true });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /clients — Clientes activos
  bot.command('clients', async (ctx) => {
    try {
      const { clients } = getFreelanceClients({ status: 'active', limit: 15 });

      if (clients.length === 0) {
        const { clients: allClients } = getFreelanceClients({ limit: 10 });
        if (allClients.length === 0) return ctx.reply('No hay clientes registrados aún.');
        let msg = '👤 *Clientes (no hay activos):*\n\n';
        for (const c of allClients) {
          msg += `${c.status === 'prospect' ? '🔵' : '⚪'} *${c.name}* (${c.status})\n`;
          if (c.total_revenue > 0) msg += `  💰 ${c.total_revenue.toLocaleString()}€ | ${c.projects_count} proyectos\n`;
        }
        return ctx.reply(msg, { parse_mode: 'Markdown' });
      }

      let msg = '👤 *Clientes activos:*\n\n';
      for (const c of clients) {
        msg += `✅ *${c.name}*`;
        if (c.company) msg += ` (${c.company})`;
        msg += '\n';
        msg += `  💰 ${c.total_revenue.toLocaleString()}€ | 📁 ${c.projects_count} proyectos\n`;
        if (c.source) msg += `  📌 ${c.source}`;
        if (c.country) msg += ` | 🌍 ${c.country}`;
        msg += '\n\n';
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /projects — Proyectos en curso
  bot.command('projects', async (ctx) => {
    try {
      const { projects } = getFreelanceProjects({ status: 'in_progress', limit: 10 });

      if (projects.length === 0) {
        const { projects: allProjects } = getFreelanceProjects({ limit: 10 });
        if (allProjects.length === 0) return ctx.reply('No hay proyectos registrados aún.');
        let msg = '📁 *Proyectos recientes:*\n\n';
        for (const p of allProjects) {
          const emoji = { proposal: '📝', negotiation: '🤝', in_progress: '🔄', delivered: '📦', paid: '✅', closed: '🔒', cancelled: '❌' }[p.status] || '📋';
          msg += `${emoji} *${p.name}* (${p.status})\n`;
          if (p.agreed_price) msg += `  💰 ${p.agreed_price.toLocaleString()} ${p.currency}\n`;
        }
        return ctx.reply(msg, { parse_mode: 'Markdown' });
      }

      let msg = '📁 *Proyectos en curso:*\n\n';
      for (const p of projects) {
        msg += `🔄 *${p.name}*\n`;
        if (p.agreed_price) msg += `  💰 ${p.agreed_price.toLocaleString()} ${p.currency}`;
        if (p.total_paid > 0) msg += ` (cobrado: ${p.total_paid.toLocaleString()})`;
        msg += '\n';
        if (p.deadline) msg += `  ⏰ Deadline: ${new Date(p.deadline).toLocaleDateString('es-ES')}\n`;
        if (p.hours_logged > 0) msg += `  🕐 ${p.hours_logged}h logueadas`;
        if (p.hours_estimated) msg += ` / ${p.hours_estimated}h estimadas`;
        msg += '\n\n';
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /income — Ingresos del mes
  bot.command('income', async (ctx) => {
    try {
      const summary = getFreelanceFinanceSummary('month');
      let msg = '💰 *Ingresos del mes:*\n\n';
      msg += `Total: *${summary.totalIncome.toLocaleString()}€*\n`;
      msg += `Gastos: *${summary.totalExpenses.toLocaleString()}€*\n`;
      msg += `Balance: *${(summary.totalIncome - summary.totalExpenses).toLocaleString()}€*\n`;

      if (summary.byCategory && summary.byCategory.length > 0) {
        msg += '\n*Por categoría:*\n';
        for (const cat of summary.byCategory) {
          msg += `  ${cat.type === 'income' ? '📈' : '📉'} ${cat.category}: ${cat.total.toLocaleString()}€\n`;
        }
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /expense <amount> <category> <description> — Registrar gasto rápido
  bot.command('expense', async (ctx) => {
    const args = ctx.match?.trim();
    if (!args) {
      return ctx.reply(
        '💸 *Registrar gasto:*\n\n' +
        '`/expense 29.99 software Suscripción Cursor`\n' +
        '`/expense 100 hosting Servidor VPS mes`\n\n' +
        '*Categorías:* software, hardware, hosting, domain, ai\\_tools, marketing, education, taxes, accountant, office, travel, other',
        { parse_mode: 'Markdown' }
      );
    }

    const parts = args.split(' ');
    const amount = parseFloat(parts[0]);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Importe inválido. Uso: `/expense 29.99 software Descripción`', { parse_mode: 'Markdown' });
    }

    const category = parts[1] || 'other';
    const description = parts.slice(2).join(' ') || `Gasto ${category}`;

    try {
      insertFreelanceFinance({
        type: 'expense',
        category,
        amount,
        currency: 'EUR',
        description,
        date: new Date().toISOString().split('T')[0],
        tax_deductible: 1,
      });

      const summary = getFreelanceFinanceSummary('month');
      await ctx.reply(
        `✅ Gasto registrado: *${amount.toLocaleString()}€* (${category})\n` +
        `📝 ${description}\n\n` +
        `Balance mes: ${(summary.totalIncome - summary.totalExpenses).toLocaleString()}€`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /balance — Balance mensual
  bot.command('balance', async (ctx) => {
    try {
      const summary = getFreelanceFinanceSummary('month');
      const bal = summary.totalIncome - summary.totalExpenses;
      const emoji = bal >= 0 ? '📈' : '📉';

      let msg = `${emoji} *Balance mensual:*\n\n`;
      msg += `💰 Ingresos: +${summary.totalIncome.toLocaleString()}€\n`;
      msg += `💸 Gastos: -${summary.totalExpenses.toLocaleString()}€\n`;
      msg += `━━━━━━━━━━━━\n`;
      msg += `${emoji} *Balance: ${bal >= 0 ? '+' : ''}${bal.toLocaleString()}€*\n`;

      if (summary.monthly && summary.monthly.length > 1) {
        msg += '\n*Últimos meses:*\n';
        for (const m of summary.monthly.slice(0, 4)) {
          const mBal = m.income - m.expenses;
          msg += `  ${m.month}: ${mBal >= 0 ? '+' : ''}${mBal.toLocaleString()}€\n`;
        }
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // /credits — Estado de créditos en plataformas
  bot.command('credits', async (ctx) => {
    try {
      const balances = getPlatformBalances();

      if (balances.length === 0) {
        return ctx.reply('No hay plataformas configuradas aún. Añádelas desde el panel web.');
      }

      let msg = '🎫 *Créditos por plataforma:*\n\n';
      for (const b of balances) {
        const pct = b.monthly_free_credits > 0 ? Math.round(b.credits_balance / b.monthly_free_credits * 100) : 100;
        const bar = '█'.repeat(Math.min(10, Math.round(pct / 10))) + '░'.repeat(Math.max(0, 10 - Math.round(pct / 10)));
        msg += `*${b.platform}*: ${b.credits_balance} ${b.credits_unit}\n`;
        msg += `  ${bar} ${pct}%\n`;
        if (b.cost_per_credit > 0) msg += `  💵 ${b.cost_per_credit} ${b.cost_currency}/credit\n`;
        msg += '\n';
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
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

    // Freelance opportunity status buttons
    if (data.startsWith('fopp_')) {
      const parts = data.split('_');
      const newStatus = parts[1];
      const oppId = parseInt(parts[2]);
      await ctx.answerCallbackQuery(`Estado → ${newStatus}`);
      updateFreelanceOpportunity(oppId, { status: newStatus });
      const opp = getFreelanceOpportunityById(oppId);
      const emoji = { interested: '⚡', applied: '✅', skipped: '❌', won: '🏆', lost: '😞' }[newStatus] || '📌';
      await ctx.reply(`${emoji} Oportunidad *${opp?.title?.slice(0, 50) || oppId}* → *${newStatus}*`, { parse_mode: 'Markdown' });
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

  // Stats freelance
  try {
    const fStats = getFreelanceStats();
    if (fStats.opportunities.total > 0 || fStats.projects.active > 0) {
      msg += '\n\n💼 *Freelance:*';
      msg += `\n🔍 Oportunidades: ${fStats.opportunities.hot} hot / ${fStats.opportunities.total} total`;
      if (fStats.projects.active > 0) msg += `\n📁 Proyectos activos: ${fStats.projects.active}`;
      const bal = fStats.revenue.thisMonth - fStats.expenses.thisMonth;
      msg += `\n💰 Balance mes: ${bal >= 0 ? '+' : ''}${bal.toLocaleString()}€`;
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

  // Añadir resumen freelance al nocturno
  try {
    const fStats = getFreelanceStats();
    if (fStats.opportunities.total > 0 || fStats.projects.active > 0) {
      msg += '\n\n*Freelance:*';
      if (fStats.opportunities.hot > 0) msg += `\n🔥 ${fStats.opportunities.hot} oportunidades hot`;
      if (fStats.projects.active > 0) msg += `\n📁 ${fStats.projects.active} proyectos activos`;
      const balance = fStats.revenue.thisMonth - fStats.expenses.thisMonth;
      msg += `\n💰 Balance mes: ${balance >= 0 ? '+' : ''}${balance.toLocaleString()}€`;
    }
  } catch {}

  msg += '\n\nMañana seguimos. Buenas noches.';

  await notifyAdmin(msg);
}

/**
 * Notifica nueva oportunidad hot freelance
 */
export async function notifyHotOpportunity(opp) {
  const skills = opp.skills_required ? JSON.parse(opp.skills_required).slice(0, 5).join(', ') : '';
  const budget = opp.budget_max ? `$${opp.budget_min || '?'}-$${opp.budget_max}` :
    opp.budget_min ? `$${opp.budget_min}+` : '?';

  const msg =
    '🔥 *Nueva oportunidad HOT!*\n\n' +
    `*${opp.title}*\n` +
    `📊 Score: ${opp.match_score}pts | ${opp.platform}\n` +
    `💰 Budget: ${budget}\n` +
    (skills ? `🔧 ${skills}\n` : '') +
    `\n📋 /opp\\_${opp.id}`;

  await notifyAdmin(msg);
}

/**
 * Notifica deadline próximo de proyecto
 */
export async function notifyProjectDeadline(project, daysLeft) {
  const emoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '⏰';
  const msg =
    `${emoji} *Deadline en ${daysLeft} día${daysLeft > 1 ? 's' : ''}!*\n\n` +
    `📁 *${project.name}*\n` +
    `⏰ ${new Date(project.deadline).toLocaleDateString('es-ES')}\n` +
    (project.agreed_price ? `💰 ${project.agreed_price.toLocaleString()} ${project.currency}\n` : '');

  await notifyAdmin(msg);
}

/**
 * Resumen semanal freelance (lunes 09:00)
 */
export async function sendWeeklyFreelanceSummary() {
  try {
    const stats = getFreelanceStats();
    const summary = getFreelanceFinanceSummary('month');
    const balance = summary.totalIncome - summary.totalExpenses;

    // Oportunidades de la semana
    const db = getDb();
    const newOppsWeek = db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE found_at >= datetime('now', '-7 days')").get().c;
    const hotOppsWeek = db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE found_at >= datetime('now', '-7 days') AND match_score >= 70").get().c;
    const appliedWeek = db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE applied_at >= datetime('now', '-7 days')").get().c;

    let msg = '📊 *Resumen semanal Freelance*\n\n';
    msg += `*Oportunidades esta semana:*\n`;
    msg += `  🆕 Nuevas: ${newOppsWeek}\n`;
    msg += `  🔥 Hot: ${hotOppsWeek}\n`;
    msg += `  ✅ Aplicadas: ${appliedWeek}\n\n`;
    msg += `*Proyectos:*\n`;
    msg += `  🔄 En curso: ${stats.projects.active}\n`;
    msg += `  📝 Propuestas: ${stats.projects.proposals}\n`;
    msg += `  ✅ Pagados: ${stats.projects.paid}\n\n`;
    msg += `*Finanzas del mes:*\n`;
    msg += `  💰 Ingresos: ${summary.totalIncome.toLocaleString()}€\n`;
    msg += `  💸 Gastos: ${summary.totalExpenses.toLocaleString()}€\n`;
    msg += `  ${balance >= 0 ? '📈' : '📉'} Balance: ${balance >= 0 ? '+' : ''}${balance.toLocaleString()}€\n`;
    msg += `  📅 Año: ${stats.revenue.thisYear.toLocaleString()}€`;

    await notifyAdmin(msg);
  } catch (err) {
    log.error(`Error en resumen semanal freelance: ${err.message}`);
  }
}

/**
 * Check deadlines próximos y notificar
 */
export async function checkProjectDeadlines() {
  try {
    const db = getDb();
    const upcoming = db.prepare(`
      SELECT * FROM freelance_projects
      WHERE deadline IS NOT NULL AND status = 'in_progress'
      AND deadline >= datetime('now') AND deadline <= datetime('now', '+3 days')
      ORDER BY deadline ASC
    `).all();

    for (const project of upcoming) {
      const daysLeft = Math.ceil((new Date(project.deadline) - Date.now()) / 86400000);
      if (daysLeft <= 3) {
        await notifyProjectDeadline(project, daysLeft);
      }
    }

    return { checked: upcoming.length };
  } catch (err) {
    log.error(`Error checking deadlines: ${err.message}`);
    return { checked: 0 };
  }
}
