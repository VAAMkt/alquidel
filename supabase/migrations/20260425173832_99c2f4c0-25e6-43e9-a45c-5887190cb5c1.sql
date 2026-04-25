create table public.property_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city text,
  type public.listing_type,
  max_price numeric,
  created_at timestamptz not null default now()
);

alter table public.property_alerts enable row level security;

create policy "Cualquiera puede crear alerta"
on public.property_alerts
for insert
to public
with check (
  length(trim(email)) > 0
  and length(email) <= 320
  and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

create policy "Staff ve alertas"
on public.property_alerts
for select
to authenticated
using (public.is_staff(auth.uid()));

create policy "Admin puede eliminar alertas"
on public.property_alerts
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));

create index property_alerts_created_at_idx on public.property_alerts (created_at desc);
create index property_alerts_email_idx on public.property_alerts (email);