## Deuda técnica ALQUIDEL — limpieza integral

Se ejecutarán cinco grupos de cambios para eliminar estado fantasma, mejorar tipado, accesibilidad y manejo de precios en cero/null.

---

### 1. Favoritos — purga de IDs huérfanos

**`src/contexts/FavoritesContext.tsx`**
- Añadir método `removeOrphanIds(orphanIds: string[])` al contexto que filtra `ids` y persiste el resultado a `localStorage` en un solo paso (sin esperar el efecto de persistencia).
- Exponerlo en `FavoritesContextValue`.

**`src/routes/favoritos.tsx`**
- Después de cargar las propiedades por IDs, comparar `ids` (los guardados) con `data.map(p => p.id)` (los que existen en DB).
- Si hay huérfanos, llamar `removeOrphanIds(orphanIds)` dentro de un `useEffect` para evitar setState durante el render.

---

### 2. Comparador — persistencia en localStorage

**`src/contexts/CompareContext.tsx`**
- Hidratar `items` desde `localStorage` con la key `'alquidel-compare'` al inicializar (patrón idéntico al de Favoritos: estado `hydrated`, hidratación en `useEffect`).
- Persistir el array completo de `PropertyCardData` (no solo IDs) en cada cambio para no perder los datos visuales tras refresh.
- Mantener la purga existente contra Supabase (verifica IDs válidos al montar).

**`src/routes/comparar.tsx`**
- La tabla ya tiene `overflow-x-auto` con `min-w-[640px]` — verificado, no requiere cambios adicionales.
- Reemplazar `formatCOP(Number(p.price))` por `displayPrice(p.price)` (ver punto 5).

---

### 3. Eliminar `as any` en rutas admin críticas

Aprovechar el tipo `Database` ya generado en `src/integrations/supabase/types.ts`.

**Archivos afectados:**
- `src/routes/admin/leads.index.tsx` (línea 294)
- `src/routes/admin/leads.$id.tsx` (línea 150)
- `src/routes/admin/dashboard.tsx` (línea 163)

**Estrategia:** Como el join `properties:property_id(...)` no es inferido perfectamente por el cliente generado, definir tipos locales explícitos en lugar de `any`:

```ts
type LeadRow = Database['public']['Tables']['leads']['Row'];
type LeadWithProperty = LeadRow & {
  properties: { id: string; slug: string; title: string; /* etc */ } | null;
};
```

Tipar explícitamente el resultado del query y eliminar el cast `(lead as any).properties`.

---

### 4. Accesibilidad en formularios

**`src/routes/login.tsx`**
- Como usa `FormData` sin estado de errores por campo, mantener semántica básica: añadir `aria-required="true"` y `autoComplete` (ya existe).
- Los toasts ya comunican errores; no se introducirán refs a elementos inexistentes.

**`src/routes/contacto.tsx`**
- Asociar mensajes con inputs vía `aria-describedby` y `aria-invalid`:
  ```tsx
  <Input id="email" aria-describedby={errors.email ? "email-error" : undefined}
         aria-invalid={!!errors.email} />
  {errors.email && <p id="email-error" ...>{errors.email}</p>}
  ```
- Aplicar el mismo patrón a `name`, `email`, `phone`, `message`.

**`src/components/public/ChatWidget.tsx`**
- Botones icon-only (`X`, `Send`, botón flotante) ya tienen `aria-label` — verificado.
- Tab y Escape ya funcionan: el panel tiene `role="dialog"` y el listener de Escape ya cierra. Verificado, no requiere cambios.

**Formularios admin (NewLeadDialog y similares):** revisión rápida para añadir `aria-invalid`/`aria-describedby` donde haya estado de errores por campo.

---

### 5. Helper `displayPrice` para precio cero/null

**`src/lib/format.ts`**
- Añadir export:
  ```ts
  export function displayPrice(price: number | string | null | undefined): string {
    if (price === null || price === undefined || price === 0 || price === "0") {
      return "Precio a consultar";
    }
    return formatCOP(price);
  }
  ```
  (`formatCOP` ya devuelve "Precio a consultar" para `n <= 0`, pero el helper deja explícita la intención y maneja `null`/`undefined` sin pasar por la conversión a 0.)

**Reemplazar `formatCOP(price)` por `displayPrice(price)` en:**
- `src/components/public/PropertyCard.tsx` (línea 119)
- `src/routes/comparar.tsx` (línea 119)
- `src/routes/propiedades.$slug.tsx` (línea 354 — precio principal de la ficha; las líneas 492/496 son cálculos de cuota hipotecaria, se mantienen con `formatCOP`)
- `src/routes/admin/propiedades.index.tsx` (línea 273)
- `src/routes/admin/alertas.tsx` (línea 209)
- `src/components/admin/PropertyForm.tsx` (línea 346 — preview en formulario, se mantiene `formatCOP` ya que el admin necesita ver el valor literal incluso si es 0 mientras edita)

`src/routes/propiedades.tsx` línea 274 muestra `precioMax` del filtro (no de una propiedad), se deja con `formatCOP`.

---

### Resultado esperado

- Favoritos sincroniza con DB: nunca quedan IDs fantasma tras eliminar propiedades.
- Comparador sobrevive refresh y limpia silenciosamente IDs inválidos.
- Cero `as any` en las 3 rutas admin críticas; tipos derivados de `Database`.
- Formularios públicos accesibles por lectores de pantalla.
- Ningún precio muestra "$0" en el sitio público.

### Detalles técnicos

- No requiere migraciones de DB ni cambios en edge functions.
- No requiere paquetes nuevos.
- Verificación con `tsc --noEmit` al finalizar.