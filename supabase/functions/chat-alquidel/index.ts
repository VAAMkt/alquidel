// Public chat endpoint for "Alquibot" — Alquidel's AI assistant.
// Uses Lovable AI Gateway (no extra API key required).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatCOP(value: number): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString("es-CO")}`;
  }
}

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Detect Colombian mobile (10 digits starting with 3) anywhere in text. */
function extractPhone(text: string): string | null {
  const cleaned = text.replace(/[\s().-]/g, "");
  const match = cleaned.match(/3\d{9}/);
  return match ? match[0] : null;
}

/** Heuristic name extraction: look for "soy <Nombre>", "me llamo <Nombre>",
 *  "mi nombre es <Nombre>", or first capitalized word(s) at start. */
function extractName(text: string): string | null {
  const patterns = [
    /\b(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/i,
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1] && m[1].length >= 2 && m[1].length <= 80) {
      return m[1].trim();
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userMessage = (body.message ?? "").toString().trim();
  if (!userMessage || userMessage.length > 1000) {
    return json({ error: "message es requerido (máx 1000 chars)" }, 400);
  }
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-10)
    : [];

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return json({ error: "AI no configurado" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // 1. Cargar catálogo
  let catalogText = "(no hay propiedades disponibles en este momento)";
  try {
    const { data: properties } = await supabase
      .from("properties")
      .select(
        "id, slug, title, type, property_type, price, area_m2, bedrooms, bathrooms, city, neighborhood, description, amenities",
      )
      .eq("status", "disponible")
      .limit(20);

    if (properties && properties.length > 0) {
      catalogText = properties
        .map((p, i) => {
          const desc = (p.description ?? "").slice(0, 140);
          const amen = Array.isArray(p.amenities)
            ? (p.amenities as string[]).slice(0, 4).join(", ")
            : "";
          const ubic = p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city;
          return `${i + 1}. [${p.type.toUpperCase()}] ${p.title} — ${p.property_type} en ${ubic}. ${formatCOP(Number(p.price))}. ${p.area_m2} m², ${p.bedrooms} hab, ${p.bathrooms} baños. ${amen ? `Amenidades: ${amen}. ` : ""}${desc}`;
        })
        .join("\n");
    }
  } catch (e) {
    console.error("Error cargando catálogo:", e);
  }

  const systemPrompt = `Eres "Alquibot", el asistente virtual de Alquidel Bienes Raíces, inmobiliaria premium colombiana.
Ayudas a clientes a encontrar propiedades en Colombia (venta y arriendo).
Responde siempre en español colombiano, cálido y profesional. Usa tuteo. Sé conciso (máximo 3 párrafos por respuesta).
Precios siempre en pesos colombianos con puntos de miles.

CATÁLOGO ACTUAL DISPONIBLE:
${catalogText}

INSTRUCCIONES:
- Si el usuario pregunta por propiedades, recomienda máximo 2-3 del catálogo arriba.
- Menciona siempre precio, área y ciudad de cada propiedad recomendada.
- Si el usuario muestra interés concreto en una propiedad, pídele:
  "Para conectarte con un asesor necesito tu nombre y número de celular."
- Si en el mismo mensaje el usuario te da nombre + celular, responde confirmando que un asesor lo contactará pronto.
- NO inventes propiedades que no estén en el catálogo.
- NO des información de precios que no esté en el catálogo.
- Para agendar visitas: indica que debe llamar al 321 491 0400.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  // 2. Llamar a Lovable AI Gateway con timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let reply = "";
  try {
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return json(
          {
            reply:
              "Estamos recibiendo muchas consultas en este momento. Intenta de nuevo en unos segundos, o escríbenos directamente al WhatsApp 321 491 0400.",
            lead_captured: false,
          },
          200,
        );
      }
      if (aiResp.status === 402) {
        return json(
          {
            reply:
              "El asistente no está disponible temporalmente. Por favor escríbenos al WhatsApp 321 491 0400 y un asesor te ayudará.",
            lead_captured: false,
          },
          200,
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiJson = await aiResp.json();
    reply = aiJson?.choices?.[0]?.message?.content ?? "";
    if (!reply) {
      reply =
        "No pude generar una respuesta en este momento. ¿Puedes reformular tu pregunta?";
    }
  } catch (err) {
    console.error("AI request failed:", err);
    return json(
      {
        reply:
          "Tuvimos un problema al contactar al asistente. Por favor intenta de nuevo o escríbenos al WhatsApp 321 491 0400.",
        lead_captured: false,
      },
      200,
    );
  } finally {
    clearTimeout(timeout);
  }

  // 3. Detección de captura de lead
  let lead_captured = false;
  const phone = extractPhone(userMessage);
  const name = extractName(userMessage);
  const conversationMentionsAdvisor =
    /asesor|contactar|llamada|me\s+contacten|cont[aá]ctenme/i.test(reply) ||
    /asesor|contactar|llamada|que me llamen|que me contacten/i.test(
      history.map((h) => h.content).join(" "),
    );

  if (phone && name && conversationMentionsAdvisor) {
    try {
      await supabase.from("leads").insert({
        name,
        email: `chat+${phone}@alquidel.local`,
        phone,
        source: "chat",
        status: "nuevo",
        message: `Lead desde chatbot. Último mensaje: ${userMessage.slice(0, 500)}`,
      });
      lead_captured = true;
    } catch (e) {
      console.error("Error insertando lead desde chat:", e);
    }
  }

  return json({ reply, lead_captured });
});