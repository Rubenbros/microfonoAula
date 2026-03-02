import { chromium } from 'playwright';
import { createLogger } from '../logger.js';

const log = createLogger('web-analyzer');

/**
 * Analiza la web de un negocio y devuelve un informe de calidad
 * @param {string} url - URL del sitio web
 * @returns {Object} Análisis de la web
 */
export async function analyzeWebsite(url) {
  const analysis = {
    exists: false,
    quality: 0,         // 0-100
    hasBooking: false,
    hasSocialMedia: false,
    isMobileResponsive: false,
    hasSSL: false,
    loadTime: null,
    lastUpdated: null,
    technologies: [],
    issues: [],
  };

  if (!url || url === 'null') return analysis;

  // Limpiar URL
  if (!url.startsWith('http')) url = `https://${url}`;

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Medir tiempo de carga
    const startTime = Date.now();

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    }).catch(() => null);

    if (!response || response.status() >= 400) {
      analysis.issues.push('Web no accesible o error HTTP');
      return analysis;
    }

    analysis.exists = true;
    analysis.loadTime = Date.now() - startTime;
    analysis.hasSSL = url.startsWith('https');

    const content = await page.content();
    const text = content.toLowerCase();

    // Comprobar sistema de reservas
    const bookingKeywords = [
      'reservar', 'reserva', 'cita', 'booking', 'appointment',
      'calendly', 'booksy', 'treatwell', 'planyo', 'simplybook',
    ];
    analysis.hasBooking = bookingKeywords.some(kw => text.includes(kw));

    // Comprobar redes sociales
    const socialLinks = ['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'linkedin.com'];
    analysis.hasSocialMedia = socialLinks.some(s => text.includes(s));

    // Comprobar responsive (viewport meta tag)
    const viewportMeta = await page.locator('meta[name="viewport"]').count().catch(() => 0);
    analysis.isMobileResponsive = viewportMeta > 0;

    // Detectar tecnologías
    if (text.includes('wordpress') || text.includes('wp-content')) analysis.technologies.push('WordPress');
    if (text.includes('wix.com')) analysis.technologies.push('Wix');
    if (text.includes('squarespace')) analysis.technologies.push('Squarespace');
    if (text.includes('shopify')) analysis.technologies.push('Shopify');
    if (text.includes('react')) analysis.technologies.push('React');

    // Calcular calidad (0-100)
    let quality = 30; // Base por existir

    if (analysis.hasSSL) quality += 10;
    if (analysis.isMobileResponsive) quality += 15;
    if (analysis.hasBooking) quality += 15;
    if (analysis.hasSocialMedia) quality += 10;
    if (analysis.loadTime < 3000) quality += 10;
    if (analysis.loadTime < 1500) quality += 10;

    // Penalizaciones
    if (analysis.loadTime > 5000) { quality -= 10; analysis.issues.push('Carga lenta'); }
    if (!analysis.hasSSL) analysis.issues.push('Sin HTTPS');
    if (!analysis.isMobileResponsive) analysis.issues.push('No es responsive/móvil');
    if (!analysis.hasBooking) analysis.issues.push('Sin sistema de reservas');

    analysis.quality = Math.max(0, Math.min(100, quality));

    log.info(`Análisis de ${url}: calidad=${analysis.quality}, booking=${analysis.hasBooking}, responsive=${analysis.isMobileResponsive}`);

  } catch (err) {
    log.warn(`Error analizando ${url}: ${err.message}`);
    analysis.issues.push(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  return analysis;
}
