import http from 'http';
import { markEmailOpened, getEmailWithLead } from '../db/database.js';
import { notifyAdmin } from '../telegram/commands.js';
import { createLogger } from '../logger.js';

const log = createLogger('tracker');

// Pixel transparente 1x1 GIF (43 bytes)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Arranca el servidor HTTP de tracking pixel
 */
export function startTracker() {
  const port = parseInt(process.env.TRACKER_PORT || '3001');

  const server = http.createServer(async (req, res) => {
    // Solo aceptar GET /track/:emailId
    const match = req.url?.match(/^\/track\/(\d+)/);

    if (!match) {
      res.writeHead(404);
      res.end();
      return;
    }

    const emailId = parseInt(match[1]);

    try {
      const result = markEmailOpened(emailId);

      if (result.alreadyOpened) {
        log.info(`Email #${emailId} ya estaba marcado como abierto`);
      } else if (result.updated) {
        log.info(`Email #${emailId} abierto por primera vez`);

        // Notificar por Telegram
        const emailData = getEmailWithLead(emailId);
        if (emailData) {
          const leadName = emailData.lead_name || 'Desconocido';
          const step = emailData.sequence_step;
          await notifyAdmin(
            `📬 *Email abierto*\n\n` +
            `👤 ${leadName}\n` +
            `✉️ Email ${step}/3\n` +
            `📧 ${emailData.to_email}`
          );
        }
      } else {
        log.warn(`Email #${emailId} no encontrado en BD`);
      }
    } catch (err) {
      log.error(`Error procesando tracking de email #${emailId}: ${err.message}`);
    }

    // Siempre devolver el pixel (aunque haya error)
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(TRACKING_PIXEL);
  });

  server.listen(port, () => {
    log.info(`Tracker server escuchando en puerto ${port}`);
  });

  return server;
}
