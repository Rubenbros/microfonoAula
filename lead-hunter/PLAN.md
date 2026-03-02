# Lead Hunter v2.0 — Plan de Implementación

## Resumen

Añadir 4 features al sistema existente:
1. **Panel web Next.js** — Dashboard para gestionar leads, desplegable en Vercel
2. **CRM básico** — Notas, actividades, tareas de seguimiento por lead
3. **Propuestas con IA** — Generación automática de presupuestos con Claude API
4. **Panel de Automatizaciones** — Ideas de nuevas líneas de negocio para T800 Labs con estado de implementación

## Arquitectura

```
┌──────────────────────────────────────────────┐
│           Vercel (panel.t800labs.com)         │
│                                              │
│   Next.js 15 (App Router)                    │
│   ┌─────────────┐  ┌──────────────────────┐  │
│   │  Pages/UI   │  │  API Routes          │  │
│   │  (React)    │  │  /api/leads          │  │
│   │  Dashboard  │  │  /api/stats          │  │
│   │  Leads      │  │  /api/proposals      │  │
│   │  Pipeline   │  │  /api/automations    │  │
│   │  CRM        │  │  /api/auth           │  │
│   │  Propuestas │  │                      │  │
│   │  Automat.   │  │  ┌────────────────┐  │  │
│   └─────────────┘  │  │ Claude API     │  │  │
│                    │  │ (propuestas +  │  │  │
│                    │  │  ideas negocio)│  │  │
│                    │  └────────────────┘  │  │
│                    └──────────┬───────────┘  │
└───────────────────────────────┼──────────────┘
                                │ fetch
                     ┌──────────▼───────────┐
                     │  Lead Hunter Backend │
                     │  (tu máquina/VPS)    │
                     │                      │
                     │  SQLite + Scrapers   │
                     │  + Bot Telegram      │
                     │  + Cron Jobs         │
                     │  + Email Tracker     │
                     │                      │
                     │  API sync endpoint   │
                     │  Puerto 3000         │
                     └──────────────────────┘
```

### Problema: Vercel no puede acceder a SQLite local

Vercel es serverless — no puede conectarse directamente a tu SQLite en tu máquina.
Solución: **API de sincronización** en el backend existente.

**Opción elegida: Backend API + Vercel fetches**
- El backend (tu máquina) expone un Express API en puerto 3000 con todas las queries
- Las API Routes de Next.js en Vercel llaman a ese backend via internet
- Se necesita exponer el backend con un túnel (Cloudflare Tunnel gratis) o VPS
- Auth: API key compartida entre Vercel y backend

```
Vercel API Route → fetch(BACKEND_URL/api/leads) → Express en tu máquina → SQLite
```

### Alternativa más simple: Turso (SQLite en la nube)

Si no quieres mantener un túnel, se puede migrar la BD a Turso (SQLite hosted, tier gratis).
Pero eso requiere cambiar database.js de better-sqlite3 a @libsql/client.
**Dejamos esto como opción futura si el túnel da problemas.**

## Stack técnico

- **Framework**: Next.js 15 (App Router, Server Components)
- **Deploy**: Vercel
- **Styling**: TailwindCSS 4
- **Auth**: NextAuth.js con credentials provider (password simple)
- **IA**: @anthropic-ai/sdk (Claude Sonnet para propuestas e ideas)
- **Charts**: Recharts
- **UI**: Lucide React (iconos), clsx
- **Backend sync**: Express API en máquina local + Cloudflare Tunnel

---

## Fase 0: Backend API (Express en máquina local)

El backend Lead Hunter necesita exponer sus datos via HTTP para que Vercel pueda consumirlos.

### Archivos nuevos

```
src/api/
├── server.js          # Express app + CORS + API key auth
└── routes/
    ├── leads.js       # CRUD leads + filtros + paginación
    ├── emails.js      # Emails enviados + envío manual
    ├── stats.js       # Estadísticas y analytics
    ├── activities.js  # CRM: actividades y notas
    ├── proposals.js   # CRUD propuestas
    ├── automations.js # Ideas de automatización
    └── settings.js    # Config del sistema
```

### Auth del backend API

API key simple en header `X-API-Key`. Solo el frontend en Vercel conoce la key.

```
# .env
BACKEND_API_KEY=una_key_larga_random_generada
BACKEND_API_PORT=3000
```

### Endpoints del backend

