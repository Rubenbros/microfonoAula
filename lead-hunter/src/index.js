import 'dotenv/config';
import cron from 'node-cron';
import { setupDatabase } from './db/database.js';
import { createBot, sendMorningSummary, sendEveningSummary, notifyAdmin } from './telegram/commands.js';
import { scanGoogleMaps, saveResults } from './scraper/maps.js';
import { scanAllReddit } from './scraper/reddit.js';
import { scanGoogleLinkedIn } from './scraper/google-linkedin.js';
import { scoreNewLeads } from './analyzer/scorer.js';
import { runEmailSequences } from './emailer/sender.js';
import { startTracker } from './emailer/tracker.js';
import { checkDemoVisits } from './demo/visits.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('main');

// Cargar configuración de sectores
const sectorsConfig = JSON.parse(
  readFileSync(join(__dirname, '../config/sectors.json'), 'utf-8')
);

// Evitar que el proceso muera por errores no manejados (ej: 409 de Telegram)
process.on('uncaughtException', (err) => {
  if (err.message?.includes('409') || err.description?.includes('409')) {
    log.warn('Bot: conflicto 409 (uncaught) — cron jobs siguen activos.');
  } else {
    log.error(`Error no capturado: ${err.message}`);
  }
});
process.on('unhandledRejection', (err) => {
  if (err?.message?.includes('409') || err?.description?.includes('409')) {
    log.warn('Bot: conflicto 409 (rejection) — cron jobs siguen activos.');
  } else {
    log.error(`Rejection no manejada: ${err?.message || err}`);
  }
});

