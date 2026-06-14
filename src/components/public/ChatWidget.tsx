import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMPANY } from "@/lib/company";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "alquibot_history";
const SEEN_KEY = "alquibot_seen";
const WELCOME: Msg = {
  role: "assistant",
  content:
    "¡Hola! Soy Alquibot 👋 el asistente virtual de Alquidel. Puedo ayudarte a encontrar propiedades en Colombia según tu presupuesto y necesidades. ¿Qué tipo de inmueble buscas?",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hidratar historial y badge
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const seen = sessionStorage.getItem(SEEN_KEY);
      if (!seen) setShowBadge(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persistir historial
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {
      // ignore
    }
  }, [messages, hydrated]);

  // Auto-scroll al final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, open]);

  function openChat() {
    setOpen(true);
    setShowBadge(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    if (messages.length === 0) {
      setMessages([WELCOME]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;
    const userMsg: Msg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setIsSending(true);
    setLeadCaptured(false);

    // Timeout cliente: 15s. Si la red se cuelga, mostramos mensaje amigable.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-alquidel`;
      // Enviar todo el historial excepto el último mensaje de usuario (lo manda como `message`)
      const history = nextHistory.slice(0, -1);
      const resp = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await resp.json();
      const reply: string =
        typeof data?.reply === "string"
          ? data.reply
          : "No pude generar una respuesta. Intenta de nuevo.";
      const captured: boolean = !!data?.lead_captured;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setLeadCaptured(captured);
    } catch (e: unknown) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (typeof e === "object" && e !== null && "name" in e && (e as any).name === "AbortError");
      const errorMsg = aborted
        ? "Lo siento, intenta de nuevo en un momento."
        : "Ocurrió un error al contactar al asistente. Por favor escríbenos al WhatsApp 321 491 0400.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMsg,
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Escape global cierra el chat
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Abrir chat con Alquibot"
          className="no-print group fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg transition-transform hover:scale-105 hover:bg-slate-900"
          title="¿En qué te ayudamos?"
        >
          <MessageCircle className="h-6 w-6" />
          {showBadge && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-[color:var(--brand-teal)] text-[11px] font-bold text-white">
              1
            </span>
          )}
        </button>
      )}

      {/* Panel abierto */}
      {open && (
        <div
          className="no-print fixed bottom-6 right-6 z-50 flex h-[calc(100vh-3rem)] max-h-[520px] w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          role="dialog"
          aria-label="Chat con Alquibot"
          aria-modal="false"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-slate-800 px-4 py-3 text-white">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-teal)] text-sm font-bold text-white">
              A
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">Alquibot</p>
              <p className="text-xs text-slate-300">Asistente de Alquidel</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
              aria-label="Cerrar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug ${
                    m.role === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-1 rounded-2xl bg-zinc-100 px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                </div>
              </div>
            )}
            {leadCaptured && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                ✓ Un asesor te contactará pronto
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu mensaje…"
                disabled={isSending}
                maxLength={1000}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                onClick={send}
                disabled={isSending || !input.trim()}
                className="bg-slate-800 hover:bg-slate-900"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Footer fijo */}
          <a
            href={COMPANY.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border-t border-border bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Phone className="h-3.5 w-3.5" />
            Hablar con asesor por WhatsApp
          </a>
        </div>
      )}
    </>
  );
}