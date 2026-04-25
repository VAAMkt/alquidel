# Stabilizar edición de propiedades y navegación del panel admin

## Diagnóstico

### Problema 1 — El botón "Editar propiedad" no hace nada

En TanStack Router con archivos planos, `propiedades.tsx` y `propiedades.$id.editar.tsx` forman una relación **padre/hijo**. El padre se convierte en un *layout* y debe renderizar `<Outlet />` para mostrar la ruta hija. Hoy, `src/routes/admin/propiedades.tsx` exporta `PropiedadesAdmin` (la tabla del listado) directamente como `component`, sin `<Outlet />`. Resultado: al navegar a `/admin/propiedades/{id}/editar` la URL cambia, pero la tabla del listado sigue mostrándose y el formulario hijo nunca aparece. El usuario percibe que "no pasa nada".

El mismo bug afecta a:
- `/admin/propiedades/nueva` (no abre el formulario)
- `/admin/blog/{id}/editar` y `/admin/blog/nuevo` (mismo patrón con `blog.tsx`)
- `/admin/leads/{id}` (mismo patrón con `leads.tsx`)

### Problema 2 — Cambiar entre módulos del admin tarda varios segundos

Cada navegación dispara nuevas peticiones porque hay queries que corren en paralelo y duplicadas:

- `dashboard.tsx` recalcula 4 conteos (`HEAD count=exact` sobre `properties` y `leads`) cada vez que se entra.
- `AdminSidebar` además consulta el conteo de leads nuevos cada 30 s y vuelve a hacerlo cada navegación.
- `useIsAdmin` se vuelve a montar (cache de 5 min ya bien).
- `staleTime` por defecto del router es 0, así que cada navegación re-corre el loader incluso si los datos están frescos.

En la red se ve `HEAD .../leads?status=eq.nuevo` repitiéndose cada ~30 s (sidebar) y bloqueando visualmente la transición porque la tabla del dashboard usa `useQuery` sin estado en suspenso.

## Cambios

### A. Convertir páginas de lista en rutas índice (corrige edición)

Renombrar/convertir los siguientes archivos a su variante `.index.tsx` para que dejen de actuar como layout y permitan que las rutas hijas rendericen libremente:

```text
src/routes/admin/propiedades.tsx        → src/routes/admin/propiedades.index.tsx
src/routes/admin/blog.tsx               → src/routes/admin/blog.index.tsx
src/routes/admin/leads.tsx              → src/routes/admin/leads.index.tsx
```

Cada archivo cambia su `createFileRoute("/admin/propiedades")` por `createFileRoute("/admin/propiedades/")` (path con barra final) — esa es la convención de TanStack para rutas índice planas.

Esto restablece:
- `/admin/propiedades/{id}/editar` → renderiza `EditarPropiedadPage`
- `/admin/propiedades/nueva` → renderiza el formulario nuevo
- `/admin/blog/{id}/editar`, `/admin/blog/nuevo`
- `/admin/leads/{id}`

No se requiere tocar `routeTree.gen.ts` (se regenera solo).

### B. Acelerar navegación entre módulos

1. **Subir `staleTime` a 60 s en queries del dashboard** (`dashboard-stats-v2`, `dashboard-recent-leads`) para que volver a entrar reuse caché en lugar de re-consultar.
2. **Aumentar el `refetchInterval` del badge de leads en `AdminSidebar` de 30 s a 60 s** y añadir `staleTime: 30_000` para evitar refetch al cambiar de ruta.
3. **Quitar `enabled: isReady` redundante en `dashboard.tsx`**: el layout `/admin` ya garantiza sesión vía `beforeLoad`. Reemplazar por una sola comprobación `enabled: !!session?.user`. Esto evita un render extra "vacío" mientras `useAuth` se rehidrata.
4. **Ya no se llama a `getAdminStatus` server fn** (resuelto en sesión anterior); confirmar que `useIsAdmin` sigue con `staleTime: 5 * 60_000` (ya está).

### C. Mejora menor de UX al editar

En `propiedades.$id.editar.tsx`, envolver el formulario en un fallback de carga mínimo (Suspense ya gestionado por `useSuspenseQuery` + loader, pero confirmamos que `notFoundComponent` y el loader devuelvan el dato antes de pintar).

## Archivos a editar

- `src/routes/admin/propiedades.tsx` → renombrar a `src/routes/admin/propiedades.index.tsx` y cambiar el path a `/admin/propiedades/`
- `src/routes/admin/blog.tsx` → renombrar a `src/routes/admin/blog.index.tsx` y cambiar el path a `/admin/blog/`
- `src/routes/admin/leads.tsx` → renombrar a `src/routes/admin/leads.index.tsx` y cambiar el path a `/admin/leads/`
- `src/routes/admin/dashboard.tsx` → ajustar `staleTime` y `enabled` de las queries
- `src/components/layout/AdminSidebar.tsx` → ajustar `refetchInterval` y `staleTime` del badge

## Validación esperada

- Hacer clic en el lápiz de cualquier propiedad abre `/admin/propiedades/{id}/editar` y muestra el formulario con los datos cargados.
- "Nueva propiedad", "Nuevo post", "Editar post" y el detalle de un lead funcionan igual.
- Cambiar entre Dashboard, Propiedades, Leads y Blog se siente inmediato (los datos se sirven desde caché si tienen menos de 60 s).
