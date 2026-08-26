# Dashboard con métricas + Blog con video

## 1. Estadísticas dentro del Dashboard

Todo se mueve a `/admin/dashboard` (la pestaña Analíticas deja de ser necesaria; se puede quitar del menú o dejar como redirección al dashboard).

Orden de la pantalla:

1. Las 4 cajas actuales, sin cambios: Propiedades disponibles, Leads nuevos, Leads este mes, Destacadas activas.
2. Bloque "Visitantes" con selector de período (Hoy / 7 días / 30 días / Este mes), al estilo de la imagen:
   - Fila de métricas: Visitantes, Páginas vistas, Vistas por visita, Duración de visita, Tasa de rebote.
   - Gráfico de área con línea (visitantes por día).
3. Top 10 propiedades más vistas (tabla con enlace a la ficha).
4. Leads por propiedad (tabla).
5. Últimos leads (tabla actual, se conserva).

### Para que esas métricas sean reales

Hoy solo se registran vistas de fichas de propiedad, sin identidad de visita. Para poder mostrar visitantes, vistas por visita, duración y rebote hace falta ampliar el registro:

- Nueva tabla `page_views` (o ampliar `property_views`) con: ruta, `property_id` opcional, ciudad, referrer, `visitor_id` (anónimo, guardado en localStorage), `session_id` (30 min de inactividad), y marca de tiempo de entrada/salida.
- Registro automático en todas las páginas públicas desde el layout público (no solo fichas), con `sendBeacon` al salir para calcular duración.
- Cálculo: visitantes = `visitor_id` únicos; vistas por visita = páginas vistas / sesiones; duración = promedio por sesión; rebote = % de sesiones con una sola página.

Si prefieres no tocar el tracking, el bloque puede mostrar solo Visitantes aproximados y Páginas vistas con los datos actuales de fichas, y las otras tres métricas quedarían vacías.

## 2. Blog con video y proyectos de inversión

- Añadir a los artículos un campo de **URL de video** (YouTube/Vimeo), igual que en propiedades.
- En el editor de artículos: nuevo campo "Video (URL)" junto a la imagen de portada.
- En el artículo público: reproductor embebido responsive debajo de la portada, reutilizando el helper de YouTube que ya existe.
- Nueva categoría **"Proyectos de inversión"** en el blog (la categoría "Inversión" actual se conserva para contenido editorial), con su etiqueta, color y filtro en el listado del blog.
- Los enlaces externos ya funcionan: el contenido se escribe en Markdown, así que `[texto](url)` genera enlaces. Se abrirán en pestaña nueva con `rel="noopener"`.

## Detalles técnicos

- Migración: `ALTER TYPE post_category ADD VALUE 'proyectos'` y `ALTER TABLE posts ADD COLUMN video_url text`.
- Migración de tracking: tabla `page_views` con RLS (insert anónimo validado, lectura solo staff) e índices por fecha y por ruta; grants a `anon`/`authenticated`/`service_role`.
- Dashboard: consultas TanStack Query con `staleTime` de 60s; gráfico con Recharts (`AreaChart`) usando los tokens de marca (teal/navy).
- Se elimina `src/routes/admin/analiticas.tsx` (o queda como redirección) y se quita la entrada del sidebar.
