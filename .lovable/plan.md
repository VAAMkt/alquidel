# Arreglar el login que no redirige

## El problema

Al hacer login, el formulario termina enviándose como una navegación GET (los datos quedan visibles en la URL: `/login?email=...&password=...`) y los campos se borran sin que ocurra nada. La causa raíz es una combinación de varios factores en `src/routes/login.tsx`:

1. **El navegador cae a submit nativo del `<form>`**: si por cualquier razón el handler de React no llega a ejecutarse a tiempo, el navegador hace GET a `/login?email=...&password=...` (que es exactamente lo que el session replay muestra).
2. **Race condition con la sesión**: tras `signInWithPassword` exitoso, se llama `navigate(...)` inmediatamente, pero el `beforeLoad` de `/admin` consulta `supabase.auth.getSession()` y a veces aún no encuentra la sesión persistida → rebota de vuelta a `/login`. Esto coincide con lo que se ve en el session replay (el primer login va a un sitio, luego vuelve a `/login?redirect=/admin`).
3. **El `validateSearch` descarta `email`/`password`** silenciosamente cuando llegan en la URL, lo que hace que el segundo intento no muestre ningún error — solo "los campos se borran".

## La solución

Reescribir `src/routes/login.tsx` con un flujo robusto:

### 1. Suscribirse a `onAuthStateChange` para navegar
En lugar de navegar inmediatamente después de `signInWithPassword`, escuchar el evento `SIGNED_IN` de Supabase y navegar desde ahí. Esto garantiza que la sesión ya está persistida en `localStorage` cuando el guard de `/admin` la consulte.

```ts
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      navigate({ to: search.redirect ?? "/admin/dashboard", replace: true });
    }
  });
  return () => sub.subscription.unsubscribe();
}, []);
```

### 2. Endurecer el handler del formulario
- Añadir `method="post"` y `noValidate` al `<form>` (defensa contra submit GET nativo).
- Envolver toda la lógica del handler en `try/catch` para que ningún error sincrónico permita que el submit nativo se dispare.
- Añadir `onClick` al botón submit como respaldo extra, llamando `preventDefault` también.

### 3. Mejorar feedback de errores
- Mostrar el `error.message` real de Supabase (en español si es posible) en lugar de un genérico "Credenciales incorrectas", para que se vea claramente qué pasa cuando hay un fallo real (email no confirmado, contraseña corta, rate-limit, etc.).
- Mantener el toast.

### 4. Limpiar `email`/`password` que pudieran venir en la URL
Si la URL trae `?email=...&password=...` (porque algún submit anterior cayó a GET), limpiarlos al montar para no exponer credenciales en la barra de direcciones ni en historial:

```ts
useEffect(() => {
  const url = new URL(window.location.href);
  if (url.searchParams.has("email") || url.searchParams.has("password")) {
    url.searchParams.delete("email");
    url.searchParams.delete("password");
    window.history.replaceState({}, "", url.toString());
  }
}, []);
```

### 5. Mantener el `beforeLoad` que ya redirige si hay sesión
Eso ya está bien — solo asegurarse de que el `validateSearch` siga aceptando `redirect`.

## Resultado esperado

- Email + password correctos → toast "Bienvenido" → redirige a `/admin/dashboard` (o al `redirect` que venga en la URL).
- Email + password incorrectos → toast con el mensaje de error real, los campos NO se borran, la URL no cambia.
- Si el form llegara a caer a GET por algún motivo, las credenciales se borran de la URL al cargar para no exponerlas.
- Después del login, el guard de `/admin` ya encuentra la sesión y no rebota.

## Archivos a modificar

- `src/routes/login.tsx` — reescribir el componente con los cambios arriba.

No se necesitan cambios de DB ni de otros archivos.
