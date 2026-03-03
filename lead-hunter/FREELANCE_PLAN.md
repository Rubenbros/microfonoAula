# Lead Hunter v4.0 — Plan Maestro: Módulo Freelance

## Resumen ejecutivo

Añadir un módulo completo de gestión freelance al sistema Lead Hunter existente. El módulo convive con el sistema de pymes locales y comparte infraestructura (BD, API, panel web, bot Telegram, IA). El objetivo es automatizar la detección de oportunidades freelance, gestionar clientes/proyectos/finanzas, y usar IA para generar propuestas y scoring inteligente.

---

## FASE 1: Base de datos y modelos (Fundación)

### 1.1 Nuevas tablas SQLite

#### `freelance_clients` — Clientes freelance
```sql
CREATE TABLE freelance_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nombre del cliente/empresa
  company TEXT,                          -- Nombre de empresa (si aplica)
  email TEXT,
  phone TEXT,
  country TEXT,                          -- País (ES, US, UK, etc.)
  language TEXT DEFAULT 'en',            -- Idioma preferido
  timezone TEXT,                         -- Timezone del cliente
  source TEXT,                           -- upwork, linkedin, reddit, referral, cold_email, etc.
  source_url TEXT,                       -- URL del perfil/post original
  lead_id INTEGER,                       -- FK opcional → leads(id) si vino de un lead
  status TEXT DEFAULT 'prospect',        -- prospect, active, completed, recurring, lost
  tags TEXT,                             -- JSON array: ["web", "ai", "automation"]
  notes TEXT,
  total_revenue REAL DEFAULT 0,          -- Total facturado a este cliente
  projects_count INTEGER DEFAULT 0,      -- Nº de proyectos
  rating INTEGER,                        -- Tu rating del cliente (1-5)
  first_contact_at DATETIME,
  last_contact_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `freelance_projects` — Proyectos
```sql
CREATE TABLE freelance_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,            -- FK → freelance_clients(id)
  name TEXT NOT NULL,                    -- Nombre del proyecto
  description TEXT,
  service_type TEXT,                     -- web, app, ai, automation, consulting, bot, etc.
  status TEXT DEFAULT 'proposal',        -- proposal, negotiation, in_progress, delivered, paid, closed, cancelled
  currency TEXT DEFAULT 'EUR',           -- EUR, USD, GBP
  budget_min REAL,                       -- Presupuesto mínimo del cliente
  budget_max REAL,                       -- Presupuesto máximo del cliente
  agreed_price REAL,                     -- Precio acordado
  payment_type TEXT DEFAULT 'fixed',     -- fixed, hourly, retainer, milestone
  hourly_rate REAL,                      -- Si es por hora
  hours_estimated REAL,                  -- Horas estimadas
  hours_logged REAL DEFAULT 0,           -- Horas reales trabajadas
  deposit_amount REAL,                   -- Anticipo
  deposit_paid INTEGER DEFAULT 0,        -- Boolean: anticipo pagado
  total_paid REAL DEFAULT 0,             -- Total cobrado hasta ahora
  platform TEXT,                         -- upwork, direct, toptal, etc.
  platform_fee_percent REAL DEFAULT 0,   -- % comisión plataforma
  proposal_url TEXT,                     -- Link a propuesta enviada
  contract_url TEXT,                     -- Link a contrato
  repo_url TEXT,                         -- Link al repositorio
  deploy_url TEXT,                       -- Link al deploy/staging
  deadline DATETIME,
  started_at DATETIME,
  delivered_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES freelance_clients(id)
);
```

#### `freelance_milestones` — Hitos de proyecto
```sql
CREATE TABLE freelance_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,           -- FK → freelance_projects(id)
  title TEXT NOT NULL,
  description TEXT,
  amount REAL,                           -- Pago de este milestone
  status TEXT DEFAULT 'pending',         -- pending, in_progress, delivered, approved, paid
  due_date DATETIME,
  completed_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES freelance_projects(id) ON DELETE CASCADE
);
```

#### `freelance_finances` — Gastos e ingresos
```sql
CREATE TABLE freelance_finances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                    -- income, expense
  category TEXT NOT NULL,                -- Para income: project_payment, retainer, bonus, refund
                                         -- Para expense: software, hardware, hosting, domain, ai_tools,
                                         --   marketing, education, taxes, accountant, office, travel, other
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  description TEXT,
  project_id INTEGER,                    -- FK opcional → freelance_projects(id)
  client_id INTEGER,                     -- FK opcional → freelance_clients(id)
  date DATE NOT NULL,                    -- Fecha del movimiento
  invoice_number TEXT,                   -- Nº de factura (si aplica)
  invoice_url TEXT,                      -- Link a factura PDF
  tax_deductible INTEGER DEFAULT 0,      -- Boolean: deducible fiscalmente
  recurring INTEGER DEFAULT 0,           -- Boolean: gasto recurrente
  recurring_period TEXT,                 -- monthly, yearly, quarterly
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES freelance_projects(id),
  FOREIGN KEY (client_id) REFERENCES freelance_clients(id)
);
```

#### `freelance_opportunities` — Oportunidades detectadas en plataformas
```sql
CREATE TABLE freelance_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,                -- upwork, freelancer, toptal, linkedin, reddit, twitter, hackernews
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  author TEXT,                           -- Quien publicó
  author_url TEXT,                       -- Perfil del autor
  budget_min REAL,
  budget_max REAL,
  budget_type TEXT,                      -- fixed, hourly
  currency TEXT DEFAULT 'USD',
  skills_required TEXT,                  -- JSON array: ["react", "node", "ai"]
  category TEXT,                         -- web, mobile, ai, automation, etc.
  country TEXT,                          -- País del cliente
  language TEXT DEFAULT 'en',
  urgency TEXT,                          -- high, medium, low
  posted_at DATETIME,                   -- Cuando se publicó
  proposals_count INTEGER,               -- Cuántas propuestas ya tiene (Upwork)
  client_rating REAL,                    -- Rating del cliente en la plataforma
  client_spent REAL,                     -- Cuánto ha gastado el cliente históricamente
  match_score INTEGER DEFAULT 0,         -- 0-100: qué tan bien encaja con tu perfil
  match_reasons TEXT,                    -- JSON: razones del score
  status TEXT DEFAULT 'new',             -- new, interested, applied, interviewing, won, lost, skipped
  applied_at DATETIME,
  proposal_text TEXT,                    -- Propuesta que se envió
  notes TEXT,
  found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, url)
);
```

#### `freelance_profile` — Tu perfil (para matching y propuestas IA)
```sql
CREATE TABLE freelance_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Keys: name, title, bio, skills (JSON), experience_years, hourly_rate_min,
--        hourly_rate_max, preferred_project_size, preferred_languages,
--        portfolio_url, linkedin_url, github_url, availability, timezone
```

### 1.2 Índices
```sql
-- Clients
CREATE INDEX idx_fc_status ON freelance_clients(status);
CREATE INDEX idx_fc_source ON freelance_clients(source);

