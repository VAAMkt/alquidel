-- 1) Permitir source 'manual' en leads (recrear la policy de INSERT pública)
DROP POLICY IF EXISTS "Cualquiera puede crear un lead validado" ON public.leads;

CREATE POLICY "Cualquiera puede crear un lead validado"
ON public.leads FOR INSERT TO public
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message, '')) <= 2000
  AND source = ANY (ARRAY['formulario','chat','whatsapp'])
);

-- 2) Política para que staff (admin/agente) cree leads manuales con cualquier fuente válida
CREATE POLICY "Staff puede crear leads manuales"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  is_staff(auth.uid())
  AND length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message, '')) <= 2000
  AND source = ANY (ARRAY['formulario','chat','whatsapp','manual'])
);

-- 3) Promover al usuario más antiguo a admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;