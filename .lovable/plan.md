## Plan de mejoras

### 1. Imagen de fondo en el Hero del Home

Usar la imagen ya existente `src/assets/hero-bogota.jpg` como fondo de la sección hero (donde está el título "Encuentra la propiedad de tus sueños en Colombia" y el buscador).

- Importar la imagen como módulo ES en `src/routes/index.tsx`.
- Aplicarla con `background-image` en la sección `<section>` del hero.
- Agregar una capa blanca semitransparente (overlay `bg-background/80` con un degradado suave hacia abajo) para preservar contraste del título, subtítulo y tarjeta de buscador sin quitar protagonismo a la imagen.
- Mantener intactos los textos, badges y el card del buscador (legibilidad garantizada).
- Usar `og:image` con la misma imagen en el `head()` del Home para mejorar el preview al compartir.

### 2. Carga rápida de "Propiedades destacadas"

Hoy el bloque depende de un `useQuery` que solo se ejecuta tras hidratar en el cliente, lo que produce el retraso visible. Cambios:

- Añadir un `loader` al route `/` que pre-cargue (`ensureQueryData`) las propiedades destacadas vía TanStack Query, de modo que vengan listas desde SSR y aparezcan instantáneamente.
- Reutilizar exactamente el mismo `queryKey` en el componente para que `useQuery` lea de caché sin re-pedir.
- Hacer el query del fallback (6 más recientes) también precargable y dispararlo en paralelo solo si destacadas viene vacío.
- Aumentar `staleTime` a 5 minutos para esta vista (el catálogo cambia poco) y desactivar refetch al enfocar la ventana.
- Reducir el SELECT a las columnas estrictamente necesarias (ya está optimizado, se mantiene).
- Bajar el placeholder skeleton a la misma cantidad esperada (3) en pantallas pequeñas para evitar parpadeo.

### 3. Flujo de login funcional y con feedback claro

Diagnóstico actual: tras `signInWithPassword` se confía en el listener `onAuthStateChange` para navegar, pero ese listener se monta en el mismo efecto y a veces el evento `SIGNED_IN` no llega antes de que el usuario perciba que "no pasó nada". Además, no hay redirección si el listener falla y los toasts se muestran muy brevemente.

Cambios:

- Tras `signInWithPassword` exitoso, navegar inmediatamente con `navigate({ to: redirect ?? "/admin/dashboard", replace: true })` sin esperar al listener (el listener se mantiene como respaldo).
- Validar que `search.redirect` sea un path interno (empieza con `/`); si es URL absoluta o externa, ignorarla y usar `/admin/dashboard`.
- Mostrar `toast.success("Bienvenido")` con duración suficiente y reemplazar el toast en error con mensajes en español ("Email o contraseña incorrectos", "Verifica tu email antes de ingresar", etc.).
- Mostrar el estado de carga en el botón ("Ingresando…") y deshabilitar el form mientras se autentica (ya está, se refuerza).
- En el `Navbar` público, si la sesión ya está activa, cambiar "Acceder" por "Ir al panel" enlazando a `/admin/dashboard`, para evitar el ciclo de ir a `/login` solo para ser redirigido.
- En `/admin` (`beforeLoad`), garantizar que el `redirect` a `/login` use solo el `pathname` (no `location.href`), para que al iniciar sesión el redirect funcione correctamente.

### Archivos a modificar

- `src/routes/index.tsx` — fondo del hero + loader de destacadas.
- `src/routes/login.tsx` — navegación inmediata, validación de `redirect`, mensajes claros.
- `src/routes/admin.tsx` — pasar `pathname` (no `href`) en el redirect.
- `src/components/layout/PublicNavbar.tsx` — botón "Acceder" / "Ir al panel" según sesión.

### Resultado esperado

- Hero con imagen de Bogotá detrás, textos y buscador perfectamente legibles.
- "Propiedades destacadas" aparecen sin retraso perceptible.
- Login muestra toast de éxito y redirige al instante a `/admin/dashboard` (o al destino solicitado). Si ya hay sesión, el navbar lleva directo al panel.