-- Projects
CREATE INDEX idx_fp_client ON freelance_projects(client_id);
CREATE INDEX idx_fp_status ON freelance_projects(status);

-- Finances
CREATE INDEX idx_ff_type ON freelance_finances(type);
CREATE INDEX idx_ff_date ON freelance_finances(date);
CREATE INDEX idx_ff_category ON freelance_finances(category);
CREATE INDEX idx_ff_project ON freelance_finances(project_id);

-- Opportunities
CREATE INDEX idx_fo_platform ON freelance_opportunities(platform);
CREATE INDEX idx_fo_status ON freelance_opportunities(status);
CREATE INDEX idx_fo_score ON freelance_opportunities(match_score);
CREATE INDEX idx_fo_posted ON freelance_opportunities(posted_at);

-- Milestones
CREATE INDEX idx_fm_project ON freelance_milestones(project_id);
CREATE INDEX idx_fm_status ON freelance_milestones(status);
```

### 1.3 Funciones de BD nuevas (`src/db/database.js`)
- CRUD completo para cada tabla nueva
- Stats y aggregaciones para dashboard
- Queries de reporting financiero (mensual, anual, por cliente, por categoría)

---

## FASE 2: Scrapers de plataformas freelance

### 2.1 Upwork Scraper (`src/scraper/upwork.js`)
- Scrapear RSS feeds públicos de Upwork (no necesita cuenta)
- URL: `https://www.upwork.com/ab/feed/jobs/rss?q=KEYWORD&sort=recency`
- Keywords configurables: "react developer", "ai automation", "full stack", "tech lead", etc.
- Parsear: título, descripción, budget, skills, país, propuestas count
- Rate limiting: 1 request cada 5 segundos
- Configuración en `config/freelance_sources.json`

