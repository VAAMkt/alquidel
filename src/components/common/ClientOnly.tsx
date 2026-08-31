import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only on the client (after hydration).
 * Use for components that depend on window, document, or localStorage.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
