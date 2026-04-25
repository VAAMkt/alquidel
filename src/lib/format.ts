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
  if (n <= 0) return "Precio a consultar";
  return cop.format(n);
}

/**
 * Muestra un precio para usuarios finales. Si el precio es null, undefined,
 * 0 o "0", devuelve "Precio a consultar" en lugar de "$ 0".
 */
export function displayPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return "Precio a consultar";
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n) || n <= 0) return "Precio a consultar";
  return formatCOP(n);
}

export function formatArea(m2: number | string | null | undefined): string {
  const n = typeof m2 === "string" ? Number(m2) : (m2 ?? 0);
  if (!Number.isFinite(n)) return "0 m²";
  return `${new Intl.NumberFormat("es-CO").format(n)} m²`;
}