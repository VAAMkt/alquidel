# Auditoría web de Alquidel

Fecha: 2026-08-30  
Alcance: sitio público, portada móvil, compatibilidad Safari/WebKit, rendimiento de carga, accesibilidad básica y salud del build.

## Resumen ejecutivo

La portada publicada abre correctamente en Chromium y en WebKit 26.5 (motor usado como aproximación a Safari) y no produjo errores de consola en la prueba Chromium. No se pudo reproducir una pantalla en blanco en las versiones actuales.

Sí había dos riesgos creíbles para Safari: el build no declaraba una versión mínima y seguía el objetivo móvil de Vite (Safari 16 en la versión instalada), y la inicialización global de Supabase podía fallar cuando Safari bloquea `localStorage` o lo deja sin cuota. Ambos quedan corregidos, con soporte explícito desde Safari/iOS 15.4. Safari 15.3 o anterior no queda garantizado porque la hoja de estilos usa OKLCH y el stack actual es React 19.

La mayor limitación de rendimiento que permanece es el paquete base: 763.757 bytes sin comprimir / 225.144 bytes transferidos con compresión en producción. El code-splitting por ruta sí funciona: el dashboard administrativo (111 KB gzip en el build local) no se descarga con la portada.

## Mediciones del sitio publicado

Muestras tomadas desde Bogotá contra `https://alquidel.com/`:

| Señal | Resultado |
| --- | ---: |
| HTML | 82.481 B sin comprimir / 13.392 B transferidos |
| TTFB, 3 muestras | 1,00–1,52 s |
| JavaScript base | 763.757 B / 225.144 B transferidos |
| CSS | 114.454 B / 19.483 B transferidos |
| Hero | 265.223 B |
| Caché del HTML | `no-cache, must-revalidate, max-age=0` |
| Caché de assets versionados | 1 año, `immutable` |

La API pública de PageSpeed no entregó un reporte por límite de cuota. Por eso no se inventan puntajes Lighthouse; las cifras anteriores provienen de transferencias y builds reales.

## Hallazgos priorizados

### P0 — Compatibilidad Safari

- Corregido: el target del build queda fijado en `safari15.4`, evitando que una futura actualización de Vite eleve silenciosamente el mínimo.
- Corregido: la persistencia de autenticación usa memoria como fallback si `localStorage` lanza `SecurityError` o `QuotaExceededError`, casos asociados a navegación privada o almacenamiento bloqueado.
- Corregido: `matchMedia` conserva el fallback `addListener/removeListener` para WebKit antiguo en el panel administrativo.
- Corregido: el chat usa `100dvh` cuando está disponible y respeta `safe-area-inset-*`; conserva `100vh` como fallback.
- Verificado: producción y versión local abrieron en WebKit con viewport iPhone 13.

### P1 — Rendimiento

- Corregido: la imagen hero ahora se precarga desde el HTML. Antes solo se precargaba el logo, aunque el hero era la imagen crítica visible.
- Corregido: el logo declara dimensiones intrínsecas 526×155 para reservar su proporción antes de descargarlo.
- Corregido: `package-lock.json` vuelve a estar sincronizado. Antes `npm ci` fallaba y el build no era reproducible.
- Pendiente: el paquete base sigue en ~232 KB gzip en el build local. Supabase Auth y proveedores globales se cargan en todas las páginas. La siguiente mejora de alto impacto es mover autenticación al árbol `/admin` y servir las consultas públicas mediante funciones de servidor; requiere una refactorización separada y pruebas de sesión.
- Pendiente: el HTML público tarda alrededor de 1 s antes del primer byte y no se cachea. Se recomienda cachear respuestas públicas durante 30–60 s con `stale-while-revalidate`, excluyendo login/admin y cualquier respuesta personalizada. Debe configurarse junto con Lovable/Cloudflare para no cachear sesiones.
- Pendiente: convertir el hero JPEG a AVIF/WebP y generar variantes responsivas. No se hizo automáticamente para evitar cambiar calidad visual sin revisión de marca.

### P1 — UX y accesibilidad

- Corregido: el documento ahora declara `lang="es-CO"` en vez de `en`.
- Corregido: WhatsApp, menú móvil, favorito y comparar pasan de 32–36 px a 44×44 px en móvil.
- Verificado: no hay desbordamiento horizontal a 375 px.
- Pendiente: el botón flotante de Alquibot puede cubrir temporalmente campos/CTA al desplazarse en móvil. Conviene decidir si se oculta mientras el buscador está visible o se integra al menú móvil.

### P2 — Calidad del proyecto

- El build de producción termina correctamente y conserva chunks por ruta.
- TypeScript y las reglas de código del lint en los archivos modificados pasan; el chequeo de formato heredado se reporta por separado.
- El lint global sigue fallando por 1.054 errores y 14 advertencias preexistentes, principalmente formato en formularios administrativos y usos de `any`. Se evitó un reformateo masivo para mantener el cambio revisable.
- `npm run preview` local busca `dist/server/server.js`, mientras el build local de Nitro escribe `.output/`; el modo `npm run dev` sí funciona. Conviene alinear el script de preview con el preset de despliegue usado por Lovable.

## Validación realizada

- `npm install`: correcto; lockfile actualizado.
- `npx tsc --noEmit`: correcto.
- ESLint focalizado en los archivos modificados (sin el chequeo de formato heredado): correcto.
- `npm run build`: correcto.
- Navegación local a 375 px: correcta, sin overflow.
- WebKit 26.5, perfil iPhone 13: producción y versión local renderizan la portada.

## Recomendación de despliegue

Publicar primero este cambio como una versión de compatibilidad. Después del despliegue, probar en:

1. iPhone con Safari normal y navegación privada.
2. Un dispositivo con iOS 15.4–16 si todavía representa tráfico real.
3. Login de asesores, favoritos, comparar y Alquibot.
4. PageSpeed/Lighthouse móvil desde CI o una cuenta con cuota, guardando LCP, INP, CLS y TTFB como línea base.
