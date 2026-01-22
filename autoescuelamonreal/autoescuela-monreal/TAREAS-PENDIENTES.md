# Tareas Pendientes - Autoescuela Monreal

## Contexto del Proyecto

- **Framework**: Next.js 14 con App Router y TypeScript
- **Estilos**: Tailwind CSS
- **Contenido**: JSON centralizado en `src/data/content.json`
- **Despliegue**: Vercel
- **Admin**: Panel de administración en `/admin` (usuario: admin, contraseña: autoescuela2024)

## Estructura de archivos importante

```
src/
├── app/
│   ├── (main)/           # Rutas públicas
│   │   ├── page.tsx      # Homepage
│   │   ├── permisos/     # Listado y detalle de permisos
│   │   ├── teorica/      # Videos de YouTube
│   │   ├── nosotros/     # Sobre nosotros
│   │   └── contacto/     # Página de contacto
│   └── admin/            # Panel de administración
├── components/
│   ├── Header.tsx        # Navegación
│   └── Footer.tsx        # Pie de página
└── data/
    └── content.json      # Contenido editable
```

---

## TAREA 1: Añadir redes sociales al footer

### Descripción
Añadir iconos de Facebook e Instagram en el Footer con enlaces a las redes sociales.

### Datos necesarios
- **Facebook**: `https://www.facebook.com/autoescuelasmonreal`
- **Instagram**: `https://www.instagram.com/autoescuelamonreal/`

### Archivos a modificar
1. `src/data/content.json` - Añadir sección de redes sociales:
```json
"redesSociales": {
  "facebook": "https://www.facebook.com/autoescuelasmonreal",
  "instagram": "https://www.instagram.com/autoescuelamonreal/"
}
```

2. `src/components/Footer.tsx` - Añadir iconos con enlaces después de la sección de contacto

### Diseño sugerido
Añadir una fila de iconos SVG (Facebook e Instagram) con hover effect, debajo de la información de contacto o en una sección aparte.

---

## TAREA 2: Añadir botón flotante de WhatsApp

### Descripción
Crear un botón flotante en la esquina inferior derecha que abra WhatsApp con un mensaje predefinido.

### Datos necesarios
- **WhatsApp La Paz**: 619 727 274
- **WhatsApp Rosales**: 665 939 619
- Usar el de La Paz como principal: `https://wa.me/34619727274`

### Archivos a crear/modificar
1. Crear `src/components/WhatsAppButton.tsx` - Componente del botón flotante
2. `src/app/(main)/layout.tsx` - Importar y añadir el componente