async function main() {
  log.info('=== Lead Hunter iniciando ===');

  // 1. Inicializar base de datos
  setupDatabase();
  log.info('Base de datos lista');

  // 2. Iniciar bot de Telegram
  const bot = createBot();

  // Limpiar sesiones anteriores
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  } catch {}

  // Arrancar bot (no bloquea, corre en background)
  bot.start({
    drop_pending_updates: true,
    onStart: () => log.info('Bot de Telegram conectado'),
  });
  log.info('Bot de Telegram iniciado');

  // 3. Iniciar servidor de tracking de emails
  startTracker();
  log.info('Tracker de emails iniciado');

  // Notificar inicio
  try {
    await notifyAdmin('🚀 *Lead Hunter iniciado*\n\nSistema de captación automática activo.\n📍 Google Maps + 🌐 Reddit');
  } catch (err) {
    log.warn(`No se pudo enviar notificación de inicio: ${err.message}`);
  }

  // === CRON JOBS ===

  // 06:00 — Escaneo automático Google Maps (rota entre zonas y sectores)
  cron.schedule('0 6 * * 1-5', async () => {
    log.info('Cron: Escaneo Google Maps');
    try {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const zoneIndex = dayOfYear % sectorsConfig.zones.length;
      const sectorIndex = Math.floor(dayOfYear / sectorsConfig.zones.length) % sectorsConfig.sectors.length;

      const zone = sectorsConfig.zones[zoneIndex];
      const sector = sectorsConfig.sectors[sectorIndex];

      await notifyAdmin(`🔍 Escaneo Maps: *${sector.keywords[0]}* en *${zone.name}*`);

      const results = await scanGoogleMaps(zone.query, sector.keywords[0], 30);
      const saved = await saveResults(results, zone.name, sector.id);

      await notifyAdmin(`✅ Maps: ${saved.total} encontrados, ${saved.new} nuevos`);
    } catch (err) {
      log.error(`Error en escaneo Maps: ${err.message}`);
      await notifyAdmin(`❌ Error Maps: ${err.message}`);
    }
  });

  // 07:00 — Escaneo Reddit (mañana)
  cron.schedule('0 7 * * *', async () => {
    log.info('Cron: Escaneo de Reddit (mañana)');
    try {
      const result = await scanAllReddit();
      if (result.new > 0) {
        await notifyAdmin(`🌐 Reddit: ${result.total} posts, *${result.new} nuevos*`);
      }
    } catch (err) {
      log.error(`Error en escaneo Reddit: ${err.message}`);
      await notifyAdmin(`❌ Error Reddit: ${err.message}`);
    }
  });

  // 08:00 — Analizar y puntuar leads nuevos (locales + online)
  cron.schedule('0 8 * * 1-5', async () => {
    log.info('Cron: Análisis de leads');
    try {
      const result = await scoreNewLeads();
      if (result.processed > 0) {
        await notifyAdmin(
          `📊 Análisis: ${result.processed} leads\n` +
          `🔥 ${result.hot} calientes | 🟡 ${result.warm} tibios | 🔵 ${result.cold} fríos`
        );
      }
    } catch (err) {
      log.error(`Error en análisis: ${err.message}`);
    }
  });

  // 08:30 — Escaneo Google → LinkedIn (1 vez al día, L-V)
  cron.schedule('30 8 * * 1-5', async () => {
    log.info('Cron: Escaneo Google → LinkedIn');
    try {
      const result = await scanGoogleLinkedIn();
      if (result.new > 0) {
        await notifyAdmin(`💼 LinkedIn: ${result.total} resultados, *${result.new} nuevos*`);
      }
    } catch (err) {
      log.error(`Error en escaneo Google-LinkedIn: ${err.message}`);
      await notifyAdmin(`❌ Error LinkedIn: ${err.message}`);
    }
  });

  // 09:00 — Resumen matutino
  cron.schedule('0 9 * * 1-5', async () => {
    await sendMorningSummary();
  });

  // 09:30-13:30 — Envío de emails (cada 30 minutos)
  cron.schedule('*/30 9-13 * * 1-5', async () => {
    log.info('Cron: Envío de emails');
    try {
      await runEmailSequences();
    } catch (err) {
      log.error(`Error en envío de emails: ${err.message}`);
    }
  });

  // 15:00 — Segundo escaneo Reddit (tarde)
  cron.schedule('0 15 * * *', async () => {
    log.info('Cron: Escaneo de Reddit (tarde)');
    try {
      const result = await scanAllReddit();
      if (result.new > 0) {
        await notifyAdmin(`🌐 Reddit tarde: ${result.total} posts, *${result.new} nuevos*`);
      }
    } catch (err) {
      log.error(`Error en escaneo Reddit tarde: ${err.message}`);
    }
  });

  // 15:30 — Scoring de leads nuevos de la tarde
  cron.schedule('30 15 * * *', async () => {
    log.info('Cron: Scoring leads tarde');
    try {
      const result = await scoreNewLeads();
      if (result.processed > 0 && result.hot > 0) {
        await notifyAdmin(`🔥 Leads tarde: ${result.hot} calientes nuevos!`);
      }
    } catch (err) {
      log.error(`Error en scoring tarde: ${err.message}`);
    }
  });

  // Cada 15 min (9:00-20:00 L-V) — Chequeo de visitas a demos
  cron.schedule('*/15 9-19 * * 1-5', async () => {
    log.info('Cron: Chequeo de visitas a demos');
    try {
      const result = await checkDemoVisits();
      if (result.newVisits > 0) {
        log.info(`Visitas nuevas detectadas: ${result.newVisits}`);
      }
    } catch (err) {
      log.error(`Error en chequeo de visitas: ${err.message}`);
    }
  });

  // 20:00 — Resumen nocturno
  cron.schedule('0 20 * * 1-5', async () => {
    await sendEveningSummary();
  });

  log.info('Cron jobs programados:');
  log.info('  06:00 L-V — Google Maps');
  log.info('  07:00 diario — Reddit (mañana)');
  log.info('  08:00 L-V — Scoring');
  log.info('  08:30 L-V — Google → LinkedIn');
  log.info('  09:00 L-V — Resumen matutino');
  log.info('  09:30-13:30 L-V — Emails');
  log.info('  15:00 diario — Reddit (tarde)');
  log.info('  15:30 diario — Scoring tarde');
  log.info('  */15 9-19 L-V — Chequeo visitas demos');
  log.info('  20:00 L-V — Resumen nocturno');
  log.info('=== Lead Hunter listo ===');
}

main().catch(err => {
  log.error(`Error fatal: ${err.message}`);
  process.exit(1);
});
