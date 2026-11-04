ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS is_property_of_week boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS properties_one_property_of_week
ON public.properties (is_property_of_week)
WHERE is_property_of_week;

DROP POLICY IF EXISTS "Cualquiera puede crear un lead validado" ON public.leads;

CREATE POLICY "Cualquiera puede crear un lead validado"
ON public.leads FOR INSERT TO public
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message, '')) <= 2000
  AND source = ANY (ARRAY['formulario', 'chat', 'whatsapp', 'propietario'])
);
