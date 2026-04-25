import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Shield, ShieldCheck, Trash2, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InviteMemberDialog } from "@/components/admin/InviteMemberDialog";
import {
  deleteTeamMember,
  getAdminStatus,
  listTeam,
  setTeamMemberAdmin,
} from "@/server/team.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/equipo")({
  beforeLoad: async () => {
    // Verificación adicional: solo admins acceden
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/login", search: { redirect: "/admin/equipo" } });
    }
  },
  head: () => ({ meta: [{ title: "Equipo · ALQUIDEL" }] }),
  component: EquipoPage,
});

function EquipoPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeam);
  const adminCheckFn = useServerFn(getAdminStatus);
  const setAdminFn = useServerFn(setTeamMemberAdmin);
  const deleteFn = useServerFn(deleteTeamMember);
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;

  const { data: meCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin", "me-is-admin"],
    queryFn: async () => {
      if (!accessToken) return { isAdmin: false };
      try {
        return await adminCheckFn({ data: { accessToken } });
      } catch {
        return { isAdmin: false };
      }
    },
    enabled: !authLoading && !!accessToken,
    retry: false,
  });

  const { data: team, isLoading } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => listFn({ data: { accessToken: accessToken! } }),
    enabled: !!accessToken && meCheck?.isAdmin === true,
  });

  const setAdmin = useMutation({
    mutationFn: (input: { userId: string; makeAdmin: boolean }) =>
      setAdminFn({ data: { ...input, accessToken: accessToken! } }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId, accessToken: accessToken! } }),
    onSuccess: () => {
      toast.success("Miembro eliminado");
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (checkingAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meCheck?.isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Acceso restringido</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo administradores pueden gestionar el equipo. Pídele a un admin que te
          promueva si necesitas acceso.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Users className="h-6 w-6 text-accent" />
            Equipo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona admins y agentes con acceso al panel.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      <Card className="mt-6 overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Cargando equipo…
                </TableCell>
              </TableRow>
            ) : (team ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Aún no hay miembros.
                </TableCell>
              </TableRow>
            ) : (
              team!.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.phone || "—"}</TableCell>
                  <TableCell>
                    {m.isAdmin ? (
                      <Badge className="bg-accent/15 text-accent hover:bg-accent/15">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Agente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setAdmin.isPending}
                        onClick={() =>
                          setAdmin.mutate({ userId: m.id, makeAdmin: !m.isAdmin })
                        }
                      >
                        {m.isAdmin ? "Quitar admin" : "Hacer admin"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar a {m.full_name || m.email}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Su cuenta será eliminada de Lovable Cloud y perderá acceso inmediato.
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove.mutate(m.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}