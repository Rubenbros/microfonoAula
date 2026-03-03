import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/leads.db');

// Asegurar que el directorio data existe
mkdirSync(join(__dirname, '../../data'), { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function setupDatabase() {
  const db = getDb();

  db.exec(`
    -- Leads encontrados por el scraper
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      google_maps_url TEXT,
      rating REAL,
      review_count INTEGER,
      zone TEXT,

      -- Análisis (negocios locales)
      has_website INTEGER DEFAULT 0,
      website_quality INTEGER DEFAULT 0,
      has_booking_system INTEGER DEFAULT 0,
      has_social_media INTEGER DEFAULT 0,
      lead_score INTEGER DEFAULT 0,
      lead_tier TEXT DEFAULT 'cold',

      -- Tipo y fuente del lead
      lead_type TEXT DEFAULT 'local',
      source TEXT DEFAULT 'google_maps',
      source_url TEXT,
      source_id TEXT,
      source_author TEXT,

      -- Datos específicos de leads online
      description TEXT,
      budget_min REAL,
      budget_max REAL,
      service_type TEXT,
      urgency TEXT,
      language TEXT DEFAULT 'es',
      post_date DATETIME,

      -- Pipeline
      status TEXT DEFAULT 'new',
      notes TEXT,

      -- Timestamps
      found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      contacted_at DATETIME,
      replied_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(name, address)
    );

    -- Emails enviados
    CREATE TABLE IF NOT EXISTS emails_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      sequence_step INTEGER DEFAULT 1,
      template TEXT,
      subject TEXT,
      to_email TEXT,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      opened_at DATETIME,
      replied_at DATETIME,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    -- Escaneos realizados
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,
      sector TEXT NOT NULL,
      scan_type TEXT DEFAULT 'local',
      source TEXT DEFAULT 'google_maps',
      results_count INTEGER DEFAULT 0,
      new_leads_count INTEGER DEFAULT 0,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Configuración del sistema
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Tracking de visitas a demos
    CREATE TABLE IF NOT EXISTS demo_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      demo_slug TEXT NOT NULL,
      visit_count INTEGER DEFAULT 0,
      last_visit_at TEXT,
      first_visit_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    -- Índices para búsquedas rápidas
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(lead_tier);
    CREATE INDEX IF NOT EXISTS idx_leads_zone ON leads(zone);
    CREATE INDEX IF NOT EXISTS idx_leads_sector ON leads(sector);
    CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
    CREATE INDEX IF NOT EXISTS idx_leads_service_type ON leads(service_type);
    CREATE INDEX IF NOT EXISTS idx_emails_lead ON emails_sent(lead_id);
    CREATE INDEX IF NOT EXISTS idx_demo_visits_lead ON demo_visits(lead_id);
    CREATE INDEX IF NOT EXISTS idx_demo_visits_slug ON demo_visits(demo_slug);

    -- Tareas de automatizaciones (desglose de ideas en pasos ejecutables)
    CREATE TABLE IF NOT EXISTS automation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      automation_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT DEFAULT 'general',
      status TEXT DEFAULT 'pending',
      result TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_automation ON automation_tasks(automation_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON automation_tasks(status);

    -- ========================================
    -- MÓDULO FREELANCE
    -- ========================================

    -- Clientes freelance
    CREATE TABLE IF NOT EXISTS freelance_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      country TEXT,
      language TEXT DEFAULT 'en',
      timezone TEXT,
      source TEXT,
      source_url TEXT,
      lead_id INTEGER,
      status TEXT DEFAULT 'prospect',
      tags TEXT,
      notes TEXT,
      total_revenue REAL DEFAULT 0,
      projects_count INTEGER DEFAULT 0,
      rating INTEGER,
      first_contact_at DATETIME,
      last_contact_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    -- Proyectos freelance
    CREATE TABLE IF NOT EXISTS freelance_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      service_type TEXT,
      status TEXT DEFAULT 'proposal',
      currency TEXT DEFAULT 'EUR',
      budget_min REAL,
      budget_max REAL,
      agreed_price REAL,
      payment_type TEXT DEFAULT 'fixed',
      hourly_rate REAL,
      hours_estimated REAL,
      hours_logged REAL DEFAULT 0,
      deposit_amount REAL,
      deposit_paid INTEGER DEFAULT 0,
      total_paid REAL DEFAULT 0,
      platform TEXT,
      platform_fee_percent REAL DEFAULT 0,
      proposal_url TEXT,
      contract_url TEXT,
      repo_url TEXT,
      deploy_url TEXT,
      deadline DATETIME,
      started_at DATETIME,
      delivered_at DATETIME,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES freelance_clients(id)
    );

    -- Hitos de proyecto
    CREATE TABLE IF NOT EXISTS freelance_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL,
      status TEXT DEFAULT 'pending',
      due_date DATETIME,
      completed_at DATETIME,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES freelance_projects(id) ON DELETE CASCADE
    );

    -- Finanzas (gastos e ingresos)
    CREATE TABLE IF NOT EXISTS freelance_finances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      description TEXT,
      project_id INTEGER,
      client_id INTEGER,
      date DATE NOT NULL,
      invoice_number TEXT,
      invoice_url TEXT,
      tax_deductible INTEGER DEFAULT 0,
      recurring INTEGER DEFAULT 0,
      recurring_period TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES freelance_projects(id),
      FOREIGN KEY (client_id) REFERENCES freelance_clients(id)
    );

    -- Oportunidades detectadas en plataformas
    CREATE TABLE IF NOT EXISTS freelance_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      author TEXT,
      author_url TEXT,
      budget_min REAL,
      budget_max REAL,
      budget_type TEXT,
      currency TEXT DEFAULT 'USD',
      skills_required TEXT,
      category TEXT,
      country TEXT,
      language TEXT DEFAULT 'en',
      urgency TEXT,
      posted_at DATETIME,
      proposals_count INTEGER,
      client_rating REAL,
      client_spent REAL,
      match_score INTEGER DEFAULT 0,
      match_reasons TEXT,
      status TEXT DEFAULT 'new',
      applied_at DATETIME,
      proposal_text TEXT,
      notes TEXT,
      found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform, url)
    );

    -- Perfil freelance (key-value para matching y propuestas IA)
    CREATE TABLE IF NOT EXISTS freelance_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Balances de plataformas (créditos para aplicar)
    CREATE TABLE IF NOT EXISTS platform_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL UNIQUE,
      credits_balance REAL DEFAULT 0,
      credits_unit TEXT DEFAULT 'connects',
      cost_per_credit REAL DEFAULT 0,
      cost_currency TEXT DEFAULT 'USD',
      monthly_free_credits REAL DEFAULT 0,
      subscription_plan TEXT,
      subscription_cost REAL DEFAULT 0,
      last_refill_at DATETIME,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Historial de transacciones de créditos
    CREATE TABLE IF NOT EXISTS platform_credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      opportunity_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES freelance_opportunities(id)
    );

    -- Entradas de tiempo (timer de horas)
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      description TEXT,
      started_at DATETIME NOT NULL,
      ended_at DATETIME,
      duration_minutes REAL,
      billable INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES freelance_projects(id) ON DELETE CASCADE
    );

    -- Facturas
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      project_id INTEGER,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      tax_rate REAL DEFAULT 21,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT DEFAULT 'draft',
      issued_at DATETIME,
      due_at DATETIME,
      paid_at DATETIME,
      notes TEXT,
      items TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES freelance_clients(id),
      FOREIGN KEY (project_id) REFERENCES freelance_projects(id)
    );

    -- Índices freelance
    CREATE INDEX IF NOT EXISTS idx_te_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_te_started ON time_entries(started_at);
    CREATE INDEX IF NOT EXISTS idx_inv_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_fc_status ON freelance_clients(status);
    CREATE INDEX IF NOT EXISTS idx_fc_source ON freelance_clients(source);
    CREATE INDEX IF NOT EXISTS idx_fp_client ON freelance_projects(client_id);
    CREATE INDEX IF NOT EXISTS idx_fp_status ON freelance_projects(status);
    CREATE INDEX IF NOT EXISTS idx_ff_type ON freelance_finances(type);
    CREATE INDEX IF NOT EXISTS idx_ff_date ON freelance_finances(date);
    CREATE INDEX IF NOT EXISTS idx_ff_category ON freelance_finances(category);
    CREATE INDEX IF NOT EXISTS idx_ff_project ON freelance_finances(project_id);
    CREATE INDEX IF NOT EXISTS idx_fo_platform ON freelance_opportunities(platform);
    CREATE INDEX IF NOT EXISTS idx_fo_status ON freelance_opportunities(status);
    CREATE INDEX IF NOT EXISTS idx_fo_score ON freelance_opportunities(match_score);
    CREATE INDEX IF NOT EXISTS idx_fo_posted ON freelance_opportunities(posted_at);
    CREATE INDEX IF NOT EXISTS idx_fm_project ON freelance_milestones(project_id);
    CREATE INDEX IF NOT EXISTS idx_fm_status ON freelance_milestones(status);
    CREATE INDEX IF NOT EXISTS idx_pct_platform ON platform_credit_transactions(platform);
    CREATE INDEX IF NOT EXISTS idx_pct_type ON platform_credit_transactions(type);
  `);

  // Índice único para leads online (evitar duplicados por source_id)
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source, source_id) WHERE source_id IS NOT NULL`);
  } catch {
    // SQLite antiguo puede no soportar WHERE en índices, ignorar
  }

  // Migración: añadir columnas si la BD ya existe con esquema viejo
  migrateDatabase(db);

  console.log('[DB] Base de datos inicializada correctamente');
  return db;
}

/**
 * Añade columnas nuevas si no existen (para BDs ya creadas)
 */
function migrateDatabase(db) {
  const columns = db.prepare("PRAGMA table_info(leads)").all().map(c => c.name);

  const newColumns = [
    { name: 'lead_type', sql: "ALTER TABLE leads ADD COLUMN lead_type TEXT DEFAULT 'local'" },
    { name: 'source', sql: "ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'google_maps'" },
    { name: 'source_url', sql: "ALTER TABLE leads ADD COLUMN source_url TEXT" },
    { name: 'source_id', sql: "ALTER TABLE leads ADD COLUMN source_id TEXT" },
    { name: 'source_author', sql: "ALTER TABLE leads ADD COLUMN source_author TEXT" },
    { name: 'description', sql: "ALTER TABLE leads ADD COLUMN description TEXT" },
    { name: 'budget_min', sql: "ALTER TABLE leads ADD COLUMN budget_min REAL" },
    { name: 'budget_max', sql: "ALTER TABLE leads ADD COLUMN budget_max REAL" },
    { name: 'service_type', sql: "ALTER TABLE leads ADD COLUMN service_type TEXT" },
    { name: 'urgency', sql: "ALTER TABLE leads ADD COLUMN urgency TEXT" },
    { name: 'language', sql: "ALTER TABLE leads ADD COLUMN language TEXT DEFAULT 'es'" },
    { name: 'post_date', sql: "ALTER TABLE leads ADD COLUMN post_date DATETIME" },
    { name: 'demo_url', sql: "ALTER TABLE leads ADD COLUMN demo_url TEXT" },
    { name: 'demo_slug', sql: "ALTER TABLE leads ADD COLUMN demo_slug TEXT" },
  ];

  for (const col of newColumns) {
    if (!columns.includes(col.name)) {
      try {
        db.exec(col.sql);
        console.log(`[DB] Migración: columna '${col.name}' añadida`);
      } catch (err) {
        console.warn(`[DB] Migración: error añadiendo '${col.name}': ${err.message}`);
      }
    }
  }

  // Migrar tabla scans
  const scanColumns = db.prepare("PRAGMA table_info(scans)").all().map(c => c.name);
  if (!scanColumns.includes('scan_type')) {
    try { db.exec("ALTER TABLE scans ADD COLUMN scan_type TEXT DEFAULT 'local'"); } catch {}
  }
  if (!scanColumns.includes('source')) {
    try { db.exec("ALTER TABLE scans ADD COLUMN source TEXT DEFAULT 'google_maps'"); } catch {}
  }

  // Migrar tabla emails_sent
  const emailColumns = db.prepare("PRAGMA table_info(emails_sent)").all().map(c => c.name);
  if (!emailColumns.includes('opened_at')) {
    try {
      db.exec("ALTER TABLE emails_sent ADD COLUMN opened_at DATETIME");
      console.log("[DB] Migración: columna 'opened_at' añadida a emails_sent");
    } catch {}
  }
}

// === QUERIES DE LEADS (LOCALES) ===

export function insertLead(lead) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leads (name, sector, address, phone, email, website, google_maps_url, rating, review_count, zone, lead_type, source)
    VALUES (@name, @sector, @address, @phone, @email, @website, @google_maps_url, @rating, @review_count, @zone, 'local', 'google_maps')
  `);
  return stmt.run(lead);
}

