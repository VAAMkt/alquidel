// Server-only helpers para el módulo Equipo. NUNCA importar desde código cliente.
// Vive en un archivo separado (no `.functions.ts`) para evitar el anti-patrón de
// helpers hermanos en módulos transformados por `tss-serverfn-split`.
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const RoleSchema = z.enum(["admin", "agente"]);
export type TeamRole = z.infer<typeof RoleSchema>;

export const CreateMemberSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  role: RoleSchema,
});
export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;

export const SetAdminSchema = z.object({
  userId: z.string().uuid(),
  makeAdmin: z.boolean(),
});
export type SetAdminInput = z.infer<typeof SetAdminSchema>;

export const DeleteMemberSchema = z.object({
  userId: z.string().uuid(),
});
export type DeleteMemberInput = z.infer<typeof DeleteMemberSchema>;

export async function assertAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo admins pueden realizar esta acción.");
}

export async function listTeamImpl(userId: string) {
  await assertAdmin(userId);

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
}

export async function createTeamMemberImpl(
  userId: string,
  data: CreateMemberInput,
): Promise<{ ok: true; userId: string }> {
  await assertAdmin(userId);

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
  if (data.phone && data.phone.trim()) {
    const { error: pErr } = await supabaseAdmin
      .from("agents")
      .update({ phone: data.phone.trim() })
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

  return { ok: true, userId: newUserId };
}

export async function setTeamMemberAdminImpl(
  userId: string,
  data: SetAdminInput,
): Promise<{ ok: true }> {
  await assertAdmin(userId);

  if (data.makeAdmin) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
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
  return { ok: true };
}

export async function deleteTeamMemberImpl(
  userId: string,
  data: DeleteMemberInput,
): Promise<{ ok: true }> {
  await assertAdmin(userId);

  if (data.userId === userId) {
    throw new Error("No puedes eliminar tu propia cuenta desde aquí.");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}