# Plan Maestro Alquidel — ejecución por fases

Basado en el documento "Plan Maestro de SEO, Contenido y Conversión" (26 ago 2026), ajustado a lo que el proyecto ya tiene hoy.

## Estado real verificado (corrige supuestos del documento)

- `sitemap.xml` y `robots.txt` **ya existen** como rutas dinámicas (`src/routes/sitemap[.]xml.ts`, `src/routes/robots[.]txt.ts`) e incluyen propiedades y posts publicados.
- JSON-LD ya presente: `RealEstateListing` en la ficha de propiedad, `Article` en el post, `RealEstateAgent` en contacto, `WebSite` en la home, `Organization` en el root.
- `twitter:title/description` dinámicos ya existen en blog; **faltan** en la ficha de propiedad (solo hereda el genérico del root).
- `/propiedades` y `/blog` se renderizan con TanStack Start (SSR), pero los listados se cargan vía react-query en cliente: hay que confirmar qué ve el crawler.
- Falta `BreadcrumbList` en fichas y posts.
- El buscador de la home ofrece 8 ciudades y el catálogo solo Venta/Arriendo.

## Fase 0 — Indexación y base técnica (primero)

1. Añadir `twitter:title`, `twitter:description` y `twitter:card` dinámicos en la ficha de propiedad.
2. Añadir JSON-LD `BreadcrumbList` en ficha de propiedad y post de blog.
3. Asegurar que `/propiedades` y `/blog` entreguen contenido en el HTML inicial: precargar los datos en el loader de la ruta (`ensureQueryData`) para que el listado venga renderizado desde el servidor.
4. Verificar el bug reportado de "blog invisible en mobile" reproduciéndolo en el preview y corregirlo si aparece.
5. Google Search Console: conectar y verificar el dominio, enviar el sitemap (requiere tu autorización del conector).

## Fase 1 — Home que convierte

1. Mensaje: H1 "Menos búsqueda. Más criterio.", bajada "Propiedades seleccionadas. Asesoría real. Decisiones inmobiliarias con respaldo.", nueva meta description ("Compra, arrienda o invierte en Bogotá, Chía, Cajicá y Cali — con asesoría real en cada paso.").
2. Buscador: tres intenciones Comprar / Arrendar / Invertir, ciudad como lista cerrada al inventario real (Bogotá, Chía, Cajicá, Cali) y tipo de inmueble.
3. Bloque de captación de propietarios en el hero: "¿Tienes una propiedad para vender o arrendar?" con CTA doble **Quiero vender** · **Quiero arrendar**, más una página/formulario de propietarios que guarde el lead con `source: "propietario"`.
4. Señal de confianza en el hero (años de trayectoria / propiedades gestionadas / alianzas) — necesito el dato real de tu parte.
5. Renombres: "Propiedades destacadas" → "Selección Alquidel"; "¿Por qué elegirnos?" → "¿Por qué Alquidel?"; "Ver propiedades" → "Explorar propiedades"; "Publicar propiedad" → "Quiero vender / Quiero arrendar".
6. Reordenar la home según la estructura propuesta (hero, buscador, selección, experiencia, propietarios, diferencial, contenido) y subir el blog en el orden mobile.
7. Eventos de medición: clic en WhatsApp, envío de formulario, clic en "Quiero vender/arrendar" y "Solicitar visita".

## Fase 2 — Páginas hiperlocales y contenido

1. Ruta dinámica de landing por zona (`/inmuebles/$zona`), cada una con H1 geolocalizado, 300-500 palabras propias sobre la zona, listado filtrado real y CTA a asesor. Prioridad: Chía campestre, Cajicá conjunto cerrado, amoblado Chicó/Rosales/La Cabrera, oficinas Granada (Cali), arriendo Cajicá/Chía Fontanar.
2. Incluir esas landings en el sitemap y enlazarlas desde el footer y el catálogo.
3. Banco de artículos de blog del documento (20 títulos), cada uno con CTA a asesor — se publica solo después de confirmar indexación en Fase 0.

## Fase 3 — Autoridad

Cluster para inversionista extranjero (posible bilingüe), informe propio de datos por zona, series de video por zona. Se planifica al cerrar la Fase 2.

## Fuera de código (equipo Alquidel)

Google Business Profile, campaña de reseñas (meta 20 en 90 días), NAP consistente en directorios, registro de cierres en CRM.

## Notas técnicas

- Landings hiperlocales como ruta con parámetro + tabla/const de configuración por zona, para no duplicar componentes.
- Canonical y `og:url` autorreferenciales en cada landing nueva; entrada en el sitemap dinámico.
- Formulario de propietarios reutiliza la tabla `leads` con un `source` propio; sin cambios de esquema salvo que quieras campos extra.
- Eventos de medición: capa ligera propia sobre `window.dataLayer`/GA4 si decides usar GA4.

## Propuesta de arranque

Empezar por la **Fase 0 completa** y la **Fase 1 puntos 1-3 y 5** en la primera iteración; el resto en iteraciones siguientes.