// === QUERIES DE LEADS (ONLINE) ===

export function insertOnlineLead(lead) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leads (
      name, lead_type, source, source_url, source_id, source_author,
      email, description, budget_min, budget_max, service_type,
      urgency, language, post_date, sector, zone
    ) VALUES (
      @name, 'online', @source, @source_url, @source_id, @source_author,
      @email, @description, @budget_min, @budget_max, @service_type,
      @urgency, @language, @post_date, @sector, @zone
    )
  `);
  return stmt.run(lead);
}

export function getOnlineLeads(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM leads WHERE lead_type = 'online' ORDER BY found_at DESC LIMIT ?
  `).all(limit);
}

export function getLeadsBySource(source, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM leads WHERE source = ? ORDER BY found_at DESC LIMIT ?
  `).all(source, limit);
}

// === QUERIES COMUNES ===

export function updateLeadScore(id, score, tier, analysis) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE leads SET
      lead_score = ?, lead_tier = ?,
      has_website = ?, website_quality = ?,
      has_booking_system = ?, has_social_media = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(score, tier, analysis.hasWebsite, analysis.websiteQuality, analysis.hasBooking, analysis.hasSocial, id);
}

export function updateOnlineLeadScore(id, score, tier, notes) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE leads SET
      lead_score = ?, lead_tier = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(score, tier, notes, id);
}

export function updateLeadStatus(id, status, notes) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  return stmt.run(status, notes, id);
}

export function getLeadsByTier(tier, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM leads WHERE lead_tier = ? AND status = 'new' ORDER BY lead_score DESC LIMIT ?
  `).all(tier, limit);
}

