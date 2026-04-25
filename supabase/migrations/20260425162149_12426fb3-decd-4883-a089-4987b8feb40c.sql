-- Enums
CREATE TYPE public.post_category AS ENUM ('compra', 'venta', 'inversion', 'consejos', 'mercado', 'legal');
CREATE TYPE public.post_status AS ENUM ('borrador', 'publicado', 'programado');

-- Tabla posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  category public.post_category NOT NULL DEFAULT 'consejos',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.post_status NOT NULL DEFAULT 'borrador',
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  author TEXT NOT NULL DEFAULT 'Equipo Alquidel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_status_published ON public.posts(status, published_at DESC);
CREATE INDEX idx_posts_category ON public.posts(category);

-- Trigger updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver posts publicados"
ON public.posts FOR SELECT
TO public
USING (status = 'publicado');

CREATE POLICY "Staff puede ver todos los posts"
ON public.posts FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff puede crear posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff puede actualizar posts"
ON public.posts FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin puede eliminar posts"
ON public.posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));