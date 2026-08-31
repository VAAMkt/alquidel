import type { SVGProps } from "react";

/**
 * Imagotipo Alquidel — letra "A" con el swoosh teal.
 * Monocromo via `currentColor` para poder recolorear con className.
 * El swoosh se renderiza con `--swoosh-color` (por defecto: teal de marca).
 */
export function BrandMark({
  className,
  swooshClassName,
  title = "Alquidel",
  ...props
}: SVGProps<SVGSVGElement> & { swooshClassName?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>
      {/* Letra A — usa currentColor para adaptarse al contexto (navy o blanco) */}
      <path
        fill="currentColor"
        d="M60 12 L108 108 L86 108 L76 86 L44 86 L34 108 L12 108 Z M52 68 L68 68 L60 36 Z"
      />
      {/* Swoosh teal — curva que cruza la A */}
      <path
        className={swooshClassName ?? "text-[color:var(--brand-teal)]"}
        fill="currentColor"
        d="M22 78 C 46 60, 78 60, 102 50 C 80 78, 50 92, 22 88 Z"
        opacity="0.95"
      />
    </svg>
  );
}
