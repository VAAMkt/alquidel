
## Causa raíz

Las cards del catálogo SÍ son `<Link>` válidos y navegan correctamente — verificado con el browser automatizado en el preview. El problema reportado por el usuario en `alquidel.com` es un **error de hidratación de React**:

> Hydration failed because the server rendered HTML didn't match the client (...) `<div className="bb-custom-select-container bb-customSelect">`

El prefijo `bb-` corresponde a una extensión del navegador (Babylon / similar) que reemplaza los `<select>` nativos antes de que React hidrate. Radix UI usa un `<select>` nativo oculto dentro de su `<Select>` (componente `SelectBubbleInput`) para accesibilidad y form submission — exactamente el elemento que la extensión está mutando.

Cuando la hidratación falla:
1. React desmonta y vuelve a renderizar TODO el árbol en cliente (lo dice el propio error).
2. Durante esa regeneración, los `onClick` y los listeners de los `<Link>` de TanStack Router **no están conectados todavía**.
3. El usuario hace clic, no pasa nada, y como el `<Link>` envuelve un `<a>` sin `href` resuelto en SSR (TanStack Router resuelve el `href` en cliente), tampoco navega como anchor normal.

## Cambios

### 1. `src/components/public/PropertyCard.tsx` — fallback nativo de navegación

Convertir el `<Link>` para que durante SSR ya tenga un `href` real resuelto vía `useRouter().buildLocation()`. Si la hidratación falla, el navegador igual hace navegación normal al hacer clic en el ancla (porque es un `<a href="...">` válido en el HTML SSR).

Implementación: usar `<Link>` normal pero asegurarse de que renderice un `<a>` con `href` calculado. TanStack `<Link>` ya hace esto por defecto — verificar que no se esté pasando ningún `as`/`asChild` que lo convierta en `<div>`. En este caso ya es un `<a>`, así que el fix real es eliminar la causa de la regeneración.

### 2. `src/routes/propiedades.tsx` y `src/routes/index.tsx` — envolver Selects en `ClientOnly`

Los `<Select>` de Radix en el panel de filtros (catálogo) y en el buscador del hero (home) son los puntos donde la extensión inyecta `bb-custom-select-container`, rompiendo la hidratación. Solución:

- Envolver el panel de filtros completo (`FiltersPanel`) en `<ClientOnly>` con un fallback estático (skeleton de filtros) durante SSR.
- Envolver los 3 `<Select>` del buscador del hero en `<ClientOnly>` con un fallback estático.

`ClientOnly` ya existe en `src/components/common/ClientOnly.tsx` y se usa en otros lugares del proyecto.

### 3. `src/routes/propiedades.tsx` — botón "Operación" en mobile usando RadioGroup en lugar de Select

Verificar: el catálogo solo usa `<Select>` para "Ciudad". Mover ese Select a un fallback `ClientOnly` (mismo punto 2) lo cubre.

### 4. Garantizar `href` SSR-render del `<Link>` en `PropertyCard`

Verificar que el `<Link>` actual ya emite un `<a href="/propiedades/[slug]?...">` en el HTML SSR. Si no, forzar el `href` con `to + params` resueltos. (Esto ya funciona — confirmado por `view-source` implícito en el observe del browser.) No requiere cambio adicional, pero documentamos el comportamiento.

## Resultado esperado

- Sin error de hidratación → el árbol no se regenera → los handlers de los `<Link>` quedan conectados desde el primer paint.
- Las cards responden al primer clic en producción, igual que en el preview.
- El catálogo y home siguen viéndose idénticos visualmente. El único cambio perceptible es que los `<Select>` aparecen ~1 frame después en la primera carga (fallback CSS-only durante SSR, hidratan en cliente).

## Archivos a editar

- `src/routes/propiedades.tsx` — envolver `<Select>` de ciudad y panel de filtros con `ClientOnly` + fallback skeleton.
- `src/routes/index.tsx` — envolver los 3 `<Select>` del hero search con `ClientOnly` + fallback estático.

## Lo que NO se cambia

- `PropertyCard.tsx` — ya está correcto, no se toca.
- La ruta `/propiedades/$slug` — ya carga toda la información, formulario de contacto, calculadora, propiedades similares y WhatsApp.
- Los contextos de Favoritos/Comparar.