### 2.2 LinkedIn Scraper mejorado (`src/scraper/linkedin-jobs.js`)
- Detectar posts de empresas buscando freelancers/contractors
- Buscar en Google: `site:linkedin.com "looking for" "freelance" "developer"`
- Parsear resultados de búsqueda de Google (no necesita API LinkedIn)
- Categorizar por tipo de servicio y urgencia

### 2.3 Reddit Freelance Scraper (extender `src/scraper/reddit.js`)
- Añadir subreddits: r/forhire, r/freelance, r/remotejs, r/webdev (ya algunos existen)
- Mejorar detección de tipo de servicio (AI, web, mobile, etc.)
- Añadir detección de keywords específicas de freelance

### 2.4 Twitter/X Scraper (`src/scraper/twitter.js`)
- Buscar tweets tipo "looking for developer", "hiring freelancer", "need a developer"
- Usar API de búsqueda de Twitter (o scraping via Nitter)
- Filtrar por engagement (likes, retweets)

### 2.5 HackerNews/IndieHackers (`src/scraper/hackernews.js`)
- Scrapear "Who is hiring?" threads mensuales de HN
- Scrapear posts de IndieHackers buscando co-founders/developers
- API pública de HN: `https://hacker-news.firebaseio.com/v0/`

### 2.6 Configuración centralizada (`config/freelance_sources.json`)
```json
{
  "upwork": {
    "enabled": true,
    "keywords": [
      "react developer", "nextjs", "full stack javascript",
      "ai automation", "chatbot developer", "tech lead",
      "node.js developer", "python automation"
    ],
    "min_budget": 500,
    "max_proposals": 20,
    "scan_interval_hours": 4
  },
  "linkedin": {
    "enabled": true,
    "search_queries": [
      "freelance developer react",
      "contractor ai automation",
      "tech lead fractional"
    ],
    "scan_interval_hours": 12
  },
  "reddit": {
    "enabled": true,
    "subreddits": [
      "forhire", "freelance", "remotejs", "webdev",
      "slavelabour", "startups"
    ],
    "scan_interval_hours": 6
  },
  "hackernews": {
    "enabled": true,
    "scan_interval_hours": 24
  },
  "twitter": {
    "enabled": false,
    "keywords": ["hiring freelancer", "looking for developer"],
    "scan_interval_hours": 12
  }
}
```

---

## FASE 3: Scoring de oportunidades freelance

### 3.1 `src/analyzer/freelance_scorer.js`

**Match Score (0-100) basado en perfil:**

```
Budget alto (>$3000):          +20
Budget medio ($1000-$3000):    +12
Budget bajo pero existente:    +5
Skills match (>80%):           +20
Skills match (50-80%):         +12
Skills match (<50%):           +3
Cliente con buen rating (≥4):  +10
Cliente con historial gasto:   +8
Pocas propuestas (<10):        +10
Urgencia alta:                 +8
Proyecto largo plazo:          +8
Idioma español:                +5
Plataforma premium (Toptal):   +5
Post reciente (<6h):           +10
Post reciente (<24h):          +5
```

**Tier classification:**
- Hot (≥70): Oportunidad top, aplicar inmediatamente
- Warm (40-70): Interesante, evaluar
- Cold (<40): Baja prioridad

### 3.2 Skills matching
- Comparar `skills_required` del proyecto con `skills` del perfil
- Matching fuzzy (ej: "reactjs" = "react", "nodejs" = "node.js")
- Pesos por skill (core skills valen más)

---

## FASE 4: API Backend — Nuevos endpoints

### 4.1 Freelance Clients (`src/api/routes/freelance-clients.js`)
```
GET    /api/freelance/clients              — Listar (filtros: status, source, search)
GET    /api/freelance/clients/:id          — Detalle + proyectos + finanzas
POST   /api/freelance/clients              — Crear cliente
PATCH  /api/freelance/clients/:id          — Actualizar
DELETE /api/freelance/clients/:id          — Eliminar
```

