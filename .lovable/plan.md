# Plan: Property Detail — añadir "Propiedades similares" y verificar clickabilidad

## Diagnóstico

Antes de tocar código, esto es lo que verifiqué leyendo el proyecto:

### 1. Las property cards SÍ son clickeables (ya implementado)

`src/components/public/PropertyCard.tsx` ya envuelve toda la card en un `<Link to="/propiedades/$slug" params={{ slug: p.slug }}>` (líneas 48–53), con `e.preventDefault()` + `e.stopPropagation()` en los botones de favoritos y comparar (helper `stop()` líneas 42–45, usado en líneas 91 y 104). El hover effect está aplicado en la `Card` interna.

El session replay del usuario confirma que la navegación funciona: navegó de `/propiedades/casa-campestre-rustica-chia` a `/propiedades/casa-campestre-norte-bogota` haciendo clic en una card.

**Causa real del síntoma reportado**: hay un runtime error `Failed to fetch dynamically imported module: virtual:tanstack-start-client-entry`. Es un fallo de carga del cliente TanStack (HMR/módulo stale), no un bug de código. Se resuelve solo con un rebuild — no requiere cambios en PropertyCard.

### 2. La ruta de detalle existe y está completa

`src/routes/propiedades.$slug.tsx` (612 líneas) ya tiene **todo** lo que pide la spec:
- `createFileRoute("/propiedades/$slug")` con loader que llama `fetchPropertyBySlug`
- Breadcrumbs (Inicio › Propiedades › título) usando `<Breadcrumbs />`
- Galería con miniaturas clickeables y placeholder `Building2`
- Header con badges (venta/arriendo, estado, tipo), título, precio con `displayPrice()`
- Chips: área, habitaciones, baños, ciudad
- Descripción, amenidades con ícono `Check`
- Box de ubicación
- Calculadora hipotecaria en accordion colapsable
- Aside sticky derecha: formulario de contacto que hace `INSERT` en `leads` (source `formulario`, status `nuevo`, `property_id`), botón verde de WhatsApp con `MessageCircle`, card de contacto Alquidel
- FAB móvil de WhatsApp (`fixed`, `lg:hidden`, z-30)
- Toast de éxito y reset del formulario
- Meta tags + JSON-LD `RealEstateListing` + canonical
- `errorComponent` y `notFoundComponent`

### 3. Slugs en la base de datos están OK

Query a `properties LIMIT 10` devolvió las 8 propiedades, todas con `slug` válido (kebab-case, sin nulls ni vacíos). **No se requiere migración de slugs.**

## Único gap real detectado

La sección **"Propiedades similares"** descrita en la spec (punto 6) **no existe** en `propiedades.$slug.tsx`. Esta es la única funcionalidad faltante.

## Cambios a implementar

### Editar `src/routes/propiedades.$slug.tsx`

1. **Extender el loader** para traer hasta 3 propiedades similares en paralelo a la propiedad principal:
   - Filtros: `city = property.city`, `type = property.type`, `id != property.id`
   - Solo columnas necesarias para `PropertyCardData` (id, slug, title, type, price, area_m2, bedrooms, bathrooms, city, neighborhood, images, is_featured, created_at)
   - `.limit(3)` ordenado por `created_at desc`
   - Devolver `{ property, similar }` desde el loader

2. **Renderizar la sección** justo antes del FAB móvil (después del cierre de `</div>` de `max-w-7xl`):
   - Título `<h2>` "Propiedades similares"
   - Grid `sm:grid-cols-2 lg:grid-cols-3` con `<PropertyCard p={...} />` para cada item
   - Si `similar.length === 0`, no renderizar la sección
   - Importar `PropertyCard` desde `@/components/public/PropertyCard`

### Ajuste menor en `src/components/public/PropertyCard.tsx` (opcional)

Alinear el hover con el spec: cambiar `hover:-translate-y-0.5 hover:shadow-xl` por `hover:-translate-y-1 hover:shadow-md transition-all duration-200`. Es cosmético — la actual versión ya funciona, pero la spec lo pide explícito.

## Lo que NO se va a hacer (y por qué)

- **No se reescribe PropertyCard**: ya está correcto. Re-envolverlo o reestructurarlo introduciría regresiones.
- **No se crea/recrea `propiedades.$slug.tsx`**: ya tiene todas las secciones de la spec excepto las similares.
- **No se ejecuta migración de slugs**: todas las propiedades en DB tienen slug válido.
- **No se "arregla" el runtime error de `virtual:tanstack-start-client-entry`**: se resuelve solo al rebuild tras los cambios. Si persistiera, sería un issue de plataforma, no de código de la app.

## Resultado esperado

- Las cards siguen siendo clickeables (ya lo eran).
- La página de detalle muestra una sección "Propiedades similares" con hasta 3 propiedades de la misma ciudad y mismo tipo de operación.
- Si no hay similares disponibles, la sección se oculta completamente.
- Cero impacto en formulario de leads, calculadora, breadcrumbs y FAB de WhatsApp (ya funcionaban).
