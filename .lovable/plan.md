# Plan para corregir el clic del blog

## Problema detectado
La miniatura del blog sí activa el enlace, pero el artículo no se abre porque la estructura de rutas del blog quedó inconsistente: la lista está en `src/routes/blog.tsx` y el detalle en `src/routes/blog.$slug.tsx`, lo que puede impedir que el hijo se renderice correctamente si la ruta padre no actúa como layout/índice en esta configuración.

## Cambios a realizar

1. **Corregir la estructura de rutas del blog**
   - Revisar el archivo de la ruta de listado para que el detalle `/blog/$slug` pueda renderizarse sin bloquearse.
   - Si hace falta, convertir la lista a la convención correcta de índice (`blog.index.tsx`) para evitar conflicto entre listado y detalle.

2. **Verificar navegación tipada del listado**
   - Mantener `PostCard` con `Link to="/blog/$slug" params={{ slug }}`.
   - Confirmar que no haya superposiciones o elementos capturando el clic sobre las tarjetas.

3. **Validar el detalle del artículo**
   - Asegurar que la ruta de detalle siga cargando correctamente el post publicado.
   - Confirmar que el clic en preview abre el artículo completo.

## Resultado esperado
Al hacer clic en cualquier tarjeta o miniatura del blog, la URL debe navegar y el artículo completo debe renderizarse inmediatamente.