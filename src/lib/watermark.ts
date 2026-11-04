// Aplica una marca de agua "ALQUIDEL" pequeña en la esquina inferior derecha
// usando canvas del navegador. Solo JPG, PNG y WEBP. Nunca devuelve el original.
export const WATERMARK_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function watermarkImage(file: File): Promise<Blob> {
  if (!(WATERMARK_TYPES as readonly string[]).includes(file.type)) {
    throw new Error(`Formato no soportado (${file.name}). Usa JPG, PNG o WEBP.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`No se pudo leer la imagen ${file.name}`));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no permite procesar imágenes");
    ctx.drawImage(img, 0, 0, w, h);

    const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.035));
    const margin = Math.round(fontSize * 0.8);
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.round(fontSize * 0.3);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("ALQUIDEL", w - margin, h - margin);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.9),
    );
    if (!blob) throw new Error(`No se pudo aplicar la marca de agua a ${file.name}`);
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
