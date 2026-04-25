## Diagnóstico

El módulo Equipo se rompe con el error de Vite:

> `The requested module '/src/server/team.functions.ts?t=…' does not provide an export …`

Tras revisar `src/server/team.functions.ts`, `src/components/admin/InviteMemberDialog.tsx`, `src/routes/admin/equipo.tsx` y la guía oficial de `tss-serverfn-split`, la causa raíz es un **anti-patrón documentado**:

`team.functions.ts` define **helpers y constantes hermanos** (`assertAdmin`, `RoleSchema`) en el mismo archivo donde viven los `createServerFn(...)`. El plugin Vite `tss-serverfn-split` divide el archivo en variantes cliente/servidor y, al hacerlo, los handlers terminan referenciando símbolos que ya no existen en su nuevo módulo (de ahí "does not provide an export"). Es exactamente el caso descrito en el knowledge interno:

> "If you see `ReferenceError` from `_serverFn` + `?tss-serverfn-split`, first check for sibling helper/config usage in `.functions.ts`. Move helper/config logic to imported modules."

Adicionalmente, importar `client.server.ts` (server-only) directamente desde el archivo `.functions.ts` aumenta la probabilidad de que el splitter falle dependiendo de la combinación de exports/HMR. La práctica recomendada es mantener `.functions.ts` como una capa delgada que sólo declara `createServerFn(...)` e importa todo lo demás.

## Solución

1. **Crear `src/server/team.server.ts`** (módulo server-only) con:
   - `RoleSchema` (zod enum)
   - `assertAdmin(userId)` que usa `supabaseAdmin`
   - Funciones puras de negocio: `listTeamImpl`, `createTeamMemberImpl`, `setTeamMemberAdminImpl`, `deleteTeamMemberImpl` (reciben `userId` autenticado y los datos validados)
   - Importa `supabaseAdmin` desde `@/integrations/supabase/client.server` (ya server-only)

2. **Reescribir `src/server/team.functions.ts`** para que sea un wrapper delgado:
   - Sólo importa `createServerFn`, `requireSupabaseAuth`, `z` y los helpers desde `./team.server`
   - Cada `createServerFn(...).inputValidator(...).handler(...)` simplemente delega a la función `*Impl` correspondiente
   - Ya no contiene helpers ni constantes a nivel de módulo más allá de la declaración de los servidores

3. **Endurecer el frontend** (`src/routes/admin/equipo.tsx`) para que un fallo del módulo no muestre la pantalla genérica "Something went wrong":
   - Añadir un `errorComponent` propio en la ruta `/admin/equipo` que muestre el mensaje real y un botón de reintento
   - Asegurar que el `useQuery` use `retry: false` y que el estado de error se muestre dentro de la card en vez de propagar al error boundary global

4. **Validación de `phone` opcional**: actualmente `z.string().trim().max(40).optional().or(z.literal(""))`. Cambiarlo a `z.string().trim().max(40).optional()` y normalizar `""` a `undefined` antes de enviarlo, para evitar issues sutiles con la validación cuando el campo se deja vacío.

5. **Smoke test manual**: tras los cambios, navegar a `/admin/equipo` autenticado como admin, crear un miembro de prueba con email/contraseña/nombre y verificar que:
   - El diálogo se cierra correctamente
   - El nuevo miembro aparece en la tabla
   - El nuevo usuario puede iniciar sesión inmediatamente

## Archivos afectados

- **Crear**: `src/server/team.server.ts`
- **Reemplazar contenido**: `src/server/team.functions.ts` (wrapper delgado)
- **Editar**: `src/routes/admin/equipo.tsx` (errorComponent local + manejo de error en query)
- **Editar**: `src/components/admin/InviteMemberDialog.tsx` (normalización de phone opcional)

No se requieren cambios de base de datos ni de RLS — la migración previa que añadió las políticas y la función `handle_new_user` siguen siendo válidas.

## Por qué esto evita el bug a futuro

Cumplir la regla "`*.functions.ts` es sólo wrappers de `createServerFn`" elimina la categoría completa de errores de splitter, que es la responsable de los crashes intermitentes que has visto en el módulo Equipo desde hace varios turnos. Combinado con el `errorComponent` de ruta, incluso si en el futuro otro módulo presenta un fallo de splitter o RPC, la página seguirá siendo navegable y el error visible quedará acotado al panel afectado.