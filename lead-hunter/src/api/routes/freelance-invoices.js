import { Router } from 'express';
import {
  getInvoices, getInvoiceById, insertInvoice, updateInvoice, deleteInvoice,
  getNextInvoiceNumber, getFreelanceClientById, getFreelanceProjectById
} from '../../db/database.js';

const router = Router();

// GET /api/freelance/invoices
router.get('/', (req, res) => {
  const { client_id, status, page, limit } = req.query;
  const result = getInvoices({ client_id, status, page, limit });
  res.json(result);
});

// GET /api/freelance/invoices/next-number
router.get('/next-number', (req, res) => {
  res.json({ invoiceNumber: getNextInvoiceNumber() });
});

// GET /api/freelance/invoices/:id
router.get('/:id', (req, res) => {
  const invoice = getInvoiceById(parseInt(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  // Parsear items JSON
  if (invoice.items) {
    try { invoice.items = JSON.parse(invoice.items); } catch { invoice.items = []; }
  }
  res.json(invoice);
});

// POST /api/freelance/invoices
router.post('/', (req, res) => {
  const { client_id, amount } = req.body;
  if (!client_id || amount === undefined) {
    return res.status(400).json({ error: 'client_id y amount son obligatorios' });
  }

  const client = getFreelanceClientById(parseInt(client_id));
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const result = insertInvoice(req.body);
  const invoice = getInvoiceById(result.lastInsertRowid);
  res.status(201).json(invoice);
});

// PATCH /api/freelance/invoices/:id
router.patch('/:id', (req, res) => {
  const invoice = getInvoiceById(parseInt(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  updateInvoice(parseInt(req.params.id), req.body);
  res.json({ success: true, invoice: getInvoiceById(parseInt(req.params.id)) });
});

// DELETE /api/freelance/invoices/:id
router.delete('/:id', (req, res) => {
  const invoice = getInvoiceById(parseInt(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  deleteInvoice(parseInt(req.params.id));
  res.json({ success: true });
});

// GET /api/freelance/invoices/:id/pdf — Genera HTML de factura (para convertir a PDF en frontend)
router.get('/:id/pdf', (req, res) => {
  const invoice = getInvoiceById(parseInt(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  let items = [];
  if (invoice.items) {
    try { items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items; } catch {}
  }

  // Si no hay items, crear uno genérico
  if (items.length === 0) {
    items = [{ description: invoice.notes || 'Servicios profesionales', quantity: 1, unit_price: invoice.amount, total: invoice.amount }];
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #0f3460; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 800; color: #0f3460; }
  .logo span { color: #e94560; }
  .invoice-info { text-align: right; }
  .invoice-number { font-size: 22px; font-weight: 700; color: #0f3460; }
  .invoice-date { color: #666; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party { width: 48%; }
  .party-label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 6px; }
  .party-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .party-detail { font-size: 13px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  thead th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tbody tr:nth-child(even) { background: #f8f9fa; }
  .amount { text-align: right; }
  .totals { margin-left: auto; width: 300px; margin-top: 20px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals-row.total { border-top: 2px solid #0f3460; font-size: 18px; font-weight: 700; color: #0f3460; padding-top: 10px; margin-top: 6px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .status-draft { background: #ffeaa7; color: #856404; }
  .status-sent { background: #74b9ff; color: #0c5460; }
  .status-paid { background: #55efc4; color: #155724; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
  .payment-info { margin-top: 30px; background: #f0f3f8; padding: 16px; border-radius: 8px; font-size: 13px; }
  .payment-info strong { color: #0f3460; }
</style></head><body>
<div class="header">
  <div>
    <div class="logo">T800<span>Labs</span></div>
    <div class="party-detail">Rubén Jarne</div>
    <div class="party-detail">hola@t800labs.com</div>
    <div class="party-detail">t800labs.com</div>
  </div>
  <div class="invoice-info">
    <div class="invoice-number">${invoice.invoice_number}</div>
    <div class="invoice-date">Fecha: ${invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}</div>
    ${invoice.due_at ? `<div class="invoice-date">Vence: ${new Date(invoice.due_at).toLocaleDateString('es-ES')}</div>` : ''}
    <div style="margin-top: 8px;"><span class="status status-${invoice.status}">${invoice.status}</span></div>
  </div>
</div>
<div class="parties">
  <div class="party">
    <div class="party-label">De</div>
    <div class="party-name">T800 Labs</div>
    <div class="party-detail">Rubén Jarne</div>
    <div class="party-detail">hola@t800labs.com</div>
  </div>
  <div class="party">
    <div class="party-label">Para</div>
    <div class="party-name">${invoice.client_name || 'Cliente'}</div>
    ${invoice.client_company ? `<div class="party-detail">${invoice.client_company}</div>` : ''}
    ${invoice.client_email ? `<div class="party-detail">${invoice.client_email}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr><th>Descripción</th><th class="amount">Cantidad</th><th class="amount">Precio</th><th class="amount">Total</th></tr></thead>
  <tbody>
    ${items.map(item => `<tr><td>${item.description || ''}</td><td class="amount">${item.quantity || 1}</td><td class="amount">${(item.unit_price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</td><td class="amount">${(item.total || item.unit_price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</td></tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>${invoice.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span></div>
  <div class="totals-row"><span>IVA (${invoice.tax_rate}%)</span><span>${invoice.tax_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span></div>
  <div class="totals-row total"><span>Total</span><span>${invoice.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span></div>
</div>
${invoice.notes ? `<div class="payment-info"><strong>Notas:</strong> ${invoice.notes}</div>` : ''}
<div class="payment-info"><strong>Datos de pago:</strong> Transferencia bancaria o PayPal a hola@t800labs.com</div>
<div class="footer">T800 Labs — t800labs.com — hola@t800labs.com</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