export function getLeadsToContact(limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM leads
    WHERE status = 'new' AND lead_score >= ? AND email IS NOT NULL
    ORDER BY lead_score DESC LIMIT ?
  `).all(parseInt(process.env.LEAD_SCORE_THRESHOLD || '50'), limit);
}

export function getLeadById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

export function getLeadStats() {
  const db = getDb();
  return {
    total: db.prepare('SELECT COUNT(*) as c FROM leads').get().c,
    hot: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'hot'").get().c,
    warm: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'warm'").get().c,
    cold: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'cold'").get().c,
    contacted: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'contacted'").get().c,
    replied: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'replied'").get().c,
    meetings: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'meeting'").get().c,
    clients: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'client'").get().c,
    // Desglose por tipo
    totalLocal: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'local'").get().c,
    totalOnline: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_type = 'online'").get().c,
    hotLocal: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'hot' AND lead_type = 'local'").get().c,
    hotOnline: db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_tier = 'hot' AND lead_type = 'online'").get().c,
    bySource: db.prepare("SELECT source, COUNT(*) as c FROM leads GROUP BY source").all(),
  };
}

// === QUERIES DE EMAILS ===

export function insertEmailSent(leadId, step, template, subject, toEmail) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO emails_sent (lead_id, sequence_step, template, subject, to_email)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(leadId, step, template, subject, toEmail);
}

export function updateEmailStatus(emailId, status) {
  const db = getDb();
  db.prepare('UPDATE emails_sent SET status = ? WHERE id = ?').run(status, emailId);
}

export function getEmailsSentToday() {
  const db = getDb();
  return db.prepare(`
    SELECT COUNT(*) as c FROM emails_sent WHERE DATE(sent_at) = DATE('now')
  `).get().c;
}

export function getLastEmailForLead(leadId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM emails_sent WHERE lead_id = ? ORDER BY sent_at DESC LIMIT 1
  `).get(leadId);
}

export function getLeadsForFollowUp(step, daysAfter) {
  const db = getDb();
  return db.prepare(`
    SELECT l.*, e.sequence_step, e.sent_at as last_email_at
    FROM leads l
    JOIN emails_sent e ON e.lead_id = l.id
    WHERE l.status = 'contacted'
      AND e.sequence_step = ?
      AND e.status = 'sent'
      AND julianday('now') - julianday(e.sent_at) >= ?
      AND l.id NOT IN (
        SELECT lead_id FROM emails_sent WHERE sequence_step > ?
      )
  `).all(step, daysAfter, step);
}

// === QUERIES DE TRACKING ===

