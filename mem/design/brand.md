---
name: Brand identity Alquidel
description: Logo oficial, paleta navy/teal, componente BrandLogo, usos por contexto
type: design
---
# Marca Alquidel

## Colores oficiales
- Navy `#0E2A47` — texto principal, wordmark, fondos oscuros, CTA primarios
- Teal `#1AA6B7` — swoosh del logo, acentos, focus ring, badges, enlaces activos
- Teal soft (fondos suaves)

Tokens en `src/styles.css`: `--brand-navy`, `--brand-teal`, `--brand-teal-bright`, `--brand-teal-soft`.
Mapeados a `--primary` (navy) y `--accent` (teal). El amber/dorado fue retirado.

## Logo — `<BrandLogo />`
Ubicado en `src/components/brand/BrandLogo.tsx`. Asset color en `src/assets/alquidel-logo-full.jpg.asset.json`.

Props:
- `variant`: `"full"` (imagotipo + wordmark) · `"mark"` (solo A) · `"wordmark"` (solo texto)
- `tone`: `"color"` (oficial, navy+teal) · `"light"` (mismo) · `"dark"` (texto blanco + swoosh teal, para fondos oscuros)

Usos:
- Navbar público y footer: `variant="full" tone="color"` (h-9 / h-10)
- Sidebar admin: `<BrandMark />` + texto navy
- Hero/secciones oscuras: `variant="full" tone="dark"`
- Detalles decorativos (loaders, separadores, marca de agua en tarjetas premium): `<BrandMark />` teal
- Favicon, OG, apple-touch: JPG oficial (registrados en `__root.tsx`)