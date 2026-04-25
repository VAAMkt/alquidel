
-- ============ ENUMS ============
CREATE TYPE public.listing_type AS ENUM ('venta', 'arriendo');
CREATE TYPE public.property_type AS ENUM ('apartamento', 'casa', 'local', 'oficina', 'lote', 'bodega');
CREATE TYPE public.property_status AS ENUM ('disponible', 'vendido', 'arrendado', 'reservado');
CREATE TYPE public.lead_status AS ENUM ('nuevo', 'contactado', 'interesado', 'cerrado', 'descartado');
CREATE TYPE public.app_role AS ENUM ('admin', 'agente');

-- ============ AGENTS (perfiles del staff) ============
CREATE TABLE public.agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  role public.app_role NOT NULL DEFAULT 'agente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES (separada para evitar recursión) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ FUNCIÓN has_role (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Función auxiliar: ¿es staff (admin o agente)?
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'agente')
  )
$$;

-- ============ PROPERTIES ============
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type public.listing_type NOT NULL,
  property_type public.property_type NOT NULL,
  price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
  area_m2 NUMERIC(10,2) NOT NULL CHECK (area_m2 >= 0),
  bedrooms INT NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms INT NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  city TEXT NOT NULL DEFAULT 'Bogotá',
  neighborhood TEXT,
  address TEXT,
  status public.property_status NOT NULL DEFAULT 'disponible',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  images TEXT[] NOT NULL DEFAULT '{}',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_properties_type ON public.properties(type);
CREATE INDEX idx_properties_property_type ON public.properties(property_type);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_is_featured ON public.properties(is_featured);
CREATE INDEX idx_properties_city ON public.properties(city);

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL DEFAULT '',
  status public.lead_status NOT NULL DEFAULT 'nuevo',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'formulario',
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);

-- ============ TRIGGER updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRIGGER auto-crear agent + rol al registrarse ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agents (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agente');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ POLÍTICAS RLS ============

-- properties: lectura pública, escritura solo staff
CREATE POLICY "Cualquiera puede ver propiedades"
ON public.properties FOR SELECT
USING (true);

CREATE POLICY "Staff puede crear propiedades"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff puede actualizar propiedades"
ON public.properties FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin puede eliminar propiedades"
ON public.properties FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- leads: insertar público, leer/editar solo staff
CREATE POLICY "Cualquiera puede crear un lead"
ON public.leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff puede ver leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff puede actualizar leads"
ON public.leads FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin puede eliminar leads"
ON public.leads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- agents
CREATE POLICY "Agente ve su propio perfil"
ON public.agents FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agente actualiza su propio perfil"
ON public.agents FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin puede eliminar agentes"
ON public.agents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Usuario ve sus propios roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gestiona roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

CREATE POLICY "Imágenes de propiedades son públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Staff puede subir imágenes de propiedades"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff puede actualizar imágenes de propiedades"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff puede eliminar imágenes de propiedades"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
