ALTER TYPE public.post_category ADD VALUE IF NOT EXISTS 'proyectos';

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text;

CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  city text,
  referrer text,
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  duration_ms integer,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede registrar una vista de página"
ON public.page_views FOR INSERT TO anon, authenticated
WITH CHECK (
  length(path) > 0 AND length(path) <= 300
  AND length(visitor_id) BETWEEN 1 AND 64
  AND length(session_id) BETWEEN 1 AND 64
  AND length(COALESCE(referrer, '')) <= 500
  AND COALESCE(duration_ms, 0) BETWEEN 0 AND 7200000
);

CREATE POLICY "Staff puede ver las vistas de página"
ON public.page_views FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_page_views_viewed_at ON public.page_views (viewed_at DESC);
CREATE INDEX idx_page_views_session ON public.page_views (session_id);
CREATE INDEX idx_page_views_property ON public.page_views (property_id);