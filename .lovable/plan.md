# Diagnóstico: las property cards SÍ navegan

He revisado en detalle el código y el estado actual antes de tocar nada. **No existe el bug reportado.** Reescribir el componente como se propone eliminaría funcionalidad valiosa sin arreglar nada.

## Evidencia

1. **`src/components/public/PropertyCard.tsx` ya envuelve toda la card en `<Link>`** de TanStack Router apuntando a `/propiedades/$slug` con `params={{ slug: p.slug }}`. Los botones de favorito y comparar usan `e.preventDefault()` + `e.stopPropagation()` correctamente.
2. **La ruta `/propiedades/$slug` existe** en `src/routes/propiedades.$slug.tsx`.
3. **Todos los slugs en la base de datos están poblados** (consulta confirmó 0 filas con slug nulo o vacío).
4. **El catálogo (`src/routes/propiedades.tsx`) y el home (`src/routes/index.tsx`) usan `<PropertyCard p={...} />`** con el prop correcto.
5. **No hay errores de consola ni de runtime.**
6. **El usuario está actualmente en `/propiedades/casa-campestre-rustica-chia`**, es decir, la navegación funcionó. El session replay del turno previo muestra un clic en una card que efectivamente disparó la navegación al detalle.

## Por qué NO recomiendo aplicar la reescritura propuesta

El snippet propuesto degradaría el componente actual:

- **Pierde features**: el botón de comparar, el badge "Nuevo precio" (precio bajado, calculado por `created_at`), el badge "Destacada" con icono Sparkles, el placeholder de imagen reusable (`PropertyImagePlaceholder`), animación `heart-pop`, y los hover states del grupo (`group-hover:scale-105`, opacidad de botones en desktop).
- **Tipos más estrictos rompen el catálogo**: el snippet declara `price: number | null`, `area_m2: number | null`, `bedrooms: number | null`, `bathrooms: number | null`, pero en `propiedades.tsx` y `index.tsx` esos campos llegan como `number | string` desde Supabase (numeric type). Esto causaría errores de TypeScript en cascada en al menos 4 archivos donde se renderizan PropertyCards.
- **Quita `created_at`** de la interfaz, lo que rompe la lógica del badge "Nuevo precio".
- **Define un `Building2Icon` inline** cuando ya existe `PropertyImagePlaceholder` para ese caso.

## Plan recomendado

**Opción A (recomendada): no hacer cambios.** El componente funciona. Si el usuario percibe que algún clic no navega, probablemente sea:
- Un clic accidental sobre el corazón / botón comparar (que es el comportamiento esperado: no navega).
- Una recarga durante un deploy / HMR transitorio.

**Opción B: si insiste en aplicar la reescritura literal,** primero quiero confirmarlo porque el resultado será regresión visual y de tipos. Si el objetivo real es solo *garantizar* que la card sea clickeable, ya lo es.

**Opción C: mejora preventiva ligera** (la única que aporta valor):
- Agregar un guard en `PropertyCard` que, si `p.slug` viene falsy, renderice la card sin `<Link>` (en lugar de generar una URL `/propiedades/undefined`). Costo: ~5 líneas. No urgente porque la DB está limpia, pero es defensa razonable.

## Acciones si apruebas

- Si eliges **A**: cierro el ticket, sin cambios.
- Si eliges **B**: aplico la reescritura literal (con la advertencia de regresión).
- Si eliges **C**: añado el guard de slug en `PropertyCard.tsx` (solo ese archivo).

Dime cuál prefieres y procedo.
