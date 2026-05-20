
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS administration_fee numeric,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS stratum smallint,
  ADD COLUMN IF NOT EXISTS built_year int,
  ADD COLUMN IF NOT EXISTS garages int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_rooms int NOT NULL DEFAULT 0;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_stratum_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_stratum_check CHECK (stratum IS NULL OR (stratum BETWEEN 1 AND 6));

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_built_year_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_built_year_check CHECK (built_year IS NULL OR (built_year BETWEEN 1800 AND 2100));
