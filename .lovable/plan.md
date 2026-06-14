# Plan: Logo transparente Alquidel + tamaño doble

## Problema
1. El logo actual es un JPG con fondo blanco (se ve un rectángulo blanco sobre la barra).
2. El usuario subió la versión PNG sin fondo (transparente) — debemos usar esa.
3. El logo se ve pequeño. Hay que duplicar el tamaño en navbar y footer.
4. Los cambios anteriores parecen haberse perdido (probablemente porque el navegador cacheaba el JPG anterior, o el componente seguía usando el asset viejo). Esta vez sustituimos el asset por completo para que sea permanente.

## Cambios

### 1. Subir el PNG transparente como asset oficial
- `lovable-assets create --file /mnt/user-uploads/PHOTO-2026-06-14-10-16-45-removebg-preview.png --filename alquidel-logo.png`
- Guardar el pointer en `src/assets/alquidel-logo.png.asset.json` (nuevo archivo, PNG transparente).
- Eliminar el antiguo `src/assets/alquidel-logo-full.jpg.asset.json` para que ninguna referencia residual lo use.

### 2. Actualizar `BrandLogo.tsx`
- Importar `alquidel-logo.png.asset.json` en lugar del JPG.
- El PNG transparente sirve tanto sobre fondo claro como oscuro (logo navy+teal funciona sobre blanco; para fondos muy oscuros mantenemos la composición SVG `tone="dark"`).

### 3. Duplicar tamaño del logo
- Navbar (`PublicNavbar.tsx`): `h-9` → `h-16` y altura del header `h-16` → `h-24` para acomodar.
- Footer (`PublicFooter.tsx`): `h-10` → `h-20`.
- Favicon/OG/apple-touch en `__root.tsx`: apuntar al nuevo PNG.

### 4. Limpieza
- Borrar el archivo JSON del JPG viejo (`src/assets/alquidel-logo-full.jpg.asset.json`).
- Actualizar la memoria `mem/design/brand.md` para reflejar el nuevo asset PNG transparente y los tamaños.

## Archivos a tocar
- **Nuevo**: `src/assets/alquidel-logo.png.asset.json`
- **Eliminar**: `src/assets/alquidel-logo-full.jpg.asset.json`
- **Editar**: `src/components/brand/BrandLogo.tsx`, `src/components/layout/PublicNavbar.tsx`, `src/components/layout/PublicFooter.tsx`, `src/routes/__root.tsx`, `mem/design/brand.md`

## Nota sobre permanencia
Una vez sustituido el asset y los `className` de altura, el cambio queda en código. Si tras desplegarlo todavía se ve el logo viejo, será caché del navegador — basta un hard refresh (Cmd/Ctrl+Shift+R).
