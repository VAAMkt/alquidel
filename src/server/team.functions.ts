// Wrapper delgado: SOLO declaraciones de createServerFn. Toda la lógica vive en
// `team.server.ts`. Mantener este archivo libre de helpers/constantes evita el
// anti-patrón documentado de `tss-serverfn-split` que provocaba el error
// "The requested module '/src/server/team.functions.ts' does not provide an export".
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CreateMemberSchema,
  DeleteMemberSchema,
  SetAdminSchema,
  createTeamMemberImpl,
  deleteTeamMemberImpl,
  listTeamImpl,
  setTeamMemberAdminImpl,
} from "./team.server";

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await listTeamImpl(context.userId);
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    return await createTeamMemberImpl(context.userId, data);
  });

export const setTeamMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetAdminSchema.parse(input))
  .handler(async ({ data, context }) => {
    return await setTeamMemberAdminImpl(context.userId, data);
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    return await deleteTeamMemberImpl(context.userId, data);
  });