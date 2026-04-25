
-- Reemplazar política permisiva de leads con validación básica
DROP POLICY IF EXISTS "Cualquiera puede crear un lead" ON public.leads;

CREATE POLICY "Cualquiera puede crear un lead validado"
ON public.leads FOR INSERT
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 320
  AND length(coalesce(message, '')) <= 2000
  AND source IN ('formulario', 'chat', 'whatsapp')
);

-- Restringir listado masivo del bucket: lectura por path específico solo si se conoce el name
-- Sustituimos la SELECT abierta por una más restrictiva (solo staff puede listar)
DROP POLICY IF EXISTS "Imágenes de propiedades son públicas" ON storage.objects;

-- Lectura pública pero requiere conocer el nombre exacto (esto es seguro porque
-- get_public_url + signed/unsigned access funciona vía CDN sin pasar por list).
-- El acceso por URL pública del CDN no requiere RLS SELECT en storage.objects.
-- Aquí solo permitimos LIST a staff.
CREATE POLICY "Solo staff puede listar imágenes de propiedades"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
