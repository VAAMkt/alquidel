## Diagnóstico

### 1. La web está muy lenta y los botones del admin "no hacen nada"
La causa raíz NO es performance — es que el **SSR del Home está crasheando** por un import roto (`@/components/public/RecentViews`) que aún figuraba en el log del dev-server. Cuando el SSR falla, TanStack Router cae a *client-rendering* tras un timeout, lo que produce:
- Sensación de lentitud al cambiar de pestaña / módulo (espera del fallback).
- Botones que "no responden": las navegaciones a `/admin/propiedades/nueva` y `/admin/propiedades/$id/editar` arrancan pero el chunk del módulo destino tarda o falla.
- Redirección al `/login` (estado actual del usuario) porque la sesión se pierde durante el crash.

Las rutas en sí **están bien registradas** en `routeTree.gen.ts` (`/admin/propiedades/nueva` y `/admin/propiedades/$id/editar` existen).

### 2. Filtros de `/admin/propiedades` que "no funcionan solos"
La query `useQuery(["admin","properties"])` trae **toda la tabla** y filtra en cliente con `useMemo`. El filtrado SÍ funciona, pero:
- Con `staleTime: 60s` global + sin `refetchOnWindowFocus`, los cambios de filtro no recargan datos pero el `useMemo` debería aplicarse instantáneamente.
- El problema percibido es el mismo del punto 1: el render se bloquea por el SSR caído.

### 3. Leads: no hay forma de crearlos manualmente y no se explica el origen
Hoy los leads se crean automáticamente desde:
- Formulario público de contacto (`source: 'formulario'`)
- Chatbot Alquibot (`source: 'chat'`)
- Botón WhatsApp (`source: 'whatsapp'`)

Falta:
- Botón **"Nuevo lead manual"** en `/admin/leads` (para registrar llamadas, walk-ins, referidos).
- Panel informativo explicando los 3 canales de captación.

### 4. Gestión de admins/agentes
Hoy todo usuario nuevo se crea solo con `signUp` y el trigger `handle_new_user()` lo asigna como `agente`. No hay UI para:
- Ver el equipo
- Invitar nuevos admins/agentes
- Cambiar rol (promover a admin / degradar)
- Eliminar agentes

---

## Plan de cambios

### A. Estabilizar SSR (corrige lentitud + botones)
1. Cambiar el import roto en `src/routes/index.tsx` a path **relativo verificable**: ya está como `"../components/public/RecentViews"` pero el log muestra que sigue fallando con alias. Forzar reload del dev-server tocando el archivo y verificando con `tail` del log.
2. Envolver `<RecentViews />` en un `<ClientOnly>` (no se renderiza en SSR — usa `localStorage`). Esto elimina dependencia del componente en el ciclo SSR.
3. Asegurar que ningún otro hook en la home toque `window`/`localStorage` durante SSR.

### B. `/admin/propiedades` — UX de filtros y feedback
1. Añadir indicador visual cuando se está re-filtrando ("X resultados de Y").
2. Botón **"Limpiar filtros"** cuando hay algún filtro activo.
3. Ya funciona con cambio de filtro inmediato; reforzar con `transition` para evitar flicker.
4. Verificar que los botones **"Nueva propiedad"** y **"Editar"** navegan correctamente una vez SSR estabilizado.

### C. `/admin/leads` — Crear leads manualmente + transparencia
1. Añadir botón **"+ Nuevo lead"** que abre un `Dialog` con formulario:
   - Nombre, email, teléfono, mensaje, fuente (formulario/chat/whatsapp/manual), propiedad asociada (opcional), estado inicial.
2. Agregar un **bloque informativo** colapsable arriba: "¿Cómo llegan los leads?" listando los 3 canales con iconos.
3. Para soportar `source: 'manual'`:
   - Migración SQL: actualizar el `CHECK`/policy de `leads` para incluir `'manual'` en la lista de fuentes válidas.
   - Actualizar `LEAD_SOURCES` y labels en `src/lib/leads.tsx`.

### D. Gestión de equipo (admins + agentes)
1. Nueva ruta **`/admin/equipo`** (`src/routes/admin/equipo.tsx`):
   - Tabla con: nombre, email, teléfono, rol, fecha de alta, acciones.
   - Visible solo para admins (verificar con `has_role(uid, 'admin')`).
2. Botón **"Invitar miembro"** → Dialog con email + nombre + rol (admin/agente).
   - Implementación: usa **Lovable Cloud Auth** con `supabase.auth.admin.inviteUserByEmail` desde una **server function** con `requireSupabaseAuth` + verificación de rol admin (usando `supabaseAdmin`).
   - Al aceptar la invitación, el trigger `handle_new_user()` crea el agente; luego un paso adicional escribe el rol elegido en `user_roles`.
3. Acciones por fila (solo admin):
   - Cambiar rol (admin ↔ agente) → `update user_roles`.
   - Eliminar miembro → `supabase.auth.admin.deleteUser(id)` vía server function.
4. Agregar entrada **"Equipo"** en `AdminSidebar` (ícono `Users`) visible solo si el usuario actual es admin.

### E. Hacer al usuario actual admin (one-shot)
- Como hoy todos los usuarios entran con rol `agente` por el trigger, necesitamos que **el dueño del proyecto** sea admin. Crearemos un script SQL que promueva al primer usuario registrado a `admin` (o le permitiremos elegir un email vía pregunta si hay varios).

---

## Detalles técnicos

**Migraciones SQL:**
```sql
-- 1) Permitir source 'manual' en leads
ALTER POLICY "Cualquiera puede crear un lead validado" ON public.leads
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message,'')) <= 2000
  AND source = ANY(ARRAY['formulario','chat','whatsapp','manual'])
);

-- 2) Política para que staff (admin/agente) cree leads manuales
CREATE POLICY "Staff puede crear leads manuales"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (is_staff(auth.uid()));

-- 3) Promover al usuario actual a admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ORDER BY created_at ASC LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
```

**Server functions nuevas** (`src/server/team.ts`):
- `inviteTeamMember({ email, fullName, role })` — usa `supabaseAdmin.auth.admin.inviteUserByEmail` + inserta rol.
- `updateTeamMemberRole({ userId, role })` — verifica admin, actualiza `user_roles`.
- `deleteTeamMember({ userId })` — verifica admin, llama `auth.admin.deleteUser`.

**Componentes nuevos:**
- `src/components/admin/NewLeadDialog.tsx`
- `src/components/admin/InviteMemberDialog.tsx`
- `src/components/common/ClientOnly.tsx`
- `src/routes/admin/equipo.tsx`

**Archivos editados:**
- `src/routes/index.tsx` (envolver RecentViews en ClientOnly)
- `src/routes/admin/leads.tsx` (botón "+ Nuevo lead" + bloque informativo)
- `src/routes/admin/propiedades.tsx` (botón limpiar filtros + contador)
- `src/components/layout/AdminSidebar.tsx` (entrada "Equipo" si admin)
- `src/lib/leads.tsx` (añadir `'manual'` a sources)

---

## Entregables esperados
1. ✅ Navegación admin fluida sin caídas a client-render.
2. ✅ Botones "Nueva propiedad" y "Editar" funcionando.
3. ✅ Filtros con feedback visual y "Limpiar filtros".
4. ✅ Leads creables manualmente + explicación de canales.
5. ✅ `/admin/equipo` con invitar / cambiar rol / eliminar (solo admin).
6. ✅ Usuario actual promovido a admin.