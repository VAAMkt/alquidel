## Problema

La invitación por email de Lovable Cloud llega al usuario, pero el flujo para que él/ella elija contraseña no está funcionando correctamente (probablemente por la configuración del enlace de redirección o por el flujo de "set password" que no está implementado en la app). Resultado: la invitación queda en limbo.

## Solución propuesta

Reemplazar el flujo de "Invitar por email" por **creación directa del usuario desde el panel de Equipo**, donde el admin define la contraseña inicial y se la comunica al miembro por el canal que prefiera (WhatsApp, llamada, etc.). El miembro entra a `/login`, usa email + contraseña que le dio el admin y listo.

Esto es más simple, más rápido y elimina la dependencia del email de invitación.

## Cambios

### 1. Server function — reemplazar `inviteTeamMember` por `createTeamMember`

Archivo: `src/server/team.functions.ts`

Cambiar la implementación para usar `supabaseAdmin.auth.admin.createUser()` en lugar de `inviteUserByEmail()`:

- Recibe: `email`, `password` (mín 8 caracteres), `fullName`, `phone` (opcional), `role` (`admin` | `agente`)
- Crea el usuario con `email_confirm: true` (queda confirmado de inmediato, puede entrar al instante)
- El trigger `handle_new_user()` ya existente crea automáticamente la fila en `agents` y le asigna rol `agente`
- Si el rol elegido es `admin`, agrega también el rol `admin` a `user_roles`
- Si se proporcionó `phone`, actualiza `agents.phone`

### 2. Diálogo del frontend — agregar campos de contraseña y teléfono

Archivo: `src/components/admin/InviteMemberDialog.tsx` (renombrar internamente a `CreateMemberDialog` o mantener nombre del componente)

- Agregar campo **Contraseña** (tipo `password`, mínimo 8 caracteres) con botón de "mostrar/ocultar" y un botón "Generar contraseña segura" que llene el campo con una random de 12 caracteres
- Agregar campo **Teléfono** (opcional)
- Cambiar título: "Crear nuevo miembro" / descripción: "El miembro podrá acceder de inmediato con el email y contraseña que definas. Compártele estos datos por un canal seguro."
- Botón: "Crear miembro" en lugar de "Enviar invitación"
- Tras crear con éxito, mostrar toast con instrucción: "Miembro creado. Comparte la contraseña con {email} de forma segura."

### 3. UI menor en `equipo.tsx`

Sin cambios funcionales; el componente sigue invocando `<InviteMemberDialog />` (mantenemos el nombre del archivo para no tocar imports).

## Detalles técnicos

```ts
// team.functions.ts (extracto)
export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email().max(320),
      password: z.string().min(8).max(72),
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().max(40).optional().or(z.literal("")),
      role: z.enum(["admin", "agente"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;

    // Trigger handle_new_user() ya creó agents + rol 'agente'.
    if (data.phone && data.phone.trim()) {
      await supabaseAdmin.from("agents")
        .update({ phone: data.phone.trim() })
        .eq("id", userId);
    }
    if (data.role === "admin") {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
    }
    return { ok: true, userId };
  });
```

## Resumen

- 1 server function reescrito (`inviteTeamMember` → `createTeamMember`)
- 1 diálogo actualizado con 2 nuevos campos (contraseña + teléfono) y generador de contraseña
- Sin migraciones SQL — la lógica de roles y `agents` ya está cubierta por el trigger existente
- Sin breaking changes en la tabla — solo cambia cómo se crean los usuarios desde el panel