### 4.2 Freelance Projects (`src/api/routes/freelance-projects.js`)
```
GET    /api/freelance/projects             — Listar (filtros: status, client_id, service_type)
GET    /api/freelance/projects/:id         — Detalle + milestones + finanzas
POST   /api/freelance/projects             — Crear proyecto
PATCH  /api/freelance/projects/:id         — Actualizar
DELETE /api/freelance/projects/:id         — Eliminar
POST   /api/freelance/projects/:id/milestones  — Añadir milestone
PATCH  /api/freelance/milestones/:id       — Actualizar milestone
```

### 4.3 Freelance Finances (`src/api/routes/freelance-finances.js`)
```
GET    /api/freelance/finances             — Listar (filtros: type, category, date_from, date_to)
GET    /api/freelance/finances/summary     — Resumen: ingresos, gastos, balance (mes/año)
GET    /api/freelance/finances/by-category — Desglose por categoría
GET    /api/freelance/finances/by-client   — Desglose por cliente
POST   /api/freelance/finances             — Registrar ingreso/gasto
PATCH  /api/freelance/finances/:id         — Actualizar
DELETE /api/freelance/finances/:id         — Eliminar
```

### 4.4 Freelance Opportunities (`src/api/routes/freelance-opportunities.js`)
```
GET    /api/freelance/opportunities        — Listar (filtros: platform, status, min_score)
GET    /api/freelance/opportunities/:id    — Detalle
PATCH  /api/freelance/opportunities/:id    — Actualizar (status, notes, proposal_text)
POST   /api/freelance/opportunities/:id/apply — Marcar como aplicado + guardar propuesta
```

### 4.5 Freelance Profile (`src/api/routes/freelance-profile.js`)
```
GET    /api/freelance/profile              — Obtener perfil completo
PATCH  /api/freelance/profile              — Actualizar campos
```

### 4.6 Freelance Stats (`src/api/routes/freelance-stats.js`)
```
GET    /api/freelance/stats/dashboard      — Stats para dashboard freelance
GET    /api/freelance/stats/revenue        — Ingresos por período
GET    /api/freelance/stats/pipeline       — Pipeline de oportunidades
```

### 4.7 Freelance AI (`src/api/routes/freelance-ai.js`)
```
POST   /api/freelance/ai/proposal          — Generar propuesta para oportunidad
POST   /api/freelance/ai/analyze           — Analizar oportunidad (¿merece la pena?)
POST   /api/freelance/ai/cover-letter      — Generar cover letter personalizada
POST   /api/freelance/ai/pricing           — Sugerir pricing basado en historial
```

### 4.8 Freelance Scans
Extender `src/api/routes/scans.js`:
```
POST   /api/scans/upwork                   — Lanzar scan Upwork
POST   /api/scans/linkedin-jobs            — Lanzar scan LinkedIn Jobs
POST   /api/scans/hackernews               — Lanzar scan HackerNews
POST   /api/scans/twitter                  — Lanzar scan Twitter
POST   /api/scans/freelance-score          — Scoring de oportunidades
```

---

## FASE 5: Panel Web — Nuevas páginas

### 5.1 Sidebar actualizado
Añadir sección "Freelance" con subitems:
```
📊 Dashboard (existente - pymes)
👥 Leads (existente)
🔀 Pipeline (existente)
📡 Escáner (existente)
💡 Automatizaciones (existente)
─── FREELANCE ───
📈 Freelance Dashboard
🔍 Oportunidades
👤 Clientes
📁 Proyectos
💰 Finanzas
⚙️ Ajustes (existente - añadir tab freelance)
```

### 5.2 Freelance Dashboard (`/freelance`)
- Stats cards: Ingresos este mes, Proyectos activos, Oportunidades hot, Balance
- Gráfico de ingresos/gastos últimos 6 meses (Recharts — ya instalado)
- Pipeline de oportunidades (mini kanban)
- Próximos deadlines
- Últimas oportunidades detectadas

### 5.3 Oportunidades (`/freelance/opportunities`)
- Tabla con oportunidades de todas las plataformas
- Filtros: plataforma, status, score mínimo, skills, budget
- Ordenar por match_score, budget, fecha
- Detalle: descripción completa, skills requeridas, match analysis
- Acciones: Aplicar, Skip, Generar propuesta con IA
- Badge de match score con color (hot/warm/cold)

