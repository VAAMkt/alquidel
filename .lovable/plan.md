# Refactor de autenticación: una sola fuente de verdad

## Problema

Hoy hay varias fuentes simultáneas de estado de auth, lo que provoca login lento, spinners infinitos y redirecciones inconsistentes:

- `useAuth` crea **un listener `onAuthStateChange` y un `getSession` por cada componente** que lo usa (PublicNavbar, dashboard, useIsAdmin, etc.).
- `/login` registra **otro `onAuthStateChange` propio** y además navega tanto en el listener como en el `onSubmit` (doble navegación).
- `/login`, `/admin`, `/admin/configuracion` y `/admin/equipo` llaman cada uno a `supabase.auth.getSession()` en su `beforeLoad`, sin compartir resultado.
- `useIsAdmin` depende de `useAuth.loading`, que cambia varias veces porque el listener se reinstala por componente.

Resultado: el token a veces aún no está hidratado cuando una ruta consulta sesión → redirige a `/login` aunque haya sesión, o `/login` muestra el formulario un instante antes de redirigir.

## Solución

Una sola fuente de verdad: `AuthContext` global montado en `__root.tsx`. Todos los componentes y guards de ruta consumen ese contexto.

### 1. Crear `src/contexts/AuthContext.tsx`

- Estado: `{ session, user, isAuthLoading, isAuthenticated }`, inicial `isAuthLoading = true`.
- `useEffect` único al montar:
  - Suscribirse PRIMERO a `supabase.auth.onAuthStateChange` con manejo por evento:
    - `INITIAL_SESSION` → setear `session`/`user` y `isAuthLoading = false`.
    - `SIGNED_IN` → setear `session`/`user`, `isAuthLoading = false`.
    - `SIGNED_OUT` → limpiar `session`/`user`, `isAuthLoading = false`.
    - `TOKEN_REFRESHED` → actualizar `session` silenciosamente.
    - `USER_UPDATED` → actualizar `user`.
  - Después llamar `supabase.auth.getSession()` como respaldo (por si `INITIAL_SESSION` no llega), y siempre que termine forzar `isAuthLoading = false`.
  - Cleanup: `subscription.unsubscribe()`.
- Exponer `signOut()` que llama `supabase.auth.signOut()` (la navegación la hace quien lo invoca).
- `<AuthProvider>` envuelve la app dentro de `RootComponent` en `src/routes/__root.tsx` (entre `QueryClientProvider` y `FavoritesProvider`).

### 2. Refactorizar `src/hooks/useAuth.ts`

- Borrar todo el `useEffect` con listeners y `getSession`.
- `useAuth()` → `useContext(AuthContext)`. Lanzar error si se usa fuera del provider.
- Exporta: `{ session, user, isAuthLoading, isAuthenticated, signOut }`.
- Mantener compatibilidad: dejar también `loading` como alias de `isAuthLoading` para no romper consumidores actuales (`PublicNavbar`, `dashboard`, `admin.tsx`).
- Mantener export nombrado `signOut` que reenvía al del contexto vía `supabase.auth.signOut()` directo (para `AdminSidebar` que lo importa como función suelta).

### 3. Refactorizar `src/hooks/useIsAdmin.ts`

- Consumir `useAuth()` del nuevo contexto (sin cambios de API). Sigue usando `useQuery` para leer `user_roles`. Quitar `console.warn`.

### 4. `src/routes/login.tsx`

- Quitar el `onAuthStateChange` local y el `useEffect` asociado.
- Quitar `supabase.auth.getSession()` del `beforeLoad` (el guard de redirección lo hace el componente con el contexto, evitando race con la hidratación inicial).
- Componente:
  - `isAuthLoading` → spinner centrado.
  - `isAuthenticated` → `navigate({ to: search.redirect ?? "/admin/dashboard", replace: true })` dentro de un `useEffect` (una sola vez).
  - Si no, mostrar formulario.
- `onSubmit`: tras `signInWithPassword` exitoso, NO navegar manualmente; el `useEffect` anterior detectará `isAuthenticated` y redirigirá una sola vez. Quitar cualquier `setTimeout`.
- Sanitización de `redirect`: ya existe en `validateSearch`; reforzar a solo `/admin/...` para evitar loops.

### 5. `src/routes/admin.tsx`

- Quitar `getSession()` y la lógica de `beforeLoad` (o dejar `beforeLoad` vacío). El gate vive en el componente con el contexto.
- En `AdminLayout`:
  - `isAuthLoading` → spinner.
  - `!isAuthenticated` → `useEffect` que llama `navigate({ to: "/login", search: { redirect: location.pathname }, replace: true })` una vez. Mientras tanto, render spinner.
  - `isAuthenticated` → render normal con `<Outlet />`.

### 6. Limpieza adicional

- `src/routes/admin/configuracion.tsx` y `src/routes/admin/equipo.tsx`: eliminar `supabase.auth.getSession()` de sus `beforeLoad`. Si necesitan gate de admin, usar `useIsAdmin()` en el componente (equipo ya lo hace) y dejar el guard de sesión al layout `/admin`.
- Quitar `console.log`/`console.error` del flujo de auth en producción (`login.tsx`, `useIsAdmin.ts`). Mantener errores que muestran toast.
- No tocar `setTimeout` no relacionados con auth (`leads.index.tsx`, `ChatWidget.tsx`).
- No modificar `src/integrations/supabase/server-fn-fetch.ts` (el `getSession` ahí es para inyectar el JWT en cada server fn, es correcto).

## Archivos modificados

- **Nuevo**: `src/contexts/AuthContext.tsx`
- **Editar**:
  - `src/routes/__root.tsx` (envolver con `AuthProvider`)
  - `src/hooks/useAuth.ts` (consumir contexto)
  - `src/hooks/useIsAdmin.ts` (limpiar warn)
  - `src/routes/login.tsx` (quitar listener/`getSession` local, navegación única)
  - `src/routes/admin.tsx` (quitar `getSession` en `beforeLoad`, gate por contexto)
  - `src/routes/admin/configuracion.tsx` (quitar `getSession` de `beforeLoad`)
  - `src/routes/admin/equipo.tsx` (quitar `getSession` de `beforeLoad`)

## Resultado esperado

- Refresh con sesión activa → nunca aparece login.
- `/login` con sesión activa → redirige inmediatamente sin parpadeo del formulario.
- Login exitoso → una única navegación a `/admin/dashboard`.
- Logout → sale de `/admin` inmediatamente, sin loops.
- Sin spinners infinitos. Comportamiento idéntico desktop/móvil.
