# Auditoría completa ALQUIDEL — Plan de ejecución

Tras revisar el código, encontré **3 bugs críticos**, varias mejoras de UX/SEO y 5 features de negocio. Ejecutaré todo en una sola pasada.

## 🐛 Bugs críticos detectados

1. **Hero busca con `tipos` como string en URL en lugar de array** — el catálogo espera array de Zod, así que se pierde el filtro de tipo al navegar desde Home.
2. **Filtros del catálogo cargan TODAS las propiedades en cliente** — riesgo de performance con +50 propiedades; además no se reduce payload (`SELECT *` no, pero igual filtra en JS).
3. **Página `/admin/leads` no actualiza el query key correctamente con búsqueda** (usar `search` directo como queryKey causa refetch en cada render parcial).
4. **Calculadora hipotecaria: `calcEnganche` slider permite 10-50%, pero el prompt menciona 30%** — funciona correcto, sin bug.
5. **Comparador no purga IDs huérfanos** — si una propiedad fue eliminada, queda en estado.
6. **Chat no tiene timeout client-side de 15s** — solo el servidor lo tiene; en frontend si se cuelga la red, queda colgado.

## ✅ FASE 1 — Correcciones funcionales

**Búsqueda Home → Catálogo**:
- Cambiar `handleSearch` en `index.tsx` para que `tipos` se pase como array `[tipo]` correctamente (verificar serialización de TanStack Router).
- Agregar `clearAll` que use `navigate({ search: {} })` para reset limpio.

**Catálogo `/propiedades`**:
- Migrar filtros a query Supabase (`.eq("type")`, `.eq("city")`, `.in("property_type")`, `.lte("price")`, `.gte("bedrooms")`).
- Mantener orden y paginación en cliente sobre el resultado filtrado por servidor.
- Mantener URL params idénticos.

**Comparador**:
- Al hidratar `CompareContext`, validar contra DB y purgar IDs no existentes.

**ChatWidget**:
- Agregar `AbortController` con timeout de 15s en cliente.
- Mensaje amigable: "Lo siento, intenta de nuevo en un momento."
- Soporte tecla `Escape` para cerrar.

## 🎨 FASE 2 — UX / UI

**Navegación**:
- Crear componente `<Breadcrumbs>` reutilizable.
- Insertar en `/propiedades/$slug` (Inicio › Propiedades › título) y `/blog/$slug` (Inicio › Blog › título).
- Mantener Navbar `activeProps` (ya funciona).

**Feedback**:
- Skeleton loaders dedicados (`PropertyCardSkeleton`, `PostCardSkeleton`) en grids.
- Reemplazar el spinner básico en `/blog`.
- Scroll suave al toast tras envío de formulario de lead (en realidad el toast aparece arriba derecha; agregar `scrollIntoView` al Card del form).

**Accesibilidad**:
- Añadir `alt` específico en imágenes de propiedades: `${title} en ${city}`; en blog: `Portada de ${title}`.
- `aria-label` en todos los botones icon-only (favoritos, comparar, cerrar chat ya tienen, verificar thumbnails de galería).
- Trap focus + `Escape` en ChatWidget.

**Mobile**:
- Verificar `overflow-x-auto` en `/comparar` (ya está).
- Botón "Aplicar filtros" sticky al fondo del Sheet móvil del catálogo.
- Z-index: ChatWidget `z-50`, FAB WhatsApp `z-30` — ChatWidget tapa el FAB. Subir FAB a `z-40` y desplazar verticalmente cuando chat esté abierto (CSS `bottom-20` cuando `open`).

**Micro-interacciones**:
- Animación scale en corazón favoritos (CSS keyframe 200ms).
- Pulse suave en badge de leads nuevos del sidebar (Tailwind `animate-pulse` solo si count > 0).

## 📝 FASE 3 — Contenido y SEO

- Footer ya usa `new Date().getFullYear()` ✅.
- Agregar `<link rel="canonical">` en `head()` de blog y propiedad detalle (TanStack Start: `links: [{ rel: "canonical", href: ... }]`).
- Agregar nota en `formatCOP`: si valor === 0, devolver "Precio a consultar".
- Crear componente `<PropertyImagePlaceholder>` reutilizable (usado en Card, Detail, Compare).

## ⚡ FASE 4 — Técnica

- Filtros server-side ya descrito arriba.
- `loading="lazy"` en thumbnails y galería (no above-the-fold). Hero del Home no tiene `<img>`, es gradiente, no aplica `loading="eager"`.
- Manejo de error visible en `useQuery` del catálogo y blog (banner rojo con botón retry).
- ChatWidget: cuando `properties` viene vacío, igual responde sin contexto (la edge function ya lo maneja, OK).
- **No agregar rate limiting** al edge function `create-post` — directiva interna lo prohíbe.
- Verificar `/admin/*` redirect: ya implementado vía `requireAuth` en `admin.tsx`.

## 💼 FASE 5 — Mejoras de negocio

1. **Badge "⭐ Destacada"** en color amber en cards con `is_featured` (ya muestra "Destacada", cambiarlo a estilo amber con estrella).
2. **Botón "Compartir por WhatsApp"** en detalle de propiedad: `wa.me/?text=Mira esta propiedad en Alquidel: ${url}`.
3. **Vistas recientes**: hook `useRecentViews` con localStorage (últimos 3 slugs); sección en Home si hay historial.
4. **Imprimir ficha**: botón `window.print()` + estilos `@media print` en `styles.css` ocultando navbar/footer/chat/FAB y mostrando solo info esencial.
5. **Badge "Nuevo precio posible"** si `Date.now() - created_at > 30 días` y status disponible — en `PropertyCard`.

## 📂 Archivos a crear

- `src/components/public/Breadcrumbs.tsx`
- `src/components/public/PropertyCardSkeleton.tsx`
- `src/components/public/PostCardSkeleton.tsx`
- `src/components/public/PropertyImagePlaceholder.tsx`
- `src/components/public/RecentViews.tsx`
- `src/hooks/useRecentViews.ts`

## 📂 Archivos a editar

- `src/routes/index.tsx` — fix Hero search + sección "Vistas recientes"
- `src/routes/propiedades.tsx` — server-side filters, skeletons, error UI, sticky apply button mobile
- `src/routes/propiedades.$slug.tsx` — breadcrumbs, canonical, share WhatsApp, print button, registro recent view
- `src/routes/blog.tsx` — skeletons, error UI
- `src/routes/blog.$slug.tsx` — breadcrumbs, canonical
- `src/components/public/PropertyCard.tsx` — badge destacada amber, badge "tiempo en mercado", alt mejorado, animación favoritos, placeholder consistente
- `src/components/public/PostCard.tsx` — alt mejorado
- `src/components/public/ChatWidget.tsx` — timeout 15s, Escape cierra, z-index, aria
- `src/components/layout/PublicLayout.tsx` — coordinar z-index FAB/chat
- `src/components/layout/AdminSidebar.tsx` — pulse en badge si hay nuevos
- `src/contexts/CompareContext.tsx` — purge orphans
- `src/lib/format.ts` — `formatCOP(0)` → "Precio a consultar"
- `src/styles.css` — `@media print` rules + keyframe heart-pop
- `src/routes/__root.tsx` — quitar duplicados de meta description

## 📊 Reporte final que entregaré

Al terminar listaré:
- ✅ Lo corregido (con archivos)
- ⚠️ Lo no automatizable (ej. rate limiting edge function por política)
- 💡 Recomendaciones próxima iteración (mapa interactivo, PWA, multi-idioma, dashboards analytics)

¿Procedo con la implementación completa?