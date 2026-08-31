import { supabase } from "./client";

/**
 * Patches window.fetch (browser only) so that any request to TanStack Start's
 * `_serverFn/*` endpoints automatically carries the current Supabase access
 * token in the `Authorization` header. This lets the `requireSupabaseAuth`
 * middleware identify the calling user without each caller passing the token.
 */
let installed = false;

export function installServerFnAuthFetch() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url && url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // Fall through to original fetch on any error
    }
    return originalFetch(input, init);
  };
}