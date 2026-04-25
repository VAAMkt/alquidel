## Diagnóstico

### Diferencia entre publicado vs preview actual

**Versión publicada (commit `71a5b26`)** — funciona:
- Todo el código (schemas, helpers, handlers) vive en `src/server/team.functions.ts`.
- El cliente importa solo `createTeamMember`, `listTeam`, etc. El plugin `tss-serverfn-split` reemplaza `.handler()` por un stub RPC en el bundle cliente. No hay imports a `*.server.*`, así que la regla de "import-protection" no se dispara.

**Versión actual** — falla con `does not provide an export named 'createTeamMember'`:
- En el último intento de fix se creó `src/server/team.server.ts` con `supabaseAdmin` y los schemas.
- `team.functions.ts` ahora importa de `./team.server` (`CreateMemberSchema`, `createTeamMemberImpl`, etc.).
- Cuando Vite arma el bundle del cliente, sigue la cadena `equipo.tsx → team.functions.ts → team.server.ts → client.server.ts`.
- TanStack tiene una regla por defecto del import-protection plugin que bloquea `**/*.server.*` desde el entorno cliente (`getDefaultImportProtectionRules` en `start-plugin-core`).
- El plugin de splitting (`handleCreateServerFn`) elimina los cuerpos de los handlers del cliente, pero **no elimina los imports estáticos**. Como esos imports apuntan a archivos `*.server.*`, el módulo cliente falla durante la transformación/evaluación HMR y queda sin exports — de ahí el mensaje "does not provide an export named 'createTeamMember'".

En producción (build), Cloudflare bundlea el SSR y el cliente con módulos virtuales pre-resueltos en disco; si por azar el último build publicado fue antes de este refactor, sigue funcionando con la versión vieja, mientras que el dev server siempre re-transforma el archivo y revienta.

### Conclusión

El refactor a `team.server.ts` introdujo el bug. La estructura de un único archivo `*.functions.ts` (la del commit publicado) es la correcta para este patrón: server functions auto-contenidas, sin imports a archivos `*.server.*` desde el cliente.

## Plan de corrección

1. **Consolidar** todo el código del equipo en `src/server/team.functions.ts`:
   - Schemas Zod (`CreateMemberSchema`, `SetAdminSchema`, `DeleteMemberSchema`, `RoleSchema`).
   - Helper `assertAdmin`.
   - Handlers de `listTeam`, `createTeamMember`, `setTeamMemberAdmin`, `deleteTeamMember` con la lógica completa dentro del `.handler()`.
   - Mantener `import { supabaseAdmin } from "@/integrations/supabase/client.server"` — esto es seguro porque el archivo NO se llama `*.server.*` y el splitter elimina el cuerpo del handler antes de llegar al bundle cliente. (Es exactamente lo que hace la versión publicada que funciona.)

2. **Eliminar** `src/server/team.server.ts` (queda obsoleto).

3. **No tocar**:
   - `src/components/admin/InviteMemberDialog.tsx` — sigue importando `createTeamMember` desde `team.functions`.
   - `src/routes/admin/equipo.tsx` — mantiene `errorComponent` y la verificación de admin.
   - El middleware `requireSupabaseAuth`.

4. **Validación**:
   - Recargar `/admin/equipo` y confirmar que la tabla del equipo carga sin el error.
   - Probar crear un nuevo miembro desde el diálogo "Crear miembro".

## Por qué funciona este patrón

- El plugin `handleCreateServerFn` detecta `createServerFn(...).handler(fn)` y, en el bundle cliente, reemplaza `fn` por `createClientRpc(functionId)`. El cuerpo del handler (que usa `supabaseAdmin` y los schemas) desaparece del cliente.
- Los `import` de `client.server.ts` quedan como código muerto y Vite los tree-shakea o los marca como side-effect-free, pero como `client.server.ts` accede a `process.env` solo dentro del Proxy/getter, el simple import no rompe nada en el navegador.
- La diferencia clave: importar `client.server.ts` directamente está permitido (no es `**/*.server.*` por convención de TanStack — la regla aplica a sufijo `.server.` en el nombre, y `client.server.ts` sí coincide). Aquí TanStack tiene un comportamiento sutil: el match es por glob `**/*.server.*` y `client.server.ts` matchea, pero el splitter procesa primero `*.functions.ts` y elimina los handlers antes que el import-protection inspeccione la cadena. Como los imports quedan, en teoría debería fallar igual…

   Por eso, **además** de consolidar el código, se reemplaza el import directo por uno que use `eval`/dynamic-import dentro del handler, garantizando que ningún `import` estático estático apunte a archivos `*.server.*` en el bundle cliente:

   ```ts
   // Dentro de cada .handler():
   const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
   ```

   Esto sí es bullet-proof: el import dinámico solo se evalúa en el servidor (en el cliente el handler entero fue reemplazado por el RPC stub).

## Archivos a modificar

- `src/server/team.functions.ts` (reescribir como archivo único auto-contenido, con `await import("@/integrations/supabase/client.server")` dentro de cada handler).
- `src/server/team.server.ts` (eliminar).

## Resultado esperado

- `/admin/equipo` carga la tabla sin el error de "does not provide an export named 'createTeamMember'".
- "Crear miembro" sigue funcionando como en la versión publicada.
- El módulo deja de romperse al hacer HMR.
