# Cierre final ALQUIDEL — robots.txt, admin de alertas y leads del chatbot

## 1. Ruta `/robots.txt` dinámica

**Archivo nuevo:** `src/routes/robots[.]txt.ts`

Server route que devuelve `text/plain` con:
- `User-agent: *`
- `Allow: /`
- `Disallow: /admin`, `/login`
- `Sitemap: <origin>/sitemap.xml` (origin derivado del header `Host` de la request)

Cache header `public, max-age=3600`.

---

## 2. Vista admin `/admin/alertas`

**Archivo nuevo:** `src/routes/admin/alertas.tsx`

- Misma estructura que `/admin/leads` (TanStack Query + tabla shadcn).
- Query: `select * from property_alerts order by created_at desc`.
- Columnas: Email, Ciudad, Tipo, Presupuesto máx (formateado COP), Fecha.
- Filtro por ciudad (input) y por tipo (select).
- Botón "Exportar CSV" (genera blob client-side con las filas filtradas).
- Estado vacío amistoso con ícono Bell.

**Editar:** `src/components/layout/AdminSidebar.tsx`
- Añadir item "Alertas" (ícono `Bell`) → `/admin/alertas`.

---

## 3. Filtro de leads del chatbot en `/admin/leads`

**Editar:** `src/routes/admin/leads.tsx`

- Añadir filtro `source` (Select: Todos / Formulario / Chat / WhatsApp) que se sincroniza con search params.
- Añadir badge visual en la columna "Fuente" con color distintivo:
  - `chat` → badge violeta con ícono `MessageCircle` ("Alquibot")
  - `formulario` → badge azul
  - `whatsapp` → badge verde
- Card de métrica arriba: "Leads capturados por Alquibot" con conteo del último mes (consulta separada con `count` y filtro `source=chat`).
- El detalle de lead (`leads.$id.tsx`) ya muestra `source` y `notes`; verificar que se vea bien para leads de chat.

---

## Notas técnicas

- Toda la persistencia ya existe (`leads` con columna `source`, `property_alerts` ya creada con RLS).
- No se necesitan migraciones nuevas ni nuevos secrets.
- Las RLS existentes ya permiten que staff lea `leads` y `property_alerts`.
- Mobile-first: la tabla de alertas usará scroll horizontal con `overflow-x-auto` igual que la de leads.

## Entregables

- `https://<dominio>/robots.txt` accesible y referenciando el sitemap.
- `/admin/alertas` listando suscriptores con filtro y export CSV.
- `/admin/leads` con filtro por fuente y métrica destacada de Alquibot.
