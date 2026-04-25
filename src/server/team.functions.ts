import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RoleSchema = z.enum(["admin", "agente"]);

/** Verifica que el userId tenga rol admin (usando supabaseAdmin para bypass RLS). */
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo admins pueden realizar esta acción.");
}

// ---------------------------------------------------------------------------
// Listar equipo
// ---------------------------------------------------------------------------
export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: agents, error: aErr } = await supabaseAdmin
      .from("agents")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: true });
    if (aErr) throw new Error(aErr.message);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    }

    return (agents ?? []).map((a) => ({
      ...a,
      roles: roleMap.get(a.id) ?? [],
      isAdmin: (roleMap.get(a.id) ?? []).includes("admin"),
    }));
  });

// ---------------------------------------------------------------------------
// Invitar miembro
// ---------------------------------------------------------------------------
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(320),
        fullName: z.string().trim().min(2).max(120),
        role: RoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { data: invite, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.fullName },
      },
    );
    if (error) throw new Error(error.message);
    const newUserId = invite.user?.id;
    if (!newUserId) throw new Error("No se pudo invitar al usuario.");

    // El trigger handle_new_user() ya creó la fila en agents y un rol 'agente'.
    // Si pidieron admin, agregamos también ese rol.
    if (data.role === "admin") {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin" });
      if (rErr && !rErr.message.includes("duplicate")) {
        throw new Error(rErr.message);
      }
    }

    return { ok: true, userId: newUserId };
  });

// ---------------------------------------------------------------------------
// Cambiar rol
// ---------------------------------------------------------------------------
export const setTeamMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      // Evitar que el último admin se quite a sí mismo
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("No puedes eliminar el último admin del sistema.");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Eliminar miembro
// ---------------------------------------------------------------------------
export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    if (data.userId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta desde aquí.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// ¿Soy admin?
// ---------------------------------------------------------------------------
export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });