CREATE POLICY "Autenticados pueden crear leads públicos"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message, '')) <= 2000
  AND source IN ('formulario', 'chat', 'whatsapp')
);