### 5.4 Clientes (`/freelance/clients`)
- Tabla con clientes
- Filtros: status, source, búsqueda
- Detalle: info, proyectos asociados, historial de ingresos, notas
- Crear/editar cliente

### 5.5 Proyectos (`/freelance/projects`)
- Vista lista + vista kanban (por status)
- Filtros: status, cliente, tipo de servicio
- Detalle: info, milestones, horas, finanzas del proyecto, links
- Barra de progreso por milestones
- Timer de horas (opcional, simple)

### 5.6 Finanzas (`/freelance/finances`)
- Dashboard financiero: ingresos vs gastos, balance
- Gráfico mensual (barras ingresos/gastos)
- Tabla de movimientos con filtros (tipo, categoría, fecha)
- Formulario para registrar ingreso/gasto
- Desglose por categoría (pie chart)
- Desglose por cliente (bar chart)
- Resumen fiscal (total facturado, total gastos deducibles)

### 5.7 Proxy API Routes (web/app/api/freelance/)
```
web/app/api/freelance/clients/route.js
web/app/api/freelance/clients/[id]/route.js
web/app/api/freelance/projects/route.js
web/app/api/freelance/projects/[id]/route.js
web/app/api/freelance/finances/route.js
web/app/api/freelance/finances/summary/route.js
web/app/api/freelance/opportunities/route.js
web/app/api/freelance/opportunities/[id]/route.js
web/app/api/freelance/stats/route.js
web/app/api/freelance/profile/route.js
web/app/api/freelance/ai/proposal/route.js
```

---

## FASE 6: IA y automatización

### 6.1 Generador de propuestas (`src/ai/freelance-proposal.js`)
Usando Claude Code CLI, generar propuestas personalizadas:
- Input: oportunidad + perfil del freelancer + historial de proyectos similares
- Output: propuesta en inglés/español, pricing sugerido, timeline
- Templates por plataforma (Upwork tiene formato específico)

### 6.2 Generador de cover letters (`src/ai/cover-letter.js`)
- Cover letter corta y directa para aplicar a proyectos
- Adapta al tono de cada plataforma
- Incluye experiencia relevante del portfolio

### 6.3 Analizador de oportunidades (`src/ai/opportunity-analyzer.js`)
- ¿Vale la pena este proyecto?
- Red flags del cliente (budget irrealista, scope creep, etc.)
- Estimación realista de horas
- Sugerencia de pricing

### 6.4 Pricing advisor (`src/ai/pricing-advisor.js`)
- Basado en historial de proyectos completados
- Compara con mercado (budget del cliente vs tu rate)
- Sugiere precio y justificación

---

## FASE 7: Bot Telegram — Comandos freelance

### 7.1 Nuevos comandos
```
/freelance              — Dashboard rápido (ingresos, proyectos activos, oportunidades)
/opportunities          — Top 5 oportunidades por match score
/opportunity <id>       — Detalle de oportunidad
/apply <id>             — Generar propuesta IA y marcar como aplicado
/clients                — Lista de clientes activos
/projects               — Proyectos en curso
/income                 — Ingresos del mes
/expense <amount> <cat> — Registrar gasto rápido
/balance                — Balance del mes
```

### 7.2 Notificaciones automáticas
- 🔥 Nueva oportunidad hot detectada (score ≥ 70)
- ⏰ Deadline de proyecto se acerca (3 días, 1 día)
- 💰 Milestone completado / pago pendiente
- 📊 Resumen semanal: ingresos, gastos, oportunidades, proyectos

---

## FASE 8: Cron Jobs nuevos

```
Cada 4h     — Scan Upwork (keywords configuradas)
Cada 6h     — Scan Reddit freelance (subreddits)
Cada 12h    — Scan LinkedIn jobs
Cada 24h    — Scan HackerNews "Who is hiring?"
Cada 4h     — Scoring de oportunidades nuevas
Lunes 09:00 — Resumen semanal freelance por Telegram
Diario 20:00 — Check deadlines próximos
Mensual 1ro — Resumen financiero del mes anterior
```

---

## ORDEN DE IMPLEMENTACIÓN (Priorizado)

### Sprint 1: Fundación (BD + API base)
1. Nuevas tablas en database.js (con migraciones)
2. CRUD functions en database.js
3. API routes: clients, projects, finances, opportunities, profile
4. Proxy routes en web/