export function markEmailOpened(emailId) {
  const db = getDb();
  const email = db.prepare('SELECT id, opened_at FROM emails_sent WHERE id = ?').get(emailId);

  if (!email) {
    return { updated: false, alreadyOpened: false };
  }

  if (email.opened_at) {
    return { updated: false, alreadyOpened: true };
  }

  db.prepare('UPDATE emails_sent SET opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(emailId);
  return { updated: true, alreadyOpened: false };
}

export function getEmailWithLead(emailId) {
  const db = getDb();
  return db.prepare(`
    SELECT e.*, l.name as lead_name, l.sector, l.zone, l.lead_type
    FROM emails_sent e
    JOIN leads l ON e.lead_id = l.id
    WHERE e.id = ?
  `).get(emailId);
}

export function getEmailOpenStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM emails_sent').get().c;
  const opened = db.prepare('SELECT COUNT(*) as c FROM emails_sent WHERE opened_at IS NOT NULL').get().c;
  const openedToday = db.prepare("SELECT COUNT(*) as c FROM emails_sent WHERE DATE(opened_at) = DATE('now')").get().c;
  const rate = total > 0 ? ((opened / total) * 100).toFixed(1) : '0.0';

  return { total, opened, openedToday, rate };
}

// === QUERIES DE SCANS ===

export function insertScan(zone, sector, resultsCount, newLeadsCount, scanType = 'local', source = 'google_maps') {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scans (zone, sector, results_count, new_leads_count, scan_type, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(zone, sector, resultsCount, newLeadsCount, scanType, source);
}

// === QUERIES DE SETTINGS ===

export function getSetting(key, defaultValue = null) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

// === QUERIES DE DEMO VISITS ===

export function getLeadsWithDemos() {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, sector, zone, demo_url, demo_slug, status, lead_score, lead_tier
    FROM leads WHERE demo_slug IS NOT NULL AND demo_slug != ''
  `).all();
}

export function getDemoVisit(leadId) {
  const db = getDb();
  return db.prepare('SELECT * FROM demo_visits WHERE lead_id = ?').get(leadId);
}

export function upsertDemoVisit(leadId, demoSlug, visitCount, lastVisitAt) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM demo_visits WHERE lead_id = ?').get(leadId);

  if (existing) {
    db.prepare(`
      UPDATE demo_visits SET
        visit_count = ?, last_visit_at = ?
      WHERE lead_id = ?
    `).run(visitCount, lastVisitAt, leadId);
  } else {
    db.prepare(`
      INSERT INTO demo_visits (lead_id, demo_slug, visit_count, last_visit_at, first_visit_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(leadId, demoSlug, visitCount, lastVisitAt, lastVisitAt);
  }
}

export function getDemoVisitStats() {
  const db = getDb();
  return {
    totalDemos: db.prepare('SELECT COUNT(*) as c FROM leads WHERE demo_slug IS NOT NULL').get().c,
    demosVisited: db.prepare('SELECT COUNT(*) as c FROM demo_visits WHERE visit_count > 0').get().c,
    totalVisits: db.prepare('SELECT COALESCE(SUM(visit_count), 0) as c FROM demo_visits').get().c,
    recentVisits: db.prepare(`
      SELECT dv.*, l.name, l.sector, l.zone
      FROM demo_visits dv
      JOIN leads l ON l.id = dv.lead_id
      WHERE dv.visit_count > 0
      ORDER BY dv.last_visit_at DESC LIMIT 5
    `).all(),
  };
}

// === QUERIES DE AUTOMATION TASKS ===

export function getTasksByAutomation(automationId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM automation_tasks WHERE automation_id = ? ORDER BY step_number ASC'
  ).all(automationId);
}

export function getTaskById(taskId) {
  const db = getDb();
  return db.prepare('SELECT * FROM automation_tasks WHERE id = ?').get(taskId);
}

export function insertTask(task) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO automation_tasks (automation_id, step_number, title, description, task_type)
    VALUES (@automation_id, @step_number, @title, @description, @task_type)
  `).run(task);
}

export function updateTaskStatus(taskId, status, result = null, error = null) {
  const db = getDb();
  const updates = ['status = ?', "updated_at = datetime('now')"];
  const params = [status];

  if (status === 'running') {
    updates.push("started_at = datetime('now')");
  }
  if (status === 'completed' || status === 'failed') {
    updates.push("completed_at = datetime('now')");
  }
  if (result !== null) {
    updates.push('result = ?');
    params.push(result);
  }
  if (error !== null) {
    updates.push('error = ?');
    params.push(error);
  }

  params.push(taskId);
  db.prepare(`UPDATE automation_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteTasksByAutomation(automationId) {
  const db = getDb();
  db.prepare('DELETE FROM automation_tasks WHERE automation_id = ?').run(automationId);
}

// ========================================
// MÓDULO FREELANCE — QUERIES
// ========================================

// === FREELANCE CLIENTS ===

