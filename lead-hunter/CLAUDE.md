# Lead Hunter — Sistema Automático de Captación de Clientes

## Empresa

**T800 Labs** — Desarrollo Web, Apps e IA en Zaragoza
- Web oficial: https://t800labs.com
- Email de contacto: hola@t800labs.com
- Admin email (Google Workspace): admin@t800labs.com
- Aliases configurados: hola@, ruben@, contacto@ (todos al mismo buzón)
- Todas las comunicaciones (emails, templates, portfolio) deben referenciar t800labs.com como web principal de la empresa.

## Descripción del proyecto

Sistema automatizado para encontrar negocios locales (Zaragoza y alrededores) que necesitan digitalización/automatización, contactarles automáticamente por email frío personalizado con una web demo personalizada, y gestionar el pipeline de ventas desde un bot de Telegram.

## Objetivo de negocio

Encontrar pymes/negocios locales que:
- No tienen web o la tienen mala/desactualizada
- No tienen sistema de reservas online
- No tienen redes sociales activas
- Gestionan todo a mano (papel, Excel, WhatsApp)

Ofrecerles servicios de automatización/digitalización:
- Web + sistema de reservas: 500-1.500€ + 30-50€/mes
- Automatización de gestión: 1.000-3.000€ + 50-100€/mes
- Tienda online: 800-2.000€ + 30-60€/mes
- Automatización completa (CRM, emails, cobros): 3.000-8.000€ + 150-300€/mes

## Arquitectura del sistema

```
[Google Maps Scraper] ──┐
[Reddit Scraper] ───────┤→ [Analizador/Scorer] → [Base de datos SQLite]
[Google→LinkedIn] ──────┘         │                       ↓
                                  │              [Demo API t800labs.com]
                                  │                (web personalizada)
                                  │                       ↓
                                  └────────────→ [Email automático]
                                                  (con link a demo)
                                                        ↓
                                                [Bot Telegram]
                                                (notificaciones +
                                                 gestión pipeline)
```

## Módulos

### 1. Scrapers (`src/scraper/`)

#### Google Maps (`maps.js`)
- Escanea Google Maps por zona y categoría de negocio
- Extrae: nombre, dirección, teléfono, web, rating, horarios, reseñas
- Detecta si tienen web y la calidad de la misma
- Usa Playwright para scraping (no API de pago)
- Rate limiting para evitar bloqueos

#### Analizador de webs (`website.js`)
- Analiza la web de cada negocio encontrado
- Evalúa: calidad, responsive, SSL, sistema de reservas, redes sociales
- Puntuación de calidad 0-100

#### Reddit (`reddit.js`)
- Escanea subreddits de freelance (r/forhire, r/slavelabour, etc.)
- Busca posts pidiendo servicios de desarrollo web, bots, automatización
- Extrae: título, descripción, presupuesto, urgencia, email, idioma

#### Google → LinkedIn (`google-linkedin.js`)
- Busca perfiles de LinkedIn de decision-makers en negocios target
- Complementa los datos de Google Maps

### 2. Analizador/Scorer (`src/analyzer/scorer.js`)
- **Leads locales**: Analiza cada negocio y le asigna un "lead score" (0-100)
  - Sin web = +30 puntos
  - Web mala/desactualizada = +20 puntos
  - Sin sistema de reservas online = +15 puntos
  - Sin redes sociales activas = +10 puntos
  - Buenas reseñas (negocio activo) = +10 puntos
  - Sector con alta necesidad = +10 puntos
  - Web no responsive = +10 puntos
  - Sin HTTPS = +5 puntos
- **Leads online**: Scoring basado en presupuesto, tipo de servicio, urgencia, frescura, idioma
- Clasifica por prioridad: caliente (>70), tibio (40-70), frío (<40)
- **Genera demo automática** para leads hot/warm (ver sección Demo)