**Leads:**
- `GET /api/leads?tier=&status=&source=&sector=&zone=&search=&sort=&page=&limit=`
- `GET /api/leads/:id` (incluye emails, demo visits, actividades)
- `PATCH /api/leads/:id` (actualizar estado/notas)
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/email` (enviar email)

**Stats:**
- `GET /api/stats/overview`
- `GET /api/stats/timeline?days=28`
- `GET /api/stats/conversion`
- `GET /api/stats/by-sector`
- `GET /api/stats/by-source`

**CRM:**
- `GET /api/leads/:id/activities`
- `POST /api/leads/:id/activities`
- `DELETE /api/activities/:id`

**Propuestas:**
- `GET /api/leads/:id/proposals`
- `POST /api/leads/:id/proposals` (crear borrador manual)
- `PATCH /api/proposals/:id`
- `DELETE /api/proposals/:id`

**Automatizaciones:**
- `GET /api/automations`
- `POST /api/automations`
- `PATCH /api/automations/:id`
- `DELETE /api/automations/:id`

**Settings:**
- `GET /api/settings`
- `PATCH /api/settings`

### Integración con index.js

El API Express se arranca desde `src/index.js` junto al bot, tracker y cron jobs.
Puerto separado (3000) del tracker (3001).

---

## Fase 1: Next.js App (Frontend + API Routes proxy)

### Estructura del proyecto Next.js

```
web/
├── next.config.js
├── package.json
├── tailwind.config.js
├── .env.local              # BACKEND_URL + API keys
├── app/
│   ├── layout.jsx          # Root layout (sidebar + auth check)
│   ├── page.jsx            # Dashboard (página principal)
│   ├── login/
│   │   └── page.jsx        # Login simple
│   ├── leads/
│   │   ├── page.jsx        # Tabla de leads con filtros
│   │   └── [id]/
│   │       └── page.jsx    # Detalle de lead (CRM + propuesta)
│   ├── pipeline/
│   │   └── page.jsx        # Kanban pipeline
│   ├── automations/
│   │   └── page.jsx        # Panel de automatizaciones
│   ├── settings/
│   │   └── page.jsx        # Configuración
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.js    # NextAuth config
│       ├── leads/
│       │   └── route.js    # Proxy → backend /api/leads
│       ├── stats/
│       │   └── route.js    # Proxy → backend /api/stats
│       ├── proposals/
│       │   ├── route.js
│       │   └── generate/
│       │       └── route.js  # Llama a Claude API (se ejecuta en Vercel)
│       └── automations/
│           ├── route.js
│           └── generate/
│               └── route.js  # Claude genera ideas de negocio
├── components/
│   ├── Layout.jsx
│   ├── Sidebar.jsx
│   ├── StatsCard.jsx
│   ├── LeadTable.jsx
│   ├── PipelineBoard.jsx
│   ├── PipelineCard.jsx
│   ├── ActivityTimeline.jsx
│   ├── ProposalEditor.jsx
│   ├── AutomationCard.jsx
│   ├── AutomationGenerator.jsx
│   ├── ChartLine.jsx
│   └── ChartBar.jsx
├── lib/
│   ├── backend.js          # Cliente para llamar al backend API
│   ├── auth.js             # Config NextAuth
│   └── claude.js           # Cliente Claude API
└── public/
    └── ...
```

### Variables de entorno (.env.local en Vercel)

```
# Backend Lead Hunter
BACKEND_URL=https://leadhunter.t800labs.com   # Cloudflare Tunnel al backend
BACKEND_API_KEY=misma_key_que_backend

# Auth
NEXTAUTH_SECRET=secret_random_largo
ADMIN_PASSWORD=tu_password

