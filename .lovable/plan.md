# Módulo final: Chatbot Alquibot + Diferenciadores Premium

## Decisión clave: Lovable AI en lugar de DeepSeek

Recomiendo usar **Lovable AI Gateway con `google/gemini-3-flash-preview`** en lugar de DeepSeek:

- `LOVABLE_API_KEY` ya está configurado — **no necesitas agregar `DEEPSEEK_API_KEY`**.
- API compatible con OpenAI (mismo payload que DeepSeek).
- Tiene tier gratuito mensual incluido.
- Latencia y calidad apropiadas para un chatbot de catálogo.

Si más adelante quieres cambiar a DeepSeek, solo se cambia la URL del gateway y el header de auth.

---

## 1. Edge Function `chat-alquidel`

**Archivo:** `supabase/functions/chat-alquidel/index.ts`
**Config:** `supabase/config.toml` → `[functions.chat-alquidel] verify_jwt = false`

Flujo:
1. CORS + manejo de OPTIONS.
2. Valida body `{ message, history }`.
3. Consulta `properties` (status='disponible', limit 20) con service role.
4. Construye system prompt **Alquibot** con catálogo embebido (id, slug, title, type, price, area, hab, baños, ciudad, barrio, descripción corta).
5. Llama a `https://ai.gateway.lovable.dev/v1/chat/completions` con `model: google/gemini-3-flash-preview`, `max_tokens: 500`, `temperature: 0.7`.
6. **AbortController con timeout de 15s.**
7. Maneja 429 (rate limit) y 402 (créditos) devolviendo mensajes amigables.
8. **Detección de lead:** regex sobre el último mensaje del usuario (nombre + celular colombiano: `\b3\d{9}\b`). Si ambos están presentes y la conversación menciona "asesor"/"contactar", inserta en `leads` con `source='chat'`, `status='nuevo'`.
9. Devuelve `{ reply, lead_captured }`.

---

## 2. ChatWidget público

**Archivo:** `src/components/public/ChatWidget.tsx`
**Integración:** se monta en `PublicLayout.tsx`.

- **Cerrado:** botón flotante 56px (`bottom-6 right-6`), slate-800, ícono `MessageCircle` blanco. Badge amber-500 con `1` parpadeando solo la primera visita (controlado por `sessionStorage.alquibot_seen`). Tooltip nativo "¿En qué te ayudamos?".
- **Abierto:** panel `380x520px` (mobile: full width con margen).
  - Header con avatar circular "A" (slate-800/amber gradient) + nombre + subtítulo + botón X.
  - Mensaje de bienvenida automático al primer abrir.
  - Burbujas: usuario derecha slate-800/blanco, bot izquierda zinc-100/zinc-900.
  - Typing indicator (3 puntos animados con `animate-bounce` y delay).
  - Input + Enter para enviar, botón Send.
  - Banner verde `✓ Un asesor te contactará pronto` cuando `lead_captured=true`.
  - Footer fijo con botón "Hablar con asesor" → WhatsApp.
- **Persistencia:** historial en `sessionStorage.alquibot_history` (solo dentro de useEffect).
- **Auto-scroll** al último mensaje con `scrollIntoView`.
- Llamado al edge function vía `${VITE_SUPABASE_URL}/functions/v1/chat-alquidel`.

---

## 3. Comparador de propiedades

**Context:** `src/contexts/CompareContext.tsx`
- Estado: `Array<PropertyCardData>` (máx 3).
- Métodos: `add`, `remove`, `clear`, `isInCompare`.
- Provider montado en `__root.tsx` envolviendo `<Outlet />`.

**Cambios en `PropertyCard.tsx`:**
- Botón pequeño "Comparar" + ícono `GitCompare` arriba derecha de la imagen, visible siempre en mobile y on-hover en desktop.
- `e.preventDefault()` + `e.stopPropagation()` para no disparar el Link.
- Toggle visual cuando ya está incluida.

