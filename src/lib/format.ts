/**
 * Helpers de formato para Colombia: precios en COP y áreas en m².
 */
const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "$ 0";
  return cop.format(n);
}

export function formatArea(m2: number | string | null | undefined): string {
  const n = typeof m2 === "string" ? Number(m2) : (m2 ?? 0);
  if (!Number.isFinite(n)) return "0 m²";
  return `${new Intl.NumberFormat("es-CO").format(n)} m²`;
}