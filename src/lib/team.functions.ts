// Server functions del módulo Equipo.
//
// IMPORTANTE: Este archivo se mantiene auto-contenido (sin importar archivos
// `*.server.*`) para evitar que el plugin de import-protection rompa el bundle
// cliente. El plugin `tss-serverfn-split` reemplaza el cuerpo de cada
// `.handler()` por un stub RPC en el cliente, así que `supabaseAdmin` solo se
// importa dinámicamente dentro del handler — nunca como import estático en
// el cliente. Patrón comprobado: idéntico al que corre en producción.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleSchema = z.enum(["admin", "agente"]);

const CreateMemberSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  role: RoleSchema,
});

const SetAdminSchema = z.object({
  userId: z.string().uuid(),
  makeAdmin: z.boolean(),
});

const DeleteMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Listar equipo
// ---------------------------------------------------------------------------
export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar admin
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Solo admins pueden ver el equipo.");

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
// Crear miembro (con contraseña inicial definida por el admin)
// ---------------------------------------------------------------------------
export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar admin
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Solo admins pueden crear miembros.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("No se pudo crear el usuario.");

    // El trigger handle_new_user() ya creó la fila en agents y un rol 'agente'.
    const phone = data.phone?.trim();
    if (phone) {
      const { error: pErr } = await supabaseAdmin
        .from("agents")
        .update({ phone })
        .eq("id", newUserId);
      if (pErr) console.warn("[team] no se pudo guardar phone:", pErr.message);
    }

    if (data.role === "admin") {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin" });
      if (rErr && !rErr.message.includes("duplicate")) {
        throw new Error(rErr.message);
      }
    }

    return { ok: true as const, userId: newUserId };
  });

// ---------------------------------------------------------------------------
// Promover / despromover admin
// ---------------------------------------------------------------------------
export const setTeamMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetAdminSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Solo admins pueden cambiar roles.");

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
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
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Eliminar miembro
// ---------------------------------------------------------------------------
export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Solo admins pueden eliminar miembros.");

    if (data.userId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta desde aquí.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
