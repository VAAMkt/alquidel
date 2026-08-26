# Analíticas propias en el panel de admin

Sección de métricas de tráfico dentro de `/admin`, con datos 100% propios (sin GA, GTM ni herramientas externas).

## 1. Registro de vistas

Nueva tabla `property_views` en la base de datos: id, propiedad, slug, fecha/hora, ciudad y referrer (de dónde llegó el visitante).

- Cualquier visitante (incluso sin sesión) puede registrar una vista.
- Solo el equipo (admin/agente) puede leer las vistas.
- Índices por propiedad y por fecha para que las consultas sean rápidas.

En la ficha de propiedad (`/propiedades/:slug`) se registra una vista al montar la página, en segundo plano, sin bloquear el render y sin romper nada si falla. Se registra una sola vez por carga de ficha.

## 2. Nueva página `/admin/analiticas`

Selector de período arriba: Hoy / Últimos 7 días / Últimos 30 días / Este mes (por defecto 7 días).

Tarjetas de métricas (mismo estilo que el dashboard actual):
- Vistas totales de propiedades en el período
- Propiedades únicas vistas
- Leads recibidos en el período
- Alertas registradas en el período

Gráfico de barras: vistas por día (eje X dd/MM, eje Y vistas), con recharts.

Tablas:
- Top 10 propiedades más vistas (título con link a la ficha pública, ciudad, vistas)
- Top 5 propiedades con más leads en el período

Estado vacío en español cuando aún no hay datos ("Aún no hay vistas registradas en este período").

## 3. Navegación

- Ítem "Analíticas" en el sidebar admin con ícono `BarChart2`, entre Dashboard y Propiedades.
- En el dashboard, bajo las 4 tarjetas y antes de la tabla de leads, una línea de acceso rápido con link "Ver analíticas completas".

## Detalles técnicos

- Migración: `CREATE TABLE public.property_views` + `GRANT INSERT TO anon, authenticated`, `GRANT SELECT TO authenticated`, `GRANT ALL TO service_role`, RLS activo, política de insert abierta y política de select con `public.is_staff(auth.uid())`.
- Agregaciones (por día, por propiedad, únicas) se calculan en el cliente a partir de una consulta acotada al período con columnas mínimas (`property_id, slug, city, viewed_at`); los leads por propiedad se resuelven con join a `properties`.
- TanStack Query con `staleTime: 60_000`, queryKey incluyendo el período; ruta `src/routes/admin/analiticas.tsx` bajo el layout `/admin` ya existente (autenticación heredada).
- Solo dependencias ya presentes: Supabase, TanStack Query/Router, shadcn/ui, recharts, lucide-react, date-fns con locale `es`.

## Nota

Las vistas empiezan a contar desde que se publique este cambio; no hay histórico previo que importar.