### Especificaciones
- Posición: `fixed bottom-6 right-6`
- Icono de WhatsApp verde (#25D366)
- Animación de pulso o bounce para llamar la atención
- Z-index alto para estar siempre visible
- En móvil: un poco más pequeño y más cerca del borde

### Código de referencia para el icono WhatsApp
```jsx
<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
</svg>
```

---

## TAREA 3: Crear páginas detalladas para CAP y ADR

### Descripción
Crear páginas independientes con más información sobre los cursos CAP y ADR, ya que son cursos profesionales importantes.

### URLs antiguas a replicar
- `/sacarse-el-curso-cap-en-zaragoza/` → `/cap`
- `/sacarse-el-curso-adr-en-zaragoza/` → `/adr`

### Archivos a crear
1. `src/app/(main)/cap/page.tsx`
2. `src/app/(main)/adr/page.tsx`

### Contenido para CAP (extraído del dump WordPress)
- **Título**: Curso CAP en Zaragoza
- **Descripción**: Certificado de Aptitud Profesional obligatorio para conductores profesionales
- **Tipos**:
  - CAP Inicial (140 horas) - Para nuevos conductores profesionales
  - CAP Continuo (35 horas cada 5 años) - Para renovación
- **Modalidades**: Mercancías y Viajeros
- **Requisitos**: Tener permiso C o D según corresponda

### Contenido para ADR (extraído del dump WordPress)
- **Título**: Curso ADR en Zaragoza - Mercancías Peligrosas
- **Descripción**: Autorización especial para transporte de mercancías peligrosas
- **Especialidades**:
  - ADR Básico
  - ADR Cisternas
  - ADR Explosivos
  - ADR Radiactivos
- **Requisitos**: Tener 21 años y permiso B mínimo
- **Duración**: Según especialidad (18-24 horas)

### Estructura sugerida para cada página
1. Header con título y descripción
2. Sección "¿Qué es el CAP/ADR?"
3. Sección "Tipos de cursos" con cards
4. Sección "Requisitos"
5. Sección "¿Por qué elegir Autoescuela Monreal?"
6. CTA de contacto

### Actualizar navegación
Añadir enlaces en:
- `src/components/Header.tsx` - Considerar dropdown de "Profesional" con CAP y ADR
- `src/components/Footer.tsx` - En la sección de permisos

---

## TAREA 4: Añadir banner de cookies (RGPD)

### Descripción
Implementar un banner de consentimiento de cookies conforme a la normativa europea.

### Archivos a crear
1. `src/components/CookieBanner.tsx` - Componente del banner
2. `src/app/(main)/politica-cookies/page.tsx` - Página de política de cookies (opcional)

### Especificaciones
- Posición: fixed en la parte inferior de la pantalla
- Botones: "Aceptar todas", "Solo necesarias", "Configurar"
- Guardar preferencia en localStorage
- No mostrar si ya aceptó
- Enlace a política de cookies

### Diseño sugerido
- Fondo semi-transparente oscuro
- Texto breve explicativo
- Botones claros con el color primario de la web

---

## TAREA 5: Añadir formulario de contacto

### Descripción
Crear un formulario de contacto funcional en la página de contacto.

### Archivos a modificar
1. `src/app/(main)/contacto/page.tsx` - Añadir formulario

### Campos del formulario
- Nombre (requerido)
- Email (requerido)
- Teléfono (opcional)
- Permiso de interés (select con opciones)
- Mensaje (textarea, requerido)
- Checkbox de privacidad (requerido)

### Opciones para el envío
1. **Opción simple**: Usar `mailto:` con los datos del formulario
2. **Opción con API**: Crear API route en `/api/contact` que envíe email
3. **Opción externa**: Integrar Formspree, Netlify Forms, o similar

### Email destino
- `autoescuelamonreal@gmail.com`

---

## TAREA 6: Migrar imágenes reales (OPCIONAL)

### Descripción
Reemplazar imágenes placeholder por las fotos reales de las sedes y vehículos.

### Imágenes disponibles en el backup WordPress
Las imágenes están en: `autoescudcoE4Kv96BAVWRQblogid_1/` (si existe la carpeta uploads)

**Sedes**:
- `autoescuela-monreal-la-paz-zaragoza.jpg`
- `autoescuela-monreal-rosales-zaragoza.jpg`

**Permisos** (fotos de vehículos):
- `Foto-1-AM.jpeg` - Ciclomotor
- `Foto-2-A1.jpg` - Moto 125cc
- `Foto-3-A2.jpg` - Moto A2
- `Foto-4-A.jpg` - Moto A
- `Foto-5-B.jpg` - Coche
- `Foto-6-BE.jpg` - Coche con remolque
- `Foto-7-C.jpg` - Camión
- `Foto-8-C1.jpg` - Camión mediano
- `Foto-9-CE.jpg` - Camión con remolque
- `Foto10-C1E.jpg` - Camión mediano con remolque
- `Foto11-D.jpg` - Autobús
- `Foto13-DE.jpg` - Autobús con remolque
- `Foto14-D1E.jpg` - Minibús con remolque
- `foto-CAP.png` - CAP
- `Foto-ADR.jpg` - ADR

### Destino de las imágenes
Copiar a `public/images/permisos/` y `public/images/sedes/`

---

## TAREA 7: Mejorar SEO (OPCIONAL)

### Descripción
Añadir metadatos estructurados y mejorar SEO.

### Archivos a modificar
1. `src/app/layout.tsx` - Metadatos globales
2. Cada página individual - Metadatos específicos

### Elementos a añadir
- Schema.org JSON-LD para LocalBusiness
- Open Graph tags para compartir en redes
- Sitemap.xml
- robots.txt

---

## Notas adicionales

### Colores de la web
- **Primary**: Definido en `tailwind.config.js` (revisar valor exacto)
- **Grises**: Escala de Tailwind estándar

### Comandos útiles
```bash
# Desarrollo local
cd autoescuela-monreal
npm run dev

# Build de producción
npm run build

# Desplegar (automático con push a main en Vercel)
git push origin main
```

### URLs importantes
- **Producción**: Ver en Vercel dashboard
- **Test online externo**: https://www.testdelautoescuela.com/
- **Resultados DGT**: https://sedeapl.dgt.gob.es:7443/WEB_NOTP_CONSULTA/consultaNota.faces

### Credenciales
- **Admin panel**: `/admin` - usuario: `admin`, contraseña: `autoescuela2024`