### Sprint 2: Panel Web básico
5. Sidebar actualizado con sección Freelance
6. Página Clientes (CRUD)
7. Página Proyectos (CRUD + kanban)
8. Página Finanzas (CRUD + dashboard)
9. Freelance Dashboard

### Sprint 3: Scrapers + Scoring
10. Config freelance_sources.json
11. Upwork scraper
12. Reddit freelance (extender existente)
13. HackerNews scraper
14. Freelance scorer (match_score)
15. Página Oportunidades

### Sprint 4: IA + Automatización
16. Generador de propuestas con Claude
17. Cover letter generator
18. Opportunity analyzer
19. Pricing advisor
20. Integración en panel web (botones "Generar con IA")

### Sprint 5: Telegram + Cron
21. Nuevos comandos Telegram
22. Notificaciones automáticas freelance
23. Cron jobs para scans periódicos
24. Resúmenes semanales/mensuales

### Sprint 6: Extras
25. LinkedIn jobs scraper (Playwright)
26. Twitter scraper (si API disponible)
27. Timer de horas en proyectos
28. Export CSV de finanzas
29. Facturación básica (generar PDF)

---

## ARCHIVOS NUEVOS (estimación)

```
src/
├── db/database.js                      — MODIFICAR (añadir tablas + queries)
├── scraper/
│   ├── upwork.js                       — NUEVO
│   ├── hackernews.js                   — NUEVO
│   ├── twitter.js                      — NUEVO (fase 6)
│   └── linkedin-jobs.js                — NUEVO
├── analyzer/
│   └── freelance_scorer.js             — NUEVO
├── ai/
│   ├── freelance-proposal.js           — NUEVO
│   ├── cover-letter.js                 — NUEVO
│   ├── opportunity-analyzer.js         — NUEVO
│   └── pricing-advisor.js              — NUEVO
├── telegram/
│   └── commands.js                     — MODIFICAR (añadir comandos)
├── api/
│   ├── server.js                       — MODIFICAR (registrar rutas)
│   └── routes/
│       ├── freelance-clients.js        — NUEVO
│       ├── freelance-projects.js       — NUEVO
│       ├── freelance-finances.js       — NUEVO
│       ├── freelance-opportunities.js  — NUEVO
│       ├── freelance-profile.js        — NUEVO
│       ├── freelance-stats.js          — NUEVO
│       ├── freelance-ai.js             — NUEVO
│       └── scans.js                    — MODIFICAR (añadir endpoints)
├── index.js                            — MODIFICAR (añadir cron jobs)
config/
│   └── freelance_sources.json          — NUEVO

web/
├── app/
│   ├── freelance/
│   │   ├── page.jsx                    — NUEVO (Dashboard freelance)
│   │   ├── opportunities/page.jsx      — NUEVO
│   │   ├── clients/page.jsx            — NUEVO
│   │   ├── clients/[id]/page.jsx       — NUEVO
│   │   ├── projects/page.jsx           — NUEVO
│   │   ├── projects/[id]/page.jsx      — NUEVO
│   │   └── finances/page.jsx           — NUEVO
│   └── api/freelance/
│       ├── clients/route.js            — NUEVO
│       ├── clients/[id]/route.js       — NUEVO
│       ├── projects/route.js           — NUEVO
│       ├── projects/[id]/route.js      — NUEVO
│       ├── finances/route.js           — NUEVO
│       ├── finances/summary/route.js   — NUEVO
│       ├── opportunities/route.js      — NUEVO
│       ├── opportunities/[id]/route.js — NUEVO
│       ├── stats/route.js              — NUEVO
│       ├── profile/route.js            — NUEVO
│       └── ai/proposal/route.js        — NUEVO
└── components/
    ├── FreelanceDashboard.jsx          — NUEVO
    ├── OpportunitiesTable.jsx          — NUEVO
    ├── ClientsTable.jsx                — NUEVO
    ├── ClientDetail.jsx                — NUEVO
    ├── ProjectsBoard.jsx              — NUEVO
    ├── ProjectDetail.jsx               — NUEVO
    ├── FinancesDashboard.jsx           — NUEVO
    └── FreelancePipeline.jsx           — NUEVO
```

**Total estimado: ~35 archivos nuevos + ~6 archivos modificados**
