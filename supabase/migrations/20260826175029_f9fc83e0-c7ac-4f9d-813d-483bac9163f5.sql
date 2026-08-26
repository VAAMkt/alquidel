CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  slug text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  city text,
  referrer text
);

CREATE INDEX property_views_property_id_idx ON public.property_views (property_id);
CREATE INDEX property_views_viewed_at_idx ON public.property_views (viewed_at);

GRANT INSERT ON public.property_views TO anon, authenticated;
GRANT SELECT ON public.property_views TO authenticated;
GRANT ALL ON public.property_views TO service_role;

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede registrar una vista"
  ON public.property_views FOR INSERT TO anon, authenticated
  WITH CHECK (length(slug) > 0 AND length(slug) <= 300 AND length(COALESCE(referrer, '')) <= 500);

CREATE POLICY "Staff puede ver las vistas"
  ON public.property_views FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));