### 3. Demo Generator (`src/demo/register.js`)
- Cuando un lead local es hot o warm, llama a la API de t800labs.com para generar una web demo personalizada
- Genera slug a partir del nombre del negocio ("Peluquería María" → `peluqueria-maria`)
- Si hay conflicto de slug, añade la zona (`peluqueria-maria-delicias`)
- Guarda `demo_url` y `demo_slug` en la BD del lead
- **API endpoint**: `POST https://t800labs.com/api/demo/register`
- **Auth**: Bearer token (`DEMO_API_KEY`)
- **Sectores válidos**: peluqueria, restaurante, clinica, taller, academia, tienda, gimnasio, inmobiliaria
- **Resultado**: URL como `https://t800labs.com/demo/peluqueria-maria`
- La demo hereda automáticamente el tema/colores/servicios del sector
- El negocio ve SU nombre, dirección, teléfono, horarios, rating de Google

### 4. Emailer (`src/emailer/sender.js`)
- Envía emails fríos personalizados automáticamente
- **3 niveles de demo en emails**:
  1. **Demo personalizada** (si `lead.demo_url` existe): "He preparado una web para {{businessName}}" → link a su demo personal
  2. **Demo genérica del sector** (fallback): "Un ejemplo de web para tu sector" → link a demo de ejemplo
  3. **Sin demo**: link a t800labs.com
- Templates por tipo: 3 locales + 3 online (Handlebars)
- Secuencia automática:
  - Email 1: presentación + problema detectado + link a demo
  - Email 2 (día 5): follow-up + recordatorio de demo
  - Email 3 (día 10): última oferta + link a demo
- SMTP: Google Workspace (admin@t800labs.com) con App Password
- Envía desde: `Rubén Jarne <hola@t800labs.com>` (alias)
- Máximo 30 emails/día, L-V 9:00-13:30

### 5. Telegram (`src/telegram/commands.js`)
- Bot de Telegram para gestión del pipeline
- Comandos:
  - /leads — ver leads pendientes
  - /hot — ver leads calientes
  - /stats — estadísticas generales (desglose local/online, por fuente)
  - /send <id> — aprobar envío de email a lead
  - /pause — pausar envíos automáticos
  - /scan <zona> <sector> — lanzar nuevo escaneo
- Notificaciones automáticas:
  - Nuevos leads calientes encontrados
  - Resumen matutino (09:00)
  - Resumen nocturno (20:00)
  - Alertas de errores

### 6. Base de datos (`src/db/database.js`)
- SQLite (better-sqlite3), archivo en `data/leads.db`
- **Tabla leads**: nombre, sector, dirección, teléfono, email, web, rating, reseñas, zona, análisis (has_website, website_quality, has_booking, has_social), score, tier, tipo (local/online), fuente, demo_url, demo_slug, estado, timestamps
- **Tabla emails_sent**: lead_id, step, template, subject, to_email, status, timestamps
- **Tabla scans**: zona, sector, tipo, fuente, resultados, timestamps
- **Tabla settings**: key-value para config
- Estados de lead: new → contacted → replied → meeting → client / discarded
- Migraciones automáticas para columnas nuevas

## Stack tecnológico

- **Runtime**: Node.js (ESM modules)
- **Scraping**: Playwright (chromium headless)
- **Base de datos**: SQLite (better-sqlite3)
- **Emails**: Nodemailer (SMTP Google Workspace, App Password)
- **Telegram**: grammy
- **Scheduler**: node-cron
- **Templates**: Handlebars (.hbs)
- **Logging**: Winston
- **Config**: dotenv

## Estructura de archivos