**Barra sticky:** nuevo componente `CompareBar.tsx` montado en `PublicLayout`. Aparece cuando hay ≥2 propiedades. Muestra thumbnails + botón "Comparar (n)" → `/comparar`. Botón limpiar.

**Ruta `/comparar`** (`src/routes/comparar.tsx`):
- Tabla responsive con columnas por propiedad y filas: Imagen, Título, Precio, Área, Habitaciones, Baños, Ciudad/Barrio, Tipo, Operación, Amenidades (chips).
- Botones "Ver detalle" y "Quitar" por columna.
- Estado vacío con CTA al catálogo si <2.

---

## 4. Favoritos

**Context:** `src/contexts/FavoritesContext.tsx`
- Lista de IDs en estado.
- Hidratación desde `localStorage.alquidel-favorites` solo dentro de `useEffect`.
- Métodos: `toggle`, `isFavorite`, `count`.
- Provider en `__root.tsx`.

**UI:**
- Botón `Heart` (lucide) en `PropertyCard` (esquina superior izquierda) y en página de detalle de propiedad. Relleno cuando favorito.
- Link "Favoritos" + ícono Heart con badge en `PublicNavbar`, visible solo si `count > 0`.

**Ruta `/favoritos`** (`src/routes/favoritos.tsx`):
- Query a Supabase `.in('id', favoriteIds)` (solo si hay IDs).
- Mismo grid del catálogo.
- Estado vacío con CTA si no hay favoritos.

---

## 5. Alertas de nuevas propiedades

**Migración SQL** (nueva tabla):
```sql
create table public.property_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city text,
  type listing_type,
  max_price numeric,
  created_at timestamptz not null default now()
);
alter table public.property_alerts enable row level security;
create policy "Cualquiera puede crear alerta" on public.property_alerts
  for insert to public
  with check (length(trim(email)) > 0 and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
create policy "Staff ve alertas" on public.property_alerts
  for select to authenticated using (is_staff(auth.uid()));
```

**UI en `/propiedades`:** card al final del grid con CTA que abre un `Sheet` con formulario (zod + react-hook-form):
- Email (requerido), Ciudad (Select opcional), Operación (venta/arriendo opcional), Presupuesto máximo (number opcional).
- Insert en `property_alerts`, toast confirmación.

---

## 6. Reglas técnicas aplicadas

- Edge function: try/catch por paso, mensajes de error específicos.
- Chat: `AbortController` con 15s, no bloquea UI (estado `isSending`).
- Comparador y Favoritos: **Context API** (sin nueva dependencia).
- `localStorage` y `sessionStorage` solo dentro de `useEffect` (SSR-safe).
- Mobile-first en todos los componentes.

---

## Archivos a crear/editar

**Crear:**
- `supabase/functions/chat-alquidel/index.ts`
- `src/components/public/ChatWidget.tsx`
- `src/components/public/CompareBar.tsx`
- `src/components/public/AlertsModal.tsx`
- `src/contexts/CompareContext.tsx`
- `src/contexts/FavoritesContext.tsx`
- `src/routes/comparar.tsx`
- `src/routes/favoritos.tsx`
- Migración SQL para `property_alerts`

**Editar:**
- `supabase/config.toml` (añadir bloque `[functions.chat-alquidel]`)
- `src/components/layout/PublicLayout.tsx` (montar ChatWidget + CompareBar)
- `src/components/layout/PublicNavbar.tsx` (link Favoritos con badge)
- `src/components/public/PropertyCard.tsx` (botón comparar + corazón)
- `src/routes/__root.tsx` (envolver con Providers)
- `src/routes/propiedades.tsx` (card de alertas)
- `src/routes/propiedades.$slug.tsx` (botón corazón)

---

## Entregables al finalizar

- Alquibot respondiendo con contexto real del catálogo y capturando leads (chat).
- Comparador con barra sticky y página `/comparar`.
- Favoritos con badge en navbar y página `/favoritos`.
- Tabla `property_alerts` con formulario público.
- Cero secrets nuevos requeridos (uso de Lovable AI ya configurado).
