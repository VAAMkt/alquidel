import { BrandMark } from "./BrandMark";
import logoFullColor from "@/assets/alquidel-logo-full.jpg.asset.json";

type Variant = "full" | "mark" | "wordmark";
type Tone = "color" | "light" | "dark";

interface Props {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  /** Texto accesible alternativo */
  alt?: string;
}

/**
 * Componente único de marca Alquidel.
 *
 * - variant="full"      → Logo horizontal completo (imagotipo + wordmark "ALQUIDEL BIENES RAÍCES")
 * - variant="mark"      → Solo la "A" con swoosh (imagotipo)
 * - variant="wordmark"  → Solo el texto "ALQUIDEL"
 *
 * - tone="color"        → Versión oficial (navy + teal) sobre fondo claro
 * - tone="light"        → Texto navy + swoosh teal (= color, alias para claridad)
 * - tone="dark"         → Texto blanco + swoosh teal (para fondos oscuros)
 */
export function BrandLogo({
  variant = "full",
  tone = "color",
  className,
  alt = "Alquidel Bienes Raíces",
}: Props) {
  // Para 'full' + 'color' usamos el JPG oficial (mejor fidelidad)
  if (variant === "full" && tone === "color") {
    return (
      <img
        src={logoFullColor.url}
        alt={alt}
        className={className}
        loading="eager"
        decoding="async"
      />
    );
  }

  // Versiones SVG (light/dark, mark, wordmark) — recoloreables
  const textColor = tone === "dark" ? "#FFFFFF" : "var(--brand-navy)";

  if (variant === "mark") {
    return (
      <BrandMark
        className={className}
        style={{ color: textColor }}
        title={alt}
      />
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{
          color: textColor,
          fontWeight: 800,
          letterSpacing: "0.04em",
          fontFamily:
            '"Urbanist", "Inter", system-ui, -apple-system, sans-serif',
        }}
      >
        ALQUIDEL
      </span>
    );
  }

  // variant="full" + tone light/dark → composición SVG + texto
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        color: textColor,
      }}
      aria-label={alt}
    >
      <BrandMark
        style={{ color: textColor, height: "1.4em", width: "auto" }}
        title={alt}
      />
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "0.04em",
            fontFamily:
              '"Urbanist", "Inter", system-ui, -apple-system, sans-serif',
            fontSize: "1.1em",
          }}
        >
          ALQUIDEL
        </span>
        <span
          style={{
            marginTop: "0.15em",
            fontSize: "0.42em",
            letterSpacing: "0.32em",
            color: "var(--brand-teal)",
            fontWeight: 500,
          }}
        >
          BIENES RAÍCES
        </span>
      </span>
    </span>
  );
}