```
lead-hunter/
├── CLAUDE.md
├── package.json
├── .env                        # Credenciales y config (NO commitear)
├── .env.example                # Ejemplo de variables de entorno
├── config/
│   └── sectors.json            # 8 sectores + 8 zonas con keywords
├── templates/
│   ├── email1_intro.hbs        # Email 1: presentación + demo
│   ├── email2_caso.hbs         # Email 2: caso de éxito + demo
│   ├── email3_oferta.hbs       # Email 3: última oferta + demo
│   ├── online_email1_intro.hbs # Email 1 para leads online (inglés)
│   ├── online_email2_portfolio.hbs
│   └── online_email3_oferta.hbs
├── data/
│   └── leads.db                # Base de datos SQLite
└── src/
    ├── index.js                # Entry point + cron jobs
    ├── logger.js               # Winston logger config
    ├── scraper/
    │   ├── maps.js             # Google Maps scraper (Playwright)
    │   ├── website.js          # Analizador de webs
    │   ├── reddit.js           # Reddit scraper
    │   └── google-linkedin.js  # Google → LinkedIn scraper
    ├── analyzer/
    │   └── scorer.js           # Scoring local + online + auto-demo
    ├── demo/
    │   └── register.js         # Integración API demos t800labs.com
    ├── emailer/
    │   └── sender.js           # Envío emails + secuencias
    ├── telegram/
    │   └── commands.js         # Bot Telegram + notificaciones
    └── db/
        └── database.js         # Schema, queries, migraciones
```

## Variables de entorno (.env)

```
# Telegram
TELEGRAM_BOT_TOKEN=             # Token del bot
TELEGRAM_ADMIN_ID=              # Tu ID para recibir notificaciones

# Email SMTP (Google Workspace via Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@t800labs.com    # Cuenta principal (tiene App Password)
SMTP_PASS=                      # App Password de 16 chars (sin espacios)
EMAIL_FROM=Rubén Jarne <hola@t800labs.com>  # Alias, llega al mismo buzón

# Tu info (aparece en emails)
SENDER_NAME=Rubén Jarne
SENDER_PHONE=645515267
PORTFOLIO_URL=https://t800labs.com
LINKEDIN_URL=https://linkedin.com/in/rubenbros

# Demo API (t800labs.com — genera webs demo personalizadas)
DEMO_API_URL=https://t800labs.com/api/demo
DEMO_API_KEY=                   # Bearer token para API de demos

# Configuración
DAILY_EMAIL_LIMIT=30            # Máximo emails por día
SCAN_DEFAULT_ZONE=Zaragoza      # Zona por defecto
LEAD_SCORE_THRESHOLD=50         # Score mínimo para contactar
```

## Configuración de email

- **Google Workspace** Business Starter en t800labs.com
- Cuenta principal: admin@t800labs.com
- Aliases (gratis, mismo buzón): hola@, ruben@, contacto@
- **2FA activado** (teléfono 645 51 52 67)
- **App Password** generada para "lead-hunter" (configurada en SMTP_PASS)
- SMTP: smtp.gmail.com:587 (STARTTLS)
- Los emails salen como `hola@t800labs.com` (alias de admin@)
- DKIM/SPF/DMARC configurados

## Demos personalizadas (integración con t800labs.com)

### Concepto
En lugar de solo enviar un email frío diciendo "necesitas una web", el sistema genera automáticamente una web demo personalizada para cada negocio con sus datos reales de Google Maps (nombre, dirección, teléfono, horarios, rating). El email incluye un link directo a esa demo.

### Flujo
1. Scraper encuentra "Peluquería María" en Google Maps
2. Scorer la puntúa como "hot" (75 puntos)
3. `register.js` llama a `POST t800labs.com/api/demo/register` con sus datos
4. Se crea `t800labs.com/demo/peluqueria-maria` con tema de peluquería
5. Emailer envía email con botón "Ver la web de Peluquería María →"
6. María abre el link, ve SU web con SU nombre, dirección, teléfono
7. María responde "¿cuánto cuesta?"

### Demos de ejemplo (8 sectores)
- /demo/peluqueria-glamour
- /demo/restaurante-el-fogon
- /demo/clinica-salud-plus
- /demo/taller-motorpro
- /demo/academia-einstein
- /demo/tienda-verde-natura
- /demo/gimnasio-titan
- /demo/inmobiliaria-hogar-ideal

