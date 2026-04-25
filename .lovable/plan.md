# Plan: Cierre de gaps + Módulo Blog completo

Dos bloques: (1) cerrar 3 gaps del sistema actual y (2) construir el módulo Blog completo con webhook automatizado y SEO avanzado.

---

## BLOQUE 1 — Cierre de gaps

### Gap 1: Sidebar admin completo + página de Configuración

- `src/components/layout/AdminSidebar.tsx`:
  - Añadir ítem **Blog** (`FileText`) → `/admin/blog`
  - Añadir ítem **Configuración** (`Settings`) → `/admin/configuracion`
  - Conservar badge de leads nuevos
- Crear `src/routes/admin/configuracion.tsx`:
  - Carga el perfil del agente desde `agents` por `auth.uid()`
  - Email visible (solo lectura, viene de auth)
  - Form editable con `react-hook-form` + Zod: `full_name` (requerido), `phone` (opcional, formato CO)
  - Submit → `update` en `agents`, invalidar query, toast de confirmación
  - UI consistente con el resto de `/admin` (Card + Form shadcn)

### Gap 2: Página `/blog` pública (placeholder elegante)

La ruta `/blog` **no existe aún**. Se crea como placeholder y luego se reemplaza por el listado real en el Bloque 2 (mismo archivo `src/routes/blog.tsx`):
- `PublicLayout` (Navbar + Footer)
- Estado "Próximamente" con copy: *"Contenido inmobiliario para ayudarte a tomar mejores decisiones. Consejos de compra, tendencias del mercado y más."*
- CTA: "Ver propiedades disponibles" → `/propiedades`
- Añadir link **Blog** en `PublicNavbar.tsx`

### Gap 3: 404 público personalizado

Reemplazar `NotFoundComponent` en `src/routes/__root.tsx`:
- `PublicLayout` (Navbar + Footer)
- Título: "Esta página no existe"
- Subtexto: "Puede que la propiedad fue retirada o la URL cambió."
- Botones: "Volver al inicio" (`/`) y "Ver propiedades" (`/propiedades`)

---

## BLOQUE 2 — Módulo Blog completo

### 2.1 Base de datos (migración)

- Enums:
  - `post_category`: `compra | venta | inversion | consejos | mercado | legal`
  - `post_status`: `borrador | publicado | programado`
- Tabla `posts`:
  - `id uuid pk default gen_random_uuid()`
  - `title text not null`, `slug text unique not null`
  - `excerpt text`, `content text not null`
  - `cover_image text`
  - `category post_category not null default 'consejos'`
  - `tags text[] not null default '{}'`
  - `status post_status not null default 'borrador'`
  - `published_at timestamptz`
  - `meta_title text`, `meta_description text`
  - `author text not null default 'Equipo Alquidel'`
  - `created_at`, `updated_at` (con trigger `update_updated_at_column` ya existente)
- Índices: `slug`, `(status, published_at desc)`, `category`
- RLS:
  - SELECT público: solo `status = 'publicado'`
  - SELECT staff: todos (`is_staff(auth.uid())`)
  - INSERT/UPDATE: `is_staff(auth.uid())`
  - DELETE: `has_role(auth.uid(),'admin')`

### 2.2 Edge Function `create-post` (webhook para n8n/BlogAut)

- Archivo: `supabase/functions/create-post/index.ts`
- `supabase/config.toml`: bloque `[functions.create-post]` con `verify_jwt = false` (webhook externo)
- Lógica:
  - Solo `POST`, manejo de CORS preflight
  - Lee header `Authorization: Bearer <token>` y compara contra secret `BLOG_WEBHOOK_TOKEN` con comparación constante
  - Valida payload con Zod: `title` (req), `content` (req), `excerpt`, `cover_image`, `category` (enum, default `consejos`), `tags` (string[]), `meta_title`, `meta_description`
  - Genera `slug` desde `title` (slugify embebido, deduplicado con sufijo `-2`, `-3`… si ya existe)
  - Inserta con `SUPABASE_SERVICE_ROLE_KEY`, `status='publicado'`, `published_at=now()`
  - Devuelve `{ success: true, slug, url: "https://<dominio>/blog/<slug>" }`
- Solicitar al usuario el secreto **BLOG_WEBHOOK_TOKEN** vía `add_secret`

### 2.3 Admin Blog