# Claude API (propuestas + automatizaciones)
ANTHROPIC_API_KEY=sk-ant-...
```

### Páginas

**Dashboard (/):**
- 4 cards: total leads, hot leads, emails hoy, tasa apertura
- Gráfico leads por día (últimas 4 semanas)
- Funnel de conversión (new→contacted→replied→meeting→client)
- Últimos 5 leads hot
- Últimas 5 actividades
- Mini-resumen de automatizaciones (X ideas, Y en progreso)

**Leads (/leads):**
- Tabla: nombre, sector, zona, score, tier, estado, fuente, fecha
- Filtros: tier, status, source, sector, zone
- Búsqueda por nombre
- Paginación (20/página)
- Acciones rápidas: enviar email, cambiar estado, ver detalle

**Lead Detail (/leads/:id):**
- Header: nombre, score, tier badge, estado (con botones cambiar)
- Tabs: Info | Emails | CRM | Propuesta
- Tab Info: contacto, web, rating, demo link + visitas
- Tab Emails: historial con estado apertura (👁️)
- Tab CRM: timeline de actividades + formulario nueva nota/llamada
- Tab Propuesta: generar con IA, editar, enviar
- Sidebar: acciones rápidas

**Pipeline (/pipeline):**
- 6 columnas Kanban: new, contacted, replied, meeting, client, discarded
- Cards: nombre, score, sector, última acción, tiempo en estado
- Drag-and-drop para cambiar estado

**Automatizaciones (/automations):**
- Lista de ideas de negocio generadas por IA
- Cada idea: título, descripción, inversión estimada, ingreso potencial, estado
- Estados: idea → evaluando → en desarrollo → lanzado → descartado
- Botón "Generar nuevas ideas" (Claude analiza leads + mercado)
- Filtros por estado y categoría
- Detalle expandible con plan de implementación

**Settings (/settings):**
- Pausar/reanudar envíos automáticos
- Límite diario emails
- Score threshold
- Config del túnel/backend

---

## Fase 2: CRM Básico

### Nuevas tablas en SQLite (backend)

```sql
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  metadata TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at DESC);
```

### Tipos de actividad

**Automáticas (sistema):**
- `email_sent` — sender.js registra al enviar email
- `email_opened` — tracker.js registra al detectar apertura
- `demo_visit` — visits.js registra al detectar visita
- `status_change` — al cambiar estado desde panel o Telegram

**Manuales (admin desde panel):**
- `note` — Nota libre
- `call` — Registro de llamada
- `meeting` — Registro de reunión
- `proposal` — Propuesta generada/enviada

### Cambios en módulos existentes

Añadir `insertActivity()` en sender.js, tracker.js, visits.js, commands.js.

---

## Fase 3: Propuestas con IA (Claude)

### Nueva tabla

```sql
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  services TEXT,
  total_setup REAL,
  total_monthly REAL,
  status TEXT DEFAULT 'draft',
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

### Flujo

1. Admin abre lead → Tab Propuesta → "Generar con IA"
2. Next.js API route `/api/proposals/generate` recibe lead_id
3. Consulta datos del lead al backend
4. Llama a Claude Sonnet con datos del lead + precios del sector
5. Claude genera propuesta markdown con servicios y presupuesto
6. Se guarda en backend via POST /api/leads/:id/proposals
7. Admin edita en el panel → guarda → envía por email

### Prompt para Claude

```
Eres consultor comercial de T800 Labs (t800labs.com), empresa de desarrollo
web, apps e IA en Zaragoza. Genera una propuesta comercial personalizada.

NEGOCIO:
- Nombre: {{name}}
- Sector: {{sector}}
- Zona: {{zone}}
- Rating: {{rating}}★ ({{reviewCount}} reseñas)
- Web actual: {{website}} (calidad: {{websiteQuality}}/100)
- Tiene reservas online: {{hasBooking}}
- Tiene redes sociales: {{hasSocial}}

PROBLEMAS DETECTADOS:
{{problems}}

PRECIOS DE REFERENCIA (sector {{sector}}):
- Setup: {{avgSetup}}€
- Mensual: {{avgMonthly}}€/mes

Genera en markdown:
1. Saludo personalizado mencionando el negocio
2. 2-3 problemas detectados (tono consultivo, no agresivo)
3. Solución concreta (servicios específicos para su sector)
4. Presupuesto desglosado: coste inicial + mensualidad
5. 3 beneficios esperados con datos
6. CTA: propón reunión o llamada

Tono: profesional, cercano, directo. Max 400 palabras.
Al final devuelve un JSON con: { services: [...], totalSetup: X, totalMonthly: Y }
```

---

## Fase 4: Panel de Automatizaciones (Ideas de Negocio T800 Labs)

### Concepto

Una sección del panel donde Claude analiza el mercado, los leads captados y las tendencias para proponer *nuevas líneas de negocio/productos* para T800 Labs. Cada idea tiene un estado de implementación trackeable.

### Nueva tabla

