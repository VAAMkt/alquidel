
# Sitio público Alquidel — Home, Catálogo, Detalle, Nosotros, Contacto

## Estado verificado

- `/` y `/propiedades` existen como placeholders genéricos ("Bogotá premium", stats inventados +150/12/98%) → reemplazar por completo con datos y copy reales de Alquidel.
- `/contacto` y `/blog` están enlazadas en navbar/footer pero **no existen como archivos** → hay que crear `/contacto` desde cero (el prompt dice "actualizar existente", pero el archivo no está). `/blog` la dejamos como link removido o placeholder mínimo — confirmaré con la decisión por defecto: removerla del navbar/footer hasta que exista contenido real.
- `/propiedades/:slug` (detalle) no existe → ruta nueva.
- `/nosotros` no existe → ruta nueva, agregar al navbar.
- shadcn ya tiene `accordion`, `slider`, `sheet`, `checkbox`, `tabs` instalados.

---

## 1. Datos compartidos: constantes de empresa

Crear `src/lib/company.ts` con datos reales (nombre, dirección Calle 138 #74-51, teléfonos, email `comercialalquidel@gmail.com`, URL WhatsApp `https://wa.me/573214910400`, misión/visión/quiénes somos). Usar desde Footer, Home, Nosotros, Contacto, Detalle.

Crear `src/lib/whatsapp.ts` con helper `whatsappUrl(message: string)` que devuelve la URL con texto pre-encoded.

---

## 2. Card reutilizable de propiedad

Crear `src/components/public/PropertyCard.tsx` con la card que hoy está duplicada en `/` y `/propiedades`:
- Imagen principal (placeholder Building2 si vacío)
- Badge venta (slate) / arriendo (amber)
- Precio `formatCOP`, título, barrio + ciudad, área, hab, baños
- Wrapper en `<Link to="/propiedades/$slug" params={{ slug }}>` para que toda la card sea clickable

---

## 3. Layout público — actualizar navbar y footer

`PublicNavbar.tsx`:
- Reemplazar links: **Propiedades · Nosotros · Contacto** (sacar Blog hasta que exista la sección).
- Botón derecha: "Acceder" + CTA primario "WhatsApp" verde con ícono MessageCircle.

`PublicFooter.tsx`:
- Reemplazar tagline genérico por copy real de Alquidel.
- Columna "Contacto" con dirección real, teléfonos (321 491 0400 / 601 583 6744), email real, link WhatsApp.
- Sacar link a `/blog`.

---

## 4. Home `/` — reemplazo total

Mantener el archivo, reemplazar contenido:

**Hero (sin imagen — gradiente blanco→zinc-50):**
- Eliminar import de `hero-bogota.jpg` y el `<img>` de fondo.
- Headline: "Encuentra la propiedad de tus sueños en Colombia"
- Subhead: "Venta y arriendo de inmuebles premium. Bogotá y principales ciudades."
- **Card-buscador** (3 selects + botón) sobrepuesto al gradiente:
  - Operación: Todas / Venta / Arriendo
  - Tipo de inmueble: Todos / apartamento / casa / local / oficina / lote / bodega
  - Ciudad: Todas / Bogotá / Medellín / Cali / Barranquilla / Cartagena / Bucaramanga / Pereira / Manizales
  - Botón "Buscar" → `navigate({ to: "/propiedades", search: { tipo, propertyType, ciudad } })` solo con campos no-default

**Propiedades destacadas:** query real
- `select(... ).eq("is_featured", true).eq("status","disponible").order("created_at", { ascending: false }).limit(6)`
- Si `data.length === 0`, refetch sin filtro de `is_featured` (top 6 más recientes disponibles)
- Grid con `<PropertyCard>`

**Sección confianza (datos reales):**
- 3 cards: "8+ Propiedades exclusivas" / "Bogotá y Colombia" / "Asesoría personalizada"
- Iconos lucide: Home, MapPin, Headset

**¿Por qué Alquidel?** 3 columnas:
- "Experiencia": referencia a misión real
- "Servicio integral": referencia a quiénes somos
- "Clientes de por vida": tagline directo de la misión real

**SEO `head()`** ya específico al home.

---

## 5. Catálogo `/propiedades` — reemplazo total con filtros en URL

**Search params con `validateSearch + zodValidator + fallback`:**

```
operacion: "todos" | "venta" | "arriendo"  default "todos"
tipos:     ("apartamento"|"casa"|"local"|"oficina"|"lote"|"bodega")[]  default []
ciudad:    string  default "todas"
precioMax: number  default 5_000_000_000  (paso 100M)
habMin:    0|1|2|3|4  default 0
sort:      "recientes"|"precio-asc"|"precio-desc"|"destacados"  default "recientes"
page:      number  default 1
```

**Layout:**
- Desktop: sidebar izquierda 280px sticky con filtros + grid derecha 3 col
- Mobile: botón "Filtros" arriba que abre `<Sheet side="left">` con los mismos controles

**Sidebar de filtros:**
- RadioGroup operación (todos/venta/arriendo)
- Checkbox group tipos (multiselect, escribe en `tipos` array de la URL)
- Select ciudad
- `<Slider>` precio máximo, min 100M max 5.000M step 100M; label muestra `formatCOP(value)`
- Botones pill habitaciones: 0 / 1 / 2 / 3 / 4+
- Select sort
- Botón "Limpiar filtros" → `navigate({ search: defaults })`

**Query y filtrado:**
- Una sola query `select * from properties where status='disponible'` cacheada por React Query.
- Filtrado/ordenamiento/paginación en cliente con `useMemo` (la base es pequeña, evitamos query por filtro).
- Sort `destacados`: `is_featured DESC, created_at DESC`.

**Grid:** 12 por página, 3/2/1 columnas. Cards = `<PropertyCard>`.

**Estado vacío:** mensaje + botón "Limpiar filtros".

**Paginación:** Anterior/Siguiente + indicador "Página X de Y".

**SEO `head()`** específico al catálogo.

---

## 6. Detalle `/propiedades/:slug` — ruta nueva

Archivo: `src/routes/propiedades.$slug.tsx`

**Loader:**
```ts
loader: ({ params, context: { queryClient } }) =>
  queryClient.ensureQueryData(propertyBySlugQueryOptions(params.slug))
```
Si no existe → `throw notFound()`.
`notFoundComponent` y `errorComponent` obligatorios.

**`head({ loaderData })` dinámico:**
- title: `${title} | Alquidel Bienes Raíces`
- description: primeros 155 chars de `description`
- og:title, og:description, og:type=article
- og:image y twitter:image: `images[0]` si existe (omitir si no — sin imagen genérica)

**Layout dos columnas (lg:grid-cols-3, contenido col-span-2 + sidebar col-span-1):**

**Columna izquierda:**
- Galería: `useState<number>(0)` para índice activo; imagen grande aspect 4/3 + fila de miniaturas debajo (click → cambia activo). Si vacío: placeholder Building2 grande.
- Header: badge operación (slate/amber), badge estado, título grande, precio grande `formatCOP`.
- Chips de datos: área `formatArea`, hab, baños, ciudad (con íconos Maximize, Bed, Bath, MapPin).
- Bloque descripción.
- Grid amenidades 2-3 col: ícono Check + label.
- Box ubicación: ícono MapPin + "Sector: {neighborhood}, {city}" (sin mapa).
- **Calculadora hipotecaria en `<Accordion type="single" collapsible>`:**
  - Inputs locales con `useState`: `valor` (default = price), `enganchePct` (slider 10-50, default 30), `tasa` (input numérico, default 11), `plazoAnios` (select 5/10/15/20).
  - Cálculo derivado:
    ```
    monto = valor * (1 - enganchePct/100)
    i = (tasa/100) / 12
    n = plazoAnios * 12
    cuota = monto * i / (1 - (1+i)^-n)   // amortización francesa
    ```
  - Output: dos cards mostrando "Monto financiado" y "Cuota mensual" con `formatCOP`.

**Columna derecha (sticky lg:top-20):**
- **Card formulario de contacto:**
  - Validación zod (name >=1 / email válido / message <=2000 / phone opcional)
  - Mensaje pre-llenado: `"Hola, me interesa la propiedad: ${title}"`
  - Submit → `supabase.from("leads").insert({ name, email, phone, message, source: "formulario", property_id: id, status: "nuevo" })`
  - Toast éxito: "¡Consulta enviada! Te contactaremos pronto." + reset form
  - Toast error con mensaje de RLS si falla
- **Botón WhatsApp:** verde-600, ícono MessageCircle, link a `whatsappUrl("Hola, me interesa la propiedad: " + title)`
- **Card info Alquidel:** teléfonos, email, dirección reales

**Botón flotante móvil:**
- `fixed bottom-4 inset-x-4 z-30 lg:hidden`
- Pill verde-600 ancho completo, ícono MessageCircle, link WhatsApp con título de la propiedad

---

## 7. Página `/nosotros` — ruta nueva

Archivo: `src/routes/nosotros.tsx`

- Hero: tagline "Encuentra la propiedad de tus sueños en Colombia", subtítulo de bienvenida
- Sección "Quiénes somos": párrafo real completo
- Misión / Visión: 2 cards lado a lado con íconos (Target / Eye)
- Datos en cifras: 3 stats reales (8+ propiedades, X años, X ciudades)
- CTA final: "Ver propiedades" → `/propiedades`
- `head()` específico

Agregar link **Nosotros** al navbar (entre Propiedades y Contacto, ya que removimos Blog).

---

## 8. Página `/contacto` — crear (no existe)

Archivo: `src/routes/contacto.tsx`

Layout dos columnas:
- **Izquierda - Datos reales:**
  - Card con dirección (MapPin): "Calle 138 #74-51, Oficina 09, Bogotá"
  - Card teléfonos (Phone): "+57 321 491 0400" y "PBX (601) 583 6744"
  - Card email (Mail): "comercialalquidel@gmail.com"
  - Botón WhatsApp grande verde
- **Derecha - Formulario:**
  - Campos: nombre*, email*, teléfono, mensaje*
  - Validación zod
  - Submit → `supabase.from("leads").insert({ ..., source: "formulario", status: "nuevo", property_id: null })`
  - Toast éxito + reset

`head()` específico.

---

## 9. SEO checklist

- Cada ruta nueva (`/`, `/propiedades`, `/propiedades/$slug`, `/nosotros`, `/contacto`) define su propio `head()` con title + description + og:title + og:description únicos.
- Solo el detalle agrega og:image (desde `images[0]`).
- Removemos el og:image global de la home (apuntaba a `hero-bogota.jpg` que ya no usaremos).

---

## Estructura técnica

```text
src/
├─ lib/
│  ├─ company.ts           NUEVO  — datos reales Alquidel
│  └─ whatsapp.ts          NUEVO  — helper URL WhatsApp
├─ components/
│  ├─ public/
│  │  └─ PropertyCard.tsx  NUEVO  — card reutilizable
│  └─ layout/
│     ├─ PublicNavbar.tsx  EDIT   — nav: Propiedades/Nosotros/Contacto + WA CTA
│     └─ PublicFooter.tsx  EDIT   — datos reales
└─ routes/
   ├─ index.tsx            REEMPLAZO — hero+buscador+destacadas+confianza
   ├─ propiedades.tsx      REEMPLAZO — sidebar filtros URL + grid
   ├─ propiedades.$slug.tsx NUEVO   — galería+detalle+calc+lead form
   ├─ nosotros.tsx         NUEVO   — quiénes/misión/visión
   └─ contacto.tsx         NUEVO   — datos reales + form
```

## Notas de ejecución

- Confirmé RLS: `properties` SELECT público y `leads` INSERT público con validación de `name/email/source` → el formulario funciona sin auth.
- Source válido para leads: `"formulario"` (validado por la policy).
- Asset `src/assets/hero-bogota.jpg` deja de usarse en home (no eliminar; solo dejar de importar).
- TanStack Router exige que cada `<Link to="...">` apunte a una ruta que exista en `routeTree.gen.ts` — por eso removemos `to="/blog"` del navbar/footer en este turno.