Rutas:
- `src/routes/admin/blog.tsx` — listado:
  - Tabla: cover thumb, título, categoría (badge), estado (badge color), fecha publicación, acciones (editar, toggle publicar, eliminar)
  - Filtros por estado y categoría, búsqueda por título (debounce 300ms, sync URL con `validateSearch` + Zod)
  - Paginación 20/página
  - Botón "Nuevo artículo" → `/admin/blog/nuevo`
- `src/routes/admin/blog.nuevo.tsx` y `src/routes/admin/blog.$id.editar.tsx`:
  - Form compartido en `src/components/admin/PostForm.tsx`
  - Campos: título, slug (auto desde título, editable), excerpt, cover_image (subida a bucket `property-images` con prefijo `posts/` para no crear bucket nuevo), category, tags (input separado por comas), status, meta_title, meta_description
  - **Editor**: textarea con Markdown — render con `react-markdown` (instalar) en preview y vista pública. Mantiene el alcance simple sin editor rich complejo.
  - Tabs "Editar" / "Previsualización"
  - Toggle publicar/despublicar desde el listado actualiza `status` y `published_at`

### 2.4 Blog público

- `src/routes/blog.tsx` (sobrescribe el placeholder):
  - Loader trae `posts` con `status='publicado'`, orden `published_at desc`
  - Grid responsive (1/2/3 col) de `PostCard`: cover, badge categoría, título, excerpt, fecha en español, autor
  - Filtro por categoría con tabs sincronizado con URL (`?cat=`)
  - Paginación 12/página (`?page=`)
  - `head()` con título y description propios
- `src/routes/blog.$slug.tsx`:
  - Loader trae el post por slug (404 si no existe o no publicado)
  - Render de `content` con `react-markdown` + estilos prose
  - `head()` dinámico: `meta_title || title`, `meta_description || excerpt`, `og:title`, `og:description`, `og:image=cover_image`, `twitter:card=summary_large_image`, `twitter:image`
  - **JSON-LD Article** vía `head().scripts` (`@type: Article`)
  - "Artículos relacionados": 3 posts misma categoría, excluyendo el actual
  - CTA final: "¿Buscas propiedad en Colombia? Ver catálogo →" → `/propiedades`
- Componentes: `src/components/public/PostCard.tsx`
- Helpers: `src/lib/posts.ts` (labels de categoría, badge colors, formato de fecha)

### 2.5 SEO global

- **Sitemap dinámico**: server route `src/routes/sitemap[.]xml.ts`
  - `GET` consulta `properties` y `posts` (`status='publicado'`)
  - Devuelve `application/xml` con URLs de `/`, `/propiedades`, `/nosotros`, `/contacto`, `/blog`, cada `/propiedades/:slug` y cada `/blog/:slug`
  - `Cache-Control: public, max-age=3600`
- **robots.txt**: server route `src/routes/robots[.]txt.ts`:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /login
  Sitemap: <origin>/sitemap.xml
  ```
- **JSON-LD `RealEstateListing`** en `src/routes/propiedades.$slug.tsx` vía `head().scripts` (offers con price COP, image, address)

---

## Consideraciones técnicas

- **Dependencias nuevas**: `react-markdown` (`bun add react-markdown`)
- **Storage**: reutilizamos bucket público `property-images` con prefijo `posts/` para covers
- **Slugify en edge function**: implementación local (no puede importar de `src/`)
- **Seguridad webhook**: comparación de token con `crypto.timingSafeEqual`
- **Tipos generados**: tras la migración, `src/integrations/supabase/types.ts` se regenera automáticamente

---

## Entregables al finalizar

1. Sidebar admin con 5 ítems (Dashboard, Propiedades, Leads, Blog, Configuración)
2. `/admin/configuracion` con edición de perfil del agente
3. 404 público con `PublicLayout` y CTAs en español
4. Tabla `posts` + RLS + enums + índices
5. Edge Function `create-post` desplegada con secreto `BLOG_WEBHOOK_TOKEN`; entrego al final URL pública del endpoint y `curl` de prueba
6. CRUD admin del blog (listado con filtros, formulario crear/editar, preview Markdown, toggle publicar)
7. Blog público con grid filtrable, paginación, detalle con Markdown, JSON-LD Article y artículos relacionados
8. Navbar público con link a Blog
9. `/sitemap.xml` y `/robots.txt` dinámicos
10. JSON-LD `RealEstateListing` en cada detalle de propiedad