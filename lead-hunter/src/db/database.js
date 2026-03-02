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

// Setup si se ejecuta directamente
if (process.argv[1] && process.argv[1].includes('database.js')) {
  setupDatabase();
  console.log('[DB] Setup completado');
  process.exit(0);
}
