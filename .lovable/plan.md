
# Identidad de marca Alquidel

Aplicar el logo real y los colores corporativos (navy + teal) en toda la plataforma, con variantes para fondos claros y oscuros, y una marca gráfica ("A" + swoosh) reutilizable como imagotipo.

## 1. Assets del logo

Subir el logo aportado a Lovable Assets y crear variantes:

- `logo-alquidel-full.png` — versión horizontal completa (la que enviaste), para fondo claro.
- `logo-alquidel-full-dark.svg` — misma composición con texto en blanco y swoosh teal, para fondo oscuro (footer, hero overlay).
- `logo-alquidel-mark.svg` — solo la "A" con el swoosh teal (imagotipo) en versiones:
  - teal sobre transparente (uso general)
  - blanco sobre transparente (sobre fondo navy/foto)
  - navy sobre transparente (detalles sobre fondo claro)
- `favicon.svg` / `favicon-32.png` / `apple-touch-icon.png` — generados a partir del imagotipo "A".
- `og-image.jpg` — 1200×630 con la "A" + wordmark sobre fondo navy degradado, para compartir en redes.

Los SVG monocromos se construyen reconstruyendo el path del imagotipo en código (no recortes del JPG) para mantener nitidez.

## 2. Paleta corporativa (tokens en `src/styles.css`)

Reemplazar la paleta actual (slate-700 + amber) por:

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--brand-navy` | `#0E2A47` | igual | Texto wordmark, primario |
| `--brand-teal` | `#1AA6B7` | `#3FC4D4` | Swoosh, acentos, CTA secundario |
| `--brand-teal-soft` | `#E6F6F8` | `#0F3A42` | Fondos suaves, chips |
| `--primary` | navy | navy claro | botones principales |
| `--accent` | teal | teal | enlaces activos, badges, focus ring |
| `--ring` | teal | teal | focus accesible |

Eliminar el amber/dorado (ya no es marca). Actualizar `--sidebar-*`, `--chart-*` para que los charts del admin usen variaciones navy/teal coherentes.

## 3. Uso del logo por contexto

- **Navbar público** (`PublicNavbar.tsx`): reemplazar el texto "ALQUIDEL" actual por `<img src={logoFull} />` (altura 36px). En móvil, usar solo el imagotipo "A".
- **Footer** (`PublicFooter.tsx`): versión "dark" del logo completo (texto blanco, swoosh teal) sobre fondo navy o blanco según diseño actual.
- **Admin Sidebar**: imagotipo "A" + wordmark compacto.
- **Favicon / OG / Apple touch**: registrar en `__root.tsx` head().
- **Hero / detalles especiales**: el imagotipo "A" teal como elemento decorativo (marca de agua sutil en tarjetas destacadas, separador entre secciones, loader spinner).
- **Email/PDF impresión**: logo full color en la ficha imprimible de propiedad.

## 4. Componente `<BrandLogo />`

Crear `src/components/brand/BrandLogo.tsx` con props:

```tsx
<BrandLogo variant="full" | "mark" | "wordmark"
           tone="color" | "light" | "dark"
           className="h-9" />
```

Centraliza qué archivo se sirve y evita que cada vista importe rutas distintas. Todas las pantallas (navbar, footer, sidebar, login, 404) lo consumen.

## 5. Limpieza

- Quitar el "punto amber" decorativo (`bg-accent rounded-full`) actual del navbar/footer — se sustituye por el logo real.
- Revisar componentes que usan `text-amber-*` o el viejo `--accent` dorado y migrar al teal.
- Actualizar `mem://index.md` con la nueva regla de marca (paleta + uso del logo).

## Archivos a tocar

- `src/styles.css` — tokens de color
- `src/components/brand/BrandLogo.tsx` *(nuevo)*
- `src/components/layout/PublicNavbar.tsx`
- `src/components/layout/PublicFooter.tsx`
- `src/components/layout/AdminSidebar.tsx`
- `src/routes/__root.tsx` — favicon, og:image, theme-color
- `src/assets/brand/*` — pointers a Lovable Assets (logo full, mark, dark)
- `mem://index.md` + `mem://design/brand`

## Nota técnica
El JPG adjunto se sube tal cual como versión "full color sobre blanco". Las variantes monocromas (blanco para fondo oscuro, solo-A) se entregan como SVG vectoriales generados para conservar calidad a cualquier tamaño y permitir recolorearlas vía `currentColor`.
