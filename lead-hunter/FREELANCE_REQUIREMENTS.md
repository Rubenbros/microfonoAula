# Lead Hunter v4.0 — Módulo Freelance: Requisitos

## Contexto

Rubén es Tech Lead en una empresa, pero quiere captar clientes freelance en paralelo aprovechando IA. El sistema Lead Hunter ya funciona para pymes locales (Zaragoza). Ahora se añade un módulo completo de gestión freelance.

## Requisitos confirmados por el usuario

### 1. Tipo de cliente objetivo
- **Todo tipo de proyecto tech**: desarrollo web, apps móviles, IA/ML, automatización, consultoría tech, chatbots, agentes IA, CTO/Tech Lead fraccionado para startups
- Sin restricción de sector — cualquier cliente que necesite servicios tech

### 2. Mercado
- **Internacional (inglés)** como mercado principal
- **España** como mercado secundario
- Comunicaciones en inglés para internacional, español para España

### 3. Plataformas de captación
- **LinkedIn** — networking, posts, mensajes directos a decision makers
- **Upwork / Freelancer** — plataformas de freelance tradicionales
- **Toptal / similares** — plataformas premium
- **Reddit** — r/forhire, r/freelance, r/webdev, etc.
- **Twitter/X** — comunidades tech
- **Otras comunidades** — HackerNews, IndieHackers, Discord servers tech

### 4. Compatibilidad con sistema actual
- **Mantener todo lo existente** de pymes locales (scrapers, demos, emails, pipeline)
- El módulo freelance es **adicional**, no reemplaza nada
- Las ideas de negocio y automatizaciones siguen igual
- Ambos módulos comparten el panel web y bot de Telegram

### 5. Módulo de gestión freelance (NUEVO)
El usuario quiere un sistema completo de gestión de su actividad freelance:

#### 5.1 Gestión de Clientes
- CRUD de clientes (nombre, empresa, email, país, idioma, fuente, notas)
- Historial de interacciones con cada cliente
- Estado del cliente: prospect → active → completed → recurring
- Tags/categorías por tipo de servicio

#### 5.2 Gestión de Proyectos
- CRUD de proyectos vinculados a clientes
- Estados: proposal → negotiation → in_progress → delivered → paid → closed
- Presupuesto, precio acordado, horas estimadas vs reales
- Deadline y milestones
- Documentos/links asociados (propuesta, contrato, repo, deploy)

#### 5.3 Gestión de Gastos e Ingresos
- Registro de gastos (herramientas, suscripciones, impuestos, etc.)
- Registro de ingresos por proyecto/cliente
- Categorías de gastos (software, hardware, formación, marketing, impuestos)
- Balance mensual/anual
- Facturación básica o tracking de facturas

#### 5.4 Automatización con IA (Claude)
- Generación automática de propuestas comerciales personalizadas
- Análisis de oportunidades en plataformas (scoring de proyectos)
- Sugerencias de pricing basadas en historial
- Resúmenes semanales de actividad freelance
- Detección automática de leads en plataformas
- Respuestas automáticas o borradores para aplicar a proyectos

### 6. Scrapers nuevos necesarios
- **Upwork scraper**: buscar proyectos relevantes por keywords
- **LinkedIn scraper**: detectar posts/ofertas de empresas buscando devs
- **Twitter/X scraper**: detectar oportunidades en threads tech
- **HackerNews/IndieHackers**: posts tipo "looking for developer"

### 7. Pipeline freelance
- Diferente al pipeline de pymes locales
- Etapas: Lead detectado → Aplicado → Entrevista → Propuesta → Negociación → Ganado/Perdido → En curso → Entregado → Cobrado

### 8. Notificaciones (Telegram)
- Nuevas oportunidades relevantes detectadas (con score)
- Recordatorios de follow-up con clientes
- Alertas de deadlines de proyectos
- Resumen semanal de ingresos/gastos
- Alertas cuando un proyecto de Upwork/etc. encaja con su perfil

### 9. Panel Web
- Nueva sección "Freelance" en el sidebar con subsecciones:
  - Dashboard freelance (ingresos, proyectos activos, pipeline)
  - Clientes
  - Proyectos
  - Finanzas (gastos/ingresos)
  - Oportunidades (leads de plataformas)
- Mantener las secciones actuales (Dashboard pymes, Leads, Pipeline, Escáner, Automatizaciones)

### 10. Perfil y portfolio
- El sistema debe conocer las skills y experiencia de Rubén para:
  - Scoring inteligente de oportunidades (match con su perfil)
  - Generar propuestas personalizadas
  - Sugerir pricing adecuado
- Web: t800labs.com como portfolio principal

## Prioridades de implementación
1. **Base de datos**: Nuevas tablas (clients, projects, expenses, income, freelance_leads)
2. **Scrapers de plataformas**: Upwork y LinkedIn primero
3. **Panel web**: Secciones de freelance
4. **Automatización IA**: Propuestas, scoring, detección de leads
5. **Finanzas**: Gestión de gastos/ingresos
6. **Notificaciones**: Integración con bot Telegram existente
