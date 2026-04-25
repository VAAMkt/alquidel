# ALQUIDEL — Plataforma Inmobiliaria Premium (Bootstrap)

Plataforma inmobiliaria mixta (venta + arriendo) enfocada en Bogotá, COP, m². Esta entrega inicializa el proyecto: base de datos, autenticación, layouts y navegación operativa. El catálogo público y el CRM completos se construyen en iteraciones siguientes.

## 1. Sistema de diseño

Paleta premium tipo The Agency / Compass:

- Fondo: blanco puro
- Texto principal: zinc-900
- Acentos secundarios: slate-700
- Detalle dorado (lujo): amber-500
- Tipografía: sans-serif limpia (Inter), tracking ajustado en titulares
- Mobile-first, bordes `rounded-lg`, generoso whitespace
- Tokens definidos en `src/styles.css` vía variables CSS oklch

## 2. Base de datos (Supabase)

Migración inicial con tres tablas + enums + RLS:

**Enums**

- `property_type_enum`: apartamento, casa, local, oficina, lote, bodega
- `listing_type_enum`: venta, arriendo
- `property_status_enum`: disponible, vendido, arrendado, reservado
- `lead_status_enum`: nuevo, contactado, interesado, cerrado, descartado
- `app_role`: admin, agente

**Tabla `properties**` — todos los campos solicitados (title, description, type, property_type, price COP, area_m2, bedrooms, bathrooms, city default 'Bogotá', neighborhood, address, status, is_featured, images[], amenities[], created_at, slug único).

**Tabla `leads**` — name, email, phone, message, status, property_id (FK), source, notes, assigned_to (FK auth.users), created_at.

**Tabla `agents**` — id (FK auth.users PK), full_name, email, phone, role.

**Roles & seguridad** — Siguiendo la regla de roles separados, se usa la columna `role` en `agents` solo para el perfil del staff. Para chequeos de privilegio se crea una tabla `user_roles` + función `has_role()` SECURITY DEFINER.

**RLS**

- `properties`: SELECT público, INSERT/UPDATE/DELETE solo agentes/admin
- `leads`: solo agentes/admin pueden ver; INSERT público (formulario)
- `agents`: usuario lee su propio registro; admin lee todos
- `user_roles`: lectura propia; gestión solo admin

**Storage** — Bucket público `property-images` con políticas: lectura pública, escritura para staff autenticado.

**Trigger** — `handle_new_user()` crea fila en `agents` con rol `agente` por defecto al registrarse.

## 3. Autenticación

- Cliente Supabase en `src/integrations/supabase/client.ts` (publishable key) y `client.server.ts` (service role).
- `useAuth` hook con `onAuthStateChange` + `getSession` (en ese orden).
- Ruta `/login` pública: email + password, validación zod, toast de error/éxito.
- Layout protegido `_admin` con `beforeLoad` que redirige a `/login` si no hay sesión, preservando `redirect` en search params.
- Tras login exitoso → `/admin/dashboard`.
- Botón "Cerrar sesión" en sidebar admin.

> Nota: no se incluye registro público (signup) — los agentes se crean desde Supabase o, en una iteración futura, desde Configuración. Si se necesita signup abierto, se agrega después.

## 4. Estructura de rutas

```text
src/routes/
  __root.tsx                 # shell + QueryClientProvider + Toaster
  index.tsx                  # Home pública (hero + propiedades destacadas placeholder)
  propiedades.tsx            # Listado público (placeholder con grid)
  blog.tsx                   # Placeholder
  contacto.tsx               # Formulario que crea lead
  login.tsx                  # Login agentes
  _admin.tsx                 # Layout protegido (sidebar + outlet)
  _admin/dashboard.tsx       # KPIs básicos (conteos)
  _admin/propiedades.tsx     # Tabla placeholder
  _admin/leads.tsx           # Tabla placeholder
  _admin/blog.tsx            # Placeholder
  _admin/configuracion.tsx   # Perfil del agente
```

## 5. Layouts

**Layout público** (en `__root.tsx` cuando ruta no es admin/login):

- Navbar fija translúcida con backdrop-blur
- Logo "ALQUIDEL" (wordmark, tracking ancho, punto dorado amber-500)
- Links: Propiedades, Blog, Contacto
- CTA derecha: botón "Ver propiedades" (slate-700 → hover amber-500)
- Footer minimalista

**Layout admin** (`_admin.tsx`):

- Sidebar shadcn colapsable (`collapsible="icon"`) con íconos lucide:
  - Dashboard (LayoutDashboard)
  - Propiedades (Building2)
  - Leads (Users)
  - Blog (FileText)
  - Configuración (Settings)
- Header con `SidebarTrigger` siempre visible + nombre del agente + botón logout
- Resaltado de ruta activa

## 6. Páginas iniciales (contenido real, no placeholder)

- **Home (`/`)**: hero "Encuentra tu próximo hogar en Bogotá", buscador básico (tipo, operación, presupuesto), sección "Propiedades destacadas" leyendo `is_featured = true`, sección de confianza.
- **Propiedades**: grid leyendo de Supabase con filtros por tipo y operación (consulta real vía TanStack Query).
- **Contacto**: formulario validado con zod → INSERT en `leads` (source='formulario').
- **Dashboard admin**: tarjetas con conteos de propiedades disponibles, leads nuevos, propiedades destacadas.

## 7. Detalles técnicos

- TanStack Router file-based, contexto con `queryClient` + `auth`.
- TanStack Query con `QueryClient` creado dentro de `getRouter` (no singleton).
- Validación con zod en formularios (login, contacto).
- Toaster con sonner (ya instalado).
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` para cliente; `SUPABASE_SERVICE_ROLE_KEY` para servidor (no se usa aún en este bootstrap).
- Tipos generados de Supabase en `src/integrations/supabase/types.ts`.
- Helper `formatCOP()` en `src/lib/format.ts` para precios (`Intl.NumberFormat es-CO`) y `formatArea()` para m².
- Cada ruta pública define su propio `head()` con título y descripción específicos para SEO.

## 8. Lo que NO incluye este bootstrap

Para mantener el alcance acotado, las siguientes piezas quedan listas para una iteración siguiente:

- Página de detalle de propiedad (`/propiedades/$slug`) completa con galería
- CRUD completo de propiedades en admin (crear/editar con upload de imágenes)
- Pipeline visual de leads (kanban)
- Módulo de blog completo
- Integración WhatsApp / chat
- Filtros avanzados (mapa, rangos de precio con sliders)

Estas se priorizan después de validar el bootstrap.  
  
Agregar al plan: incluir el helper formatCOP() desde el inicio 

con separador de miles colombiano (punto) y símbolo $ al frente.

Ejemplo: $1.250.000.000. Esto debe usarse en TODAS las vistas 

donde aparezca precio, desde el primer render.