```sql
CREATE TABLE IF NOT EXISTS automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  investment_estimate REAL,
  monthly_revenue_estimate REAL,
  time_to_launch TEXT,
  difficulty TEXT,
  implementation_plan TEXT,
  status TEXT DEFAULT 'idea',
  progress INTEGER DEFAULT 0,
  notes TEXT,
  generated_by TEXT DEFAULT 'ai',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Categorías de automatización

- `saas` — Producto SaaS (ej: plataforma de reservas multi-negocio)
- `service` — Nuevo servicio vendible (ej: auditoría web automatizada)
- `tool` — Herramienta interna que ahorra tiempo (ej: generador de demos mejorado)
- `content` — Contenido monetizable (ej: curso de IA para pymes)
- `marketplace` — Plataforma que conecta oferta/demanda
- `automation` — Automatización de proceso existente (ej: propuestas 100% automáticas)

### Estados

- `idea` — Idea propuesta por IA o admin
- `evaluating` — Se está evaluando viabilidad
- `in_progress` — En desarrollo
- `launched` — Lanzado y operativo
- `paused` — Pausado temporalmente
- `discarded` — Descartada

### Generación de ideas con Claude

El admin pulsa "Generar nuevas ideas" y Claude recibe:
- Resumen de leads captados (sectores, zonas, problemas frecuentes)
- Ideas ya existentes (para no repetir)
- Servicios actuales de T800 Labs
- Tendencias del mercado local

```
Eres el estratega de negocio de T800 Labs, empresa de desarrollo web e IA en Zaragoza.

CONTEXTO:
- Leads captados: {{totalLeads}} ({{topSectors}})
- Problemas más frecuentes: {{topProblems}}
- Servicios actuales: web, apps, automatización, IA
- Ideas ya propuestas: {{existingIdeas}}

Propón 3 nuevas ideas de negocio/automatización de ingresos para T800 Labs.

Para cada idea:
1. Título corto
2. Descripción (2-3 frases)
3. Categoría (saas|service|tool|content|marketplace|automation)
4. Inversión estimada (€)
5. Ingreso mensual potencial (€)
6. Tiempo hasta lanzamiento
7. Dificultad (baja|media|alta)
8. Plan de implementación (5-7 pasos)

Prioriza ideas que:
- Aprovechen los datos/leads que ya tenemos
- Generen ingresos recurrentes
- Sean escalables
- Tengan baja inversión inicial
- Se puedan validar rápido (MVP en <2 semanas)

Formato: JSON array de 3 objetos.
```

### UI del panel

- Tarjetas tipo Trello/Notion con: título, categoría badge, inversión, ingreso potencial, barra de progreso
- Filtros por estado y categoría
- Click para expandir: descripción completa + plan de implementación (checklist)
- Botones: cambiar estado, editar, añadir notas, eliminar
- Botón flotante: "Generar nuevas ideas con IA"
- Resumen en dashboard: X ideas totales, Y en progreso, Z lanzadas

---

## Orden de implementación

1. **Backend API Express** — Exponer datos SQLite via HTTP (base necesaria)
2. **Cloudflare Tunnel** — Hacer accesible el backend desde internet
3. **Next.js proyecto** — Scaffold, auth, layout, dashboard
4. **Leads + Pipeline** — Tabla de leads, filtros, Kanban
5. **CRM** — Tabla activities, auto-registro, timeline UI
6. **Propuestas IA** — Tabla proposals, Claude API, editor UI
7. **Automatizaciones** — Tabla automations, generador IA, panel UI
8. **Deploy Vercel** — Deploy final + dominio personalizado
9. **Polish** — Loading states, error handling, responsive

## Dependencias

**Backend (package.json raíz — añadir):**
```
express, cors, @anthropic-ai/sdk
```

**Frontend (web/package.json — nuevo):**
```
next, react, react-dom, next-auth, recharts, lucide-react, clsx,
tailwindcss, @tailwindcss/postcss, @anthropic-ai/sdk
```

## Variables de entorno nuevas

**Backend (.env — añadir):**
```
BACKEND_API_KEY=key_random_larga
BACKEND_API_PORT=3000
```

**Vercel (.env.local):**
```
BACKEND_URL=https://leadhunter.t800labs.com
BACKEND_API_KEY=misma_key
NEXTAUTH_SECRET=secret_random
NEXTAUTH_URL=https://panel.t800labs.com
ADMIN_PASSWORD=password_admin
ANTHROPIC_API_KEY=sk-ant-...
```

## Dominio

- Panel: `panel.t800labs.com` (CNAME → Vercel)
- Backend tunnel: `leadhunter.t800labs.com` (Cloudflare Tunnel)
