# Plan de mejoras para Alquidel

Voy a implementar 5 bloques de cambios manteniendo el diseño actual (Shadcn UI + tokens semánticos).

---

## 1. Base de datos: nuevos campos en `properties`

Migración SQL que agrega columnas opcionales a `public.properties`:

- `administration_fee numeric` (valor administración, solo aplica visualmente para arriendo o como dato extra)
- `video_url text` (URL YouTube)
- `stratum smallint` con check `between 1 and 6`
- `built_year int`
- `garages int default 0`
- `storage_rooms int default 0`
- `neighborhood` ya existe → no se toca

Nota: `src/integrations/supabase/types.ts` se regenera automáticamente tras correr la migración (no se edita a mano).

> **Aclaración importante sobre administración**: en el mensaje aparece "solo si es Venta", pero en Colombia la cuota de administración es habitual tanto en venta (informativa) como en arriendo (se suma al canon). Voy a mostrarla en ambos casos pero con etiqueta clara ("Administración mensual"). Si prefieres limitarlo estrictamente a venta, dímelo antes de implementar.

---

## 2. Formulario admin (`src/components/admin/PropertyForm.tsx`)

- Ampliar el esquema Zod y `blank` con los nuevos campos.
- Nueva sección **"Detalles del inmueble"** con inputs: Estrato (select 1–6), Año de construcción, Garajes, Depósitos, Administración (COP, formateado igual que precio), URL de video YouTube (con validación de URL y patrón youtube/youtu.be).
- Mantener input de Barrio (ya existe) y Dirección.
- **Reemplazar el `Select` de Ciudad por un ComboBox** con `Popover` + `Command` (`CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`) de shadcn — ya están en el proyecto.
- Crear `src/lib/colombia-cities.ts` con un array de los principales municipios de Colombia (~300–400 cabeceras + capitales y municipios clave de Cundinamarca: Chía, Cajicá, Zipaquirá, Cota, Sopó, La Calera, Mosquera, Funza, Madrid, Tenjo, Tabio, Tocancipá, etc.). Formato `{ name, department }` para mostrar "Chía, Cundinamarca" y permitir búsqueda por ambos. No es necesario incluir los 1.123 municipios; con ~400 cubrimos el mercado y el bundle queda <30KB.
- Actualizar `insert`/`update` del mutation para incluir los nuevos campos (con `null` cuando vacíos).

---

## 3. Ficha pública (`src/routes/propiedades.$slug.tsx`)

- **Resumen de características (chips)**: pasar de 4 a 6 tarjetas — Área, Habitaciones, Baños, Garajes, Estrato, Antigüedad (año). Solo mostrar las que tengan dato; en grid responsive 2/3/6 columnas.
- **Precio + administración**: debajo del precio principal, si `administration_fee` existe, mostrar "+ Administración: $XXX/mes" en `text-muted-foreground`.
- **Privacidad de dirección**:
  - En el header y card "Ubicación" mostrar SOLO `"Barrio, Ciudad"` (nunca `address`).
  - En el JSON-LD (`streetAddress`) tampoco se incluirá la dirección exacta; solo `addressLocality` + `addressRegion`.
- **Mapa**: nuevo bloque con iframe de Google Maps embebido usando `address` (o `neighborhood, city` como fallback) en el `q=` del embed, sin renderizar el texto. URL tipo `https://www.google.com/maps?q=<encoded>&output=embed`, `loading="lazy"`, aspect 16/9, bordes redondeados acorde al diseño.
- **Video YouTube**: si `video_url` existe, extraer el ID con un helper en `src/lib/youtube.ts` y embedir `<iframe>` responsive (aspect-video) bajo la galería o tras la descripción.

---

## 4. Footer (`src/components/layout/PublicFooter.tsx`)

- Añadir bloque "Síguenos" con íconos `Facebook` e `Instagram` de `lucide-react`, linkeando a:
  - Facebook: la URL exacta del perfil oficial. Necesito confirmación de la URL real (la del mensaje es un placeholder). Por defecto usaré `https://www.facebook.com/alquidelbienesraices` y pediré confirmación.
  - Instagram: `https://www.instagram.com/alquidelbrsas/`
- Centralizar las URLs en `src/lib/company.ts` (`COMPANY.social.facebook` / `instagram`).

---

## 5. Bug del blog (`PostCard` + ruta `/blog/$slug`)

Revisión: `PostCard.tsx` ya envuelve toda la tarjeta en `<Link to="/blog/$slug" params={{ slug: post.slug }}>` correctamente, y `src/routes/blog.$slug.tsx` existe con loader funcional. El bug que reportas probablemente sea consecuencia de que la lista del blog use `<a>` en lugar de `<Link>`, o de un slug vacío en datos.

Voy a:

- Auditar `src/routes/blog.tsx` y cualquier componente que liste posts para asegurar uso de `<Link>` tipado (no `<a href>`).
- Añadir guard en `PostCard` para no renderizar la tarjeta si `post.slug` está vacío (evita 404).
- Verificar en preview que el click navega correctamente; si no, revisar `routeTree.gen.ts` y reiniciar dev server.

---

## Detalles técnicos

- Stack: React + TanStack Router + Supabase + Tailwind + Shadcn. Sin nuevas dependencias (Command, Popover ya existen; mapa vía iframe nativo, no react-leaflet).
- Tokens: usar `text-foreground`, `text-muted-foreground`, `bg-accent/15`, etc. — sin colores hardcodeados nuevos.
- Migración SQL se ejecuta antes de tocar el formulario y la ficha para que los tipos estén disponibles.
- Orden de implementación: (1) migración → (2) `colombia-cities.ts` + helper YouTube → (3) PropertyForm → (4) ficha pública → (5) footer → (6) auditoría blog.

¿Confirmamos las dos cuestiones abiertas?

1. ¿Administración solo en venta o también en arriendo?  
1. **Administración:** Sigamos estrictamente la retroalimentación del cliente. El campo y el valor de la administración deben mostrarse y aplicar ÚNICAMENTE para propiedades en Venta, NO para arriendo. Oculta el campo si se selecciona arriendo.
2. ¿URL exacta de Facebook de Alquidel?  
2. **URL de Facebook:** Por ahora utiliza `https://www.facebook.com/alquidelbienesraices` como placeholder en `src/lib/company.ts`. Yo me encargaré de actualizar la URL final exacta más adelante. La de Instagram que pusiste `https://www.instagram.com/alquidelbrsas/`) es correcta. El orden de implementación que propones (Migración -> Ciudades/Helpers -> Formulario Admin -> Ficha Pública -> Footer -> Auditoría Blog) es ideal. ¡Adelante, ejecuta el código siguiendo esos pasos!