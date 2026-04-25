## Problema

Los leads enviados desde el formulario de contacto **no se guardan en la base de datos**. La tabla `leads` está completamente vacía (0 filas), confirmando que ninguna inserción está pasando.

### Causa raíz

Las políticas RLS de la tabla `leads` tienen un hueco para usuarios **autenticados** que envían `source = 'formulario'`:

| Política | Rol | Condición |
|---|---|---|
| `Cualquiera puede crear un lead validado` | `public` (anónimo) | source ∈ ('formulario','chat','whatsapp') |
| `Staff puede crear leads manuales` | `authenticated` | source ∈ (...,'manual') **y** `is_staff(auth.uid())` |

Cuando un usuario logueado (como tú, admin) envía el formulario público con `source = 'formulario'`:
- La política `public` **no aplica** porque ya no eres anónimo.
- La política `staff` **no aplica** porque PostgREST evalúa primero la condición `source = 'manual'`. Aunque eres staff, el source es 'formulario', así que falla.

Resultado: la inserción es bloqueada silenciosamente por RLS y el toast de éxito no se muestra (o el error se pierde). Los visitantes anónimos sí podrían insertar, pero como tú probaste estando logueado, falló.

## Solución

Agregar una política RLS adicional que permita a **cualquier usuario autenticado** crear leads con sources públicos (`formulario`, `chat`, `whatsapp`), aplicando las mismas validaciones de longitud/formato que la política pública.

### Cambios

1. **Migración SQL** — agregar nueva política en `leads`:
   ```sql
   CREATE POLICY "Autenticados pueden crear leads públicos"
   ON public.leads
   FOR INSERT
   TO authenticated
   WITH CHECK (
     length(trim(name)) BETWEEN 1 AND 200
     AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
     AND length(email) <= 320
     AND length(coalesce(message,'')) <= 2000
     AND source IN ('formulario','chat','whatsapp')
   );
   ```

2. **`src/routes/contacto.tsx`** — mejorar manejo de errores:
   - Mostrar el mensaje real de Supabase en el toast cuando `error` no sea null (hoy se lanza pero el `.message` de PostgREST puede ser críptico).
   - Loggear `error` en consola para diagnóstico futuro.

3. **`src/routes/propiedades.$slug.tsx`** (línea 212) — mismo patrón de manejo de error, ya que usa la misma inserción.

### Verificación

Después del cambio probar:
- Enviar formulario en `/contacto` estando logueado como admin → debe aparecer en `/admin/leads`.
- Enviar formulario en `/contacto` desde ventana incógnita (anónimo) → también debe funcionar (la política pública sigue intacta).
- Enviar interés en una página de propiedad → debe registrarse con `source = 'formulario'` y `property_id` ligado.

## Resumen técnico

- **Tipo de cambio**: 1 migración SQL (nueva policy) + 2 ediciones menores de manejo de errores en frontend.
- **Sin breaking changes**: las políticas existentes se conservan.
- **Sin riesgo de seguridad**: la nueva política aplica las mismas validaciones de input que la política pública y restringe `source` a los valores permitidos.