export function getFreelanceClients({ status, source, search, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (source) { conditions.push('source = ?'); params.push(source); }
  if (search) { conditions.push('(name LIKE ? OR company LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelance_clients ${where}`).get(...params).c;
  const clients = db.prepare(
    `SELECT * FROM freelance_clients ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return { clients, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getFreelanceClientById(id) {
  return getDb().prepare('SELECT * FROM freelance_clients WHERE id = ?').get(id);
}

export function insertFreelanceClient(client) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO freelance_clients (name, company, email, phone, country, language, timezone, source, source_url, lead_id, status, tags, notes, first_contact_at)
    VALUES (@name, @company, @email, @phone, @country, @language, @timezone, @source, @source_url, @lead_id, @status, @tags, @notes, @first_contact_at)
  `);
  return stmt.run({
    name: client.name, company: client.company || null, email: client.email || null,
    phone: client.phone || null, country: client.country || null, language: client.language || 'en',
    timezone: client.timezone || null, source: client.source || null, source_url: client.source_url || null,
    lead_id: client.lead_id || null, status: client.status || 'prospect', tags: client.tags ? JSON.stringify(client.tags) : null,
    notes: client.notes || null, first_contact_at: client.first_contact_at || null,
  });
}

export function updateFreelanceClient(id, updates) {
  const db = getDb();
  const allowed = ['name', 'company', 'email', 'phone', 'country', 'language', 'timezone', 'source', 'source_url', 'status', 'tags', 'notes', 'rating', 'last_contact_at'];
  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(key === 'tags' && Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  db.prepare(`UPDATE freelance_clients SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteFreelanceClient(id) {
  const db = getDb();
  db.prepare('DELETE FROM freelance_milestones WHERE project_id IN (SELECT id FROM freelance_projects WHERE client_id = ?)').run(id);
  db.prepare('DELETE FROM freelance_projects WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM freelance_finances WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM freelance_clients WHERE id = ?').run(id);
}

// === FREELANCE PROJECTS ===

export function getFreelanceProjects({ status, client_id, service_type, search, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) { conditions.push('p.status = ?'); params.push(status); }
  if (client_id) { conditions.push('p.client_id = ?'); params.push(client_id); }
  if (service_type) { conditions.push('p.service_type = ?'); params.push(service_type); }
  if (search) { conditions.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelance_projects p ${where}`).get(...params).c;
  const projects = db.prepare(`
    SELECT p.*, c.name as client_name FROM freelance_projects p
    LEFT JOIN freelance_clients c ON p.client_id = c.id
    ${where} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  return { projects, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getFreelanceProjectById(id) {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, c.name as client_name, c.company as client_company, c.email as client_email
    FROM freelance_projects p
    LEFT JOIN freelance_clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(id);
  if (!project) return null;

  const milestones = db.prepare('SELECT * FROM freelance_milestones WHERE project_id = ? ORDER BY id ASC').all(id);
  const finances = db.prepare('SELECT * FROM freelance_finances WHERE project_id = ? ORDER BY date DESC').all(id);
  return { ...project, milestones, finances };
}

export function insertFreelanceProject(project) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO freelance_projects (client_id, name, description, service_type, status, currency, budget_min, budget_max,
      agreed_price, payment_type, hourly_rate, hours_estimated, deposit_amount, platform, platform_fee_percent,
      proposal_url, contract_url, repo_url, deploy_url, deadline)
    VALUES (@client_id, @name, @description, @service_type, @status, @currency, @budget_min, @budget_max,
      @agreed_price, @payment_type, @hourly_rate, @hours_estimated, @deposit_amount, @platform, @platform_fee_percent,
      @proposal_url, @contract_url, @repo_url, @deploy_url, @deadline)
  `).run({
    client_id: project.client_id, name: project.name, description: project.description || null,
    service_type: project.service_type || null, status: project.status || 'proposal',
    currency: project.currency || 'EUR', budget_min: project.budget_min || null, budget_max: project.budget_max || null,
    agreed_price: project.agreed_price || null, payment_type: project.payment_type || 'fixed',
    hourly_rate: project.hourly_rate || null, hours_estimated: project.hours_estimated || null,
    deposit_amount: project.deposit_amount || null, platform: project.platform || null,
    platform_fee_percent: project.platform_fee_percent || 0, proposal_url: project.proposal_url || null,
    contract_url: project.contract_url || null, repo_url: project.repo_url || null,
    deploy_url: project.deploy_url || null, deadline: project.deadline || null,
  });

  // Actualizar contador de proyectos del cliente
  db.prepare('UPDATE freelance_clients SET projects_count = projects_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(project.client_id);
  return result;
}

export function updateFreelanceProject(id, updates) {
  const db = getDb();
  const allowed = ['name', 'description', 'service_type', 'status', 'currency', 'budget_min', 'budget_max',
    'agreed_price', 'payment_type', 'hourly_rate', 'hours_estimated', 'hours_logged', 'deposit_amount',
    'deposit_paid', 'total_paid', 'platform', 'platform_fee_percent', 'proposal_url', 'contract_url',
    'repo_url', 'deploy_url', 'deadline', 'started_at', 'delivered_at', 'paid_at'];
  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  db.prepare(`UPDATE freelance_projects SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  // Si se marca como paid, actualizar total_revenue del cliente
  if (updates.status === 'paid' || updates.total_paid !== undefined) {
    const project = db.prepare('SELECT client_id FROM freelance_projects WHERE id = ?').get(id);
    if (project) {
      const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_paid), 0) as t FROM freelance_projects WHERE client_id = ?').get(project.client_id).t;
      db.prepare('UPDATE freelance_clients SET total_revenue = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(totalRevenue, project.client_id);
    }
  }
}

export function deleteFreelanceProject(id) {
  const db = getDb();
  const project = db.prepare('SELECT client_id FROM freelance_projects WHERE id = ?').get(id);
  db.prepare('DELETE FROM freelance_milestones WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM freelance_finances WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM freelance_projects WHERE id = ?').run(id);
  if (project) {
    db.prepare('UPDATE freelance_clients SET projects_count = MAX(0, projects_count - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(project.client_id);
  }
}

// === FREELANCE MILESTONES ===

export function insertFreelanceMilestone(milestone) {
  return getDb().prepare(`
    INSERT INTO freelance_milestones (project_id, title, description, amount, status, due_date)
    VALUES (@project_id, @title, @description, @amount, @status, @due_date)
  `).run({
    project_id: milestone.project_id, title: milestone.title,
    description: milestone.description || null, amount: milestone.amount || null,
    status: milestone.status || 'pending', due_date: milestone.due_date || null,
  });
}

export function updateFreelanceMilestone(id, updates) {
  const db = getDb();
  const allowed = ['title', 'description', 'amount', 'status', 'due_date', 'completed_at', 'paid_at'];
  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { sets.push(`${key} = ?`); params.push(value); }
  }
  if (sets.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE freelance_milestones SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteFreelanceMilestone(id) {
  getDb().prepare('DELETE FROM freelance_milestones WHERE id = ?').run(id);
}

// === FREELANCE FINANCES ===

export function getFreelanceFinances({ type, category, date_from, date_to, project_id, client_id, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (type) { conditions.push('f.type = ?'); params.push(type); }
  if (category) { conditions.push('f.category = ?'); params.push(category); }
  if (date_from) { conditions.push('f.date >= ?'); params.push(date_from); }
  if (date_to) { conditions.push('f.date <= ?'); params.push(date_to); }
  if (project_id) { conditions.push('f.project_id = ?'); params.push(project_id); }
  if (client_id) { conditions.push('f.client_id = ?'); params.push(client_id); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelance_finances f ${where}`).get(...params).c;
  const finances = db.prepare(`
    SELECT f.*, p.name as project_name, c.name as client_name
    FROM freelance_finances f
    LEFT JOIN freelance_projects p ON f.project_id = p.id
    LEFT JOIN freelance_clients c ON f.client_id = c.id
    ${where} ORDER BY f.date DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  return { finances, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getFreelanceFinanceSummary(period = 'month') {
  const db = getDb();
  const dateFilter = period === 'year'
    ? "strftime('%Y', date) = strftime('%Y', 'now')"
    : "strftime('%Y-%m', date) = strftime('%Y-%m', 'now')";

  const income = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'income' AND ${dateFilter}`).get().t;
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'expense' AND ${dateFilter}`).get().t;
  const balance = income - expenses;

  const byCategory = db.prepare(`
    SELECT category, type, SUM(amount) as total FROM freelance_finances WHERE ${dateFilter} GROUP BY category, type ORDER BY total DESC
  `).all();

  const byClient = db.prepare(`
    SELECT c.name as client_name, SUM(f.amount) as total
    FROM freelance_finances f
    JOIN freelance_clients c ON f.client_id = c.id
    WHERE f.type = 'income' AND ${dateFilter}
    GROUP BY f.client_id ORDER BY total DESC
  `).all();

  // Últimos 6 meses
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM freelance_finances
    WHERE date >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `).all();

  return { income, expenses, balance, byCategory, byClient, monthly };
}

export function insertFreelanceFinance(finance) {
  return getDb().prepare(`
    INSERT INTO freelance_finances (type, category, amount, currency, description, project_id, client_id, date, invoice_number, invoice_url, tax_deductible, recurring, recurring_period, notes)
    VALUES (@type, @category, @amount, @currency, @description, @project_id, @client_id, @date, @invoice_number, @invoice_url, @tax_deductible, @recurring, @recurring_period, @notes)
  `).run({
    type: finance.type, category: finance.category, amount: finance.amount,
    currency: finance.currency || 'EUR', description: finance.description || null,
    project_id: finance.project_id || null, client_id: finance.client_id || null,
    date: finance.date, invoice_number: finance.invoice_number || null,
    invoice_url: finance.invoice_url || null, tax_deductible: finance.tax_deductible ? 1 : 0,
    recurring: finance.recurring ? 1 : 0, recurring_period: finance.recurring_period || null,
    notes: finance.notes || null,
  });
}

export function updateFreelanceFinance(id, updates) {
  const db = getDb();
  const allowed = ['type', 'category', 'amount', 'currency', 'description', 'project_id', 'client_id', 'date', 'invoice_number', 'invoice_url', 'tax_deductible', 'recurring', 'recurring_period', 'notes'];
  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { sets.push(`${key} = ?`); params.push(value); }
  }
  if (sets.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE freelance_finances SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteFreelanceFinance(id) {
  getDb().prepare('DELETE FROM freelance_finances WHERE id = ?').run(id);
}

// === FREELANCE OPPORTUNITIES ===

export function getFreelanceOpportunities({ platform, status, min_score, category, search, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (platform) { conditions.push('platform = ?'); params.push(platform); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (min_score) { conditions.push('match_score >= ?'); params.push(parseInt(min_score)); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (search) { conditions.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelance_opportunities ${where}`).get(...params).c;
  const opportunities = db.prepare(
    `SELECT * FROM freelance_opportunities ${where} ORDER BY match_score DESC, found_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return { opportunities, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getFreelanceOpportunityById(id) {
  return getDb().prepare('SELECT * FROM freelance_opportunities WHERE id = ?').get(id);
}

export function insertFreelanceOpportunity(opp) {
  return getDb().prepare(`
    INSERT OR IGNORE INTO freelance_opportunities (platform, title, description, url, author, author_url,
      budget_min, budget_max, budget_type, currency, skills_required, category, country, language,
      urgency, posted_at, proposals_count, client_rating, client_spent, match_score, match_reasons, status)
    VALUES (@platform, @title, @description, @url, @author, @author_url,
      @budget_min, @budget_max, @budget_type, @currency, @skills_required, @category, @country, @language,
      @urgency, @posted_at, @proposals_count, @client_rating, @client_spent, @match_score, @match_reasons, 'new')
  `).run({
    platform: opp.platform, title: opp.title, description: opp.description || null,
    url: opp.url, author: opp.author || null, author_url: opp.author_url || null,
    budget_min: opp.budget_min || null, budget_max: opp.budget_max || null,
    budget_type: opp.budget_type || null, currency: opp.currency || 'USD',
    skills_required: opp.skills_required ? JSON.stringify(opp.skills_required) : null,
    category: opp.category || null, country: opp.country || null, language: opp.language || 'en',
    urgency: opp.urgency || null, posted_at: opp.posted_at || null,
    proposals_count: opp.proposals_count || null, client_rating: opp.client_rating || null,
    client_spent: opp.client_spent || null, match_score: opp.match_score || 0,
    match_reasons: opp.match_reasons ? JSON.stringify(opp.match_reasons) : null,
  });
}

export function updateFreelanceOpportunity(id, updates) {
  const db = getDb();
  const allowed = ['status', 'notes', 'proposal_text', 'applied_at', 'match_score', 'match_reasons'];
  const sets = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { sets.push(`${key} = ?`); params.push(value); }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  db.prepare(`UPDATE freelance_opportunities SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

// === FREELANCE PROFILE ===

export function getFreelanceProfile() {
  return getDb().prepare('SELECT key, value FROM freelance_profile').all()
    .reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
}

export function setFreelanceProfile(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO freelance_profile (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, String(value));
}

export function setFreelanceProfileBulk(entries) {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO freelance_profile (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  const run = db.transaction((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      stmt.run(key, String(value));
    }
  });
  run(entries);
}

// === PLATFORM BALANCES ===

export function getPlatformBalances() {
  return getDb().prepare('SELECT * FROM platform_balances ORDER BY platform ASC').all();
}

export function getPlatformBalance(platform) {
  return getDb().prepare('SELECT * FROM platform_balances WHERE platform = ?').get(platform);
}

export function upsertPlatformBalance(balance) {
  const db = getDb();
  db.prepare(`
    INSERT INTO platform_balances (platform, credits_balance, credits_unit, cost_per_credit, cost_currency, monthly_free_credits, subscription_plan, subscription_cost, notes, updated_at)
    VALUES (@platform, @credits_balance, @credits_unit, @cost_per_credit, @cost_currency, @monthly_free_credits, @subscription_plan, @subscription_cost, @notes, CURRENT_TIMESTAMP)
    ON CONFLICT(platform) DO UPDATE SET
      credits_balance = @credits_balance, credits_unit = @credits_unit, cost_per_credit = @cost_per_credit,
      cost_currency = @cost_currency, monthly_free_credits = @monthly_free_credits,
      subscription_plan = @subscription_plan, subscription_cost = @subscription_cost,
      notes = @notes, updated_at = CURRENT_TIMESTAMP
  `).run({
    platform: balance.platform, credits_balance: balance.credits_balance || 0,
    credits_unit: balance.credits_unit || 'connects', cost_per_credit: balance.cost_per_credit || 0,
    cost_currency: balance.cost_currency || 'USD', monthly_free_credits: balance.monthly_free_credits || 0,
    subscription_plan: balance.subscription_plan || null, subscription_cost: balance.subscription_cost || 0,
    notes: balance.notes || null,
  });
}

export function addPlatformCredits(platform, amount, description = 'Recarga manual') {
  const db = getDb();
  const current = db.prepare('SELECT credits_balance FROM platform_balances WHERE platform = ?').get(platform);
  if (!current) return null;

  const newBalance = current.credits_balance + amount;
  db.prepare('UPDATE platform_balances SET credits_balance = ?, last_refill_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE platform = ?').run(newBalance, platform);

  db.prepare(`
    INSERT INTO platform_credit_transactions (platform, type, amount, balance_after, description)
    VALUES (?, 'refill', ?, ?, ?)
  `).run(platform, amount, newBalance, description);

  return newBalance;
}

export function spendPlatformCredits(platform, amount, opportunityId = null, description = 'Aplicación a proyecto') {
  const db = getDb();
  const current = db.prepare('SELECT credits_balance FROM platform_balances WHERE platform = ?').get(platform);
  if (!current || current.credits_balance < amount) return null;

  const newBalance = current.credits_balance - amount;
  db.prepare('UPDATE platform_balances SET credits_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE platform = ?').run(newBalance, platform);

  db.prepare(`
    INSERT INTO platform_credit_transactions (platform, type, amount, balance_after, opportunity_id, description)
    VALUES (?, 'spend', ?, ?, ?, ?)
  `).run(platform, -amount, newBalance, opportunityId, description);

  return newBalance;
}

export function getPlatformCreditHistory(platform, limit = 50) {
  return getDb().prepare(`
    SELECT t.*, o.title as opportunity_title
    FROM platform_credit_transactions t
    LEFT JOIN freelance_opportunities o ON t.opportunity_id = o.id
    WHERE t.platform = ?
    ORDER BY t.created_at DESC LIMIT ?
  `).all(platform, limit);
}

// === FREELANCE STATS ===

export function getFreelanceStats() {
  const db = getDb();
  return {
    clients: {
      total: db.prepare('SELECT COUNT(*) as c FROM freelance_clients').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM freelance_clients WHERE status = 'active'").get().c,
      prospects: db.prepare("SELECT COUNT(*) as c FROM freelance_clients WHERE status = 'prospect'").get().c,
    },
    projects: {
      total: db.prepare('SELECT COUNT(*) as c FROM freelance_projects').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM freelance_projects WHERE status = 'in_progress'").get().c,
      proposals: db.prepare("SELECT COUNT(*) as c FROM freelance_projects WHERE status = 'proposal'").get().c,
      delivered: db.prepare("SELECT COUNT(*) as c FROM freelance_projects WHERE status = 'delivered'").get().c,
      paid: db.prepare("SELECT COUNT(*) as c FROM freelance_projects WHERE status = 'paid'").get().c,
    },
    opportunities: {
      total: db.prepare('SELECT COUNT(*) as c FROM freelance_opportunities').get().c,
      hot: db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE match_score >= 70").get().c,
      applied: db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE status = 'applied'").get().c,
      won: db.prepare("SELECT COUNT(*) as c FROM freelance_opportunities WHERE status = 'won'").get().c,
    },
    revenue: {
      thisMonth: db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'income' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().t,
      lastMonth: db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'income' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month')").get().t,
      thisYear: db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'income' AND strftime('%Y', date) = strftime('%Y', 'now')").get().t,
    },
    expenses: {
      thisMonth: db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'expense' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get().t,
      thisYear: db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM freelance_finances WHERE type = 'expense' AND strftime('%Y', date) = strftime('%Y', 'now')").get().t,
    },
  };
}

// === TIME ENTRIES ===

export function getTimeEntries(projectId, { page = 1, limit = 50 } = {}) {
  const db = getDb();
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const total = db.prepare('SELECT COUNT(*) as c FROM time_entries WHERE project_id = ?').get(projectId).c;
  const entries = db.prepare(
    'SELECT * FROM time_entries WHERE project_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?'
  ).all(projectId, parseInt(limit), offset);
  return { entries, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getActiveTimer(projectId) {
  return getDb().prepare('SELECT * FROM time_entries WHERE project_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1').get(projectId);
}

export function getAnyActiveTimer() {
  return getDb().prepare('SELECT te.*, fp.name as project_name FROM time_entries te JOIN freelance_projects fp ON te.project_id = fp.id WHERE te.ended_at IS NULL ORDER BY te.started_at DESC LIMIT 1').get();
}

export function startTimer(projectId, description) {
  const db = getDb();
  // Parar cualquier timer activo en este proyecto
  const active = getActiveTimer(projectId);
  if (active) stopTimer(active.id);

  return db.prepare(
    'INSERT INTO time_entries (project_id, description, started_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).run(projectId, description || null);
}

export function stopTimer(entryId) {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId);
  if (!entry || entry.ended_at) return null;

  const duration = (Date.now() - new Date(entry.started_at).getTime()) / 60000;
  db.prepare('UPDATE time_entries SET ended_at = CURRENT_TIMESTAMP, duration_minutes = ? WHERE id = ?').run(Math.round(duration * 100) / 100, entryId);

  // Actualizar hours_logged del proyecto
  const totalMinutes = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as t FROM time_entries WHERE project_id = ? AND duration_minutes IS NOT NULL').get(entry.project_id).t;
  db.prepare('UPDATE freelance_projects SET hours_logged = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Math.round(totalMinutes / 60 * 100) / 100, entry.project_id);

  return db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId);
}

export function deleteTimeEntry(id) {
  const db = getDb();
  const entry = db.prepare('SELECT project_id FROM time_entries WHERE id = ?').get(id);
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(id);
  if (entry) {
    const totalMinutes = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as t FROM time_entries WHERE project_id = ? AND duration_minutes IS NOT NULL').get(entry.project_id).t;
    db.prepare('UPDATE freelance_projects SET hours_logged = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Math.round(totalMinutes / 60 * 100) / 100, entry.project_id);
  }
}

// === INVOICES ===

export function getInvoices({ client_id, status, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (client_id) { conditions.push('i.client_id = ?'); params.push(parseInt(client_id)); }
  if (status) { conditions.push('i.status = ?'); params.push(status); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const total = db.prepare(`SELECT COUNT(*) as c FROM invoices i ${where}`).get(...params).c;
  const invoices = db.prepare(
    `SELECT i.*, fc.name as client_name FROM invoices i LEFT JOIN freelance_clients fc ON i.client_id = fc.id ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);
  return { invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
}

export function getInvoiceById(id) {
  const db = getDb();
  const invoice = db.prepare('SELECT i.*, fc.name as client_name, fc.email as client_email, fc.company as client_company FROM invoices i LEFT JOIN freelance_clients fc ON i.client_id = fc.id WHERE i.id = ?').get(id);
  return invoice;
}

export function getNextInvoiceNumber() {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `T800-${year}-`;
  const last = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
  if (!last) return `${prefix}001`;
  const num = parseInt(last.invoice_number.replace(prefix, '')) + 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

export function insertInvoice(invoice) {
  const db = getDb();
  const number = invoice.invoice_number || getNextInvoiceNumber();
  const taxAmount = (invoice.amount || 0) * ((invoice.tax_rate || 21) / 100);
  const total = (invoice.amount || 0) + taxAmount;
  return db.prepare(`
    INSERT INTO invoices (invoice_number, client_id, project_id, amount, currency, tax_rate, tax_amount, total, status, issued_at, due_at, notes, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    number, invoice.client_id, invoice.project_id || null, invoice.amount, invoice.currency || 'EUR',
    invoice.tax_rate ?? 21, taxAmount, total, invoice.status || 'draft',
    invoice.issued_at || null, invoice.due_at || null, invoice.notes || null,
    invoice.items ? JSON.stringify(invoice.items) : null
  );
}

export function updateInvoice(id, updates) {
  const db = getDb();
  const allowed = ['status', 'amount', 'tax_rate', 'notes', 'items', 'issued_at', 'due_at', 'paid_at'];
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) { sets.push(`${key} = ?`); params.push(key === 'items' ? JSON.stringify(value) : value); }
  }
  if (updates.amount !== undefined || updates.tax_rate !== undefined) {
    const current = db.prepare('SELECT amount, tax_rate FROM invoices WHERE id = ?').get(id);
    const amount = updates.amount ?? current.amount;
    const taxRate = updates.tax_rate ?? current.tax_rate;
    const taxAmount = amount * (taxRate / 100);
    sets.push('tax_amount = ?', 'total = ?');
    params.push(taxAmount, amount + taxAmount);
  }
  if (sets.length === 0) return;
  params.push(id);
  db.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteInvoice(id) {
  getDb().prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

// Setup si se ejecuta directamente
if (process.argv[1] && process.argv[1].includes('database.js')) {
  setupDatabase();
  console.log('[DB] Setup completado');
  process.exit(0);
}