### API
- **Register**: `POST /api/demo/register` (auth: Bearer DEMO_API_KEY)
- **Visit tracking**: `POST /api/demo/visit` (público)
- Datos requeridos: slug, sectorId, businessName
- Opcionales: address, phone, email, whatsapp, rating, reviewCount, hours, heroImage

## Zonas objetivo

Configuradas en `config/sectors.json`:
1. Zaragoza Centro (prioridad 1)
2. Zaragoza Delicias
3. Zaragoza Actur
4. Utebo
5. Calatayud
6. Ejea de los Caballeros
7. Huesca
8. Teruel

## Sectores objetivo (por orden de prioridad)

Configurados en `config/sectors.json` con keywords, pain_points, avg_project_value:
1. Peluquerías / barberías — reservas online (800€ + 40€/mes)
2. Restaurantes / bares — carta digital, reservas (1.200€ + 50€/mes)
3. Clínicas / dentistas — citas online (2.000€ + 80€/mes)
4. Talleres mecánicos — gestión de clientes (1.500€ + 60€/mes)
5. Academias / formación — plataforma alumnos (1.800€ + 70€/mes)
6. Tiendas locales — ecommerce (1.000€ + 40€/mes)
7. Gimnasios — gestión de socios (2.500€ + 100€/mes)
8. Inmobiliarias — web de propiedades (2.000€ + 80€/mes)

## Cron jobs (flujo diario automático)

```
06:00 L-V  — Google Maps scan (rota zonas/sectores)
07:00 diario — Reddit scan (mañana)
08:00 L-V  — Scoring de leads nuevos + generación de demos
08:30 L-V  — Google → LinkedIn scan
09:00 L-V  — Resumen matutino por Telegram
09:30-13:30 L-V — Envío de emails (cada 30 min)
15:00 diario — Reddit scan (tarde)
15:30 diario — Scoring leads tarde
20:00 L-V  — Resumen nocturno por Telegram
```

## Reglas de desarrollo

- Código en JavaScript (ESM modules)
- Sin TypeScript (simplicidad)
- Comentarios en español
- Logs con Winston (timestamps, niveles, colores)
- Manejo robusto de errores (el scraper puede fallar)
- Rate limiting en todo (Maps, emails, API demos, etc.)
- NO almacenar datos sensibles en código, todo en .env
- `.env` está en .gitignore

## Notas legales

- Cumplir RGPD: solo datos públicos de negocios (no personas físicas)
- Incluir opción de "darse de baja" en cada email
- No enviar más de 30 emails/día desde una misma dirección
- Los datos de negocios en Google Maps son públicos
- Identificarse claramente en los emails (nombre real, empresa)

## Estado del proyecto

### v1.0 — MVP ✅
- [x] Scraper de Google Maps funcional
- [x] Scraper de Reddit (leads online)
- [x] Scraper Google → LinkedIn
- [x] Analizador de webs
- [x] Sistema de scoring (local + online)
- [x] Base de datos SQLite con migraciones
- [x] Envío de emails con 3 templates locales + 3 online
- [x] Bot Telegram con comandos y notificaciones
- [x] Cron jobs para automatización completa
- [x] SMTP configurado y probado (Google Workspace + App Password)
- [x] Integración con API de demos de t800labs.com
- [x] Generación automática de demos personalizadas para leads hot/warm
- [x] Email templates con 3 niveles de demo (personal > sector > fallback)

### v1.1 — Mejoras pendientes
- [ ] Tracking de apertura de emails
- [ ] Notificación Telegram cuando un lead visita su demo
- [ ] Primer escaneo real de producción
- [ ] Instalar Playwright browsers (`npx playwright install chromium`)

### v2.0 — Escala
- [ ] Panel web para gestionar leads (React)
- [ ] Integración con WhatsApp Business API
- [ ] Propuestas automáticas generadas por IA
- [ ] CRM básico integrado
