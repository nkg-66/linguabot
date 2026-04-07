import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Bot, User } from "lucide-react";
import type { ChatbotConfig } from "@/lib/supabase";

type Message = { role: "bot" | "user"; text: string };

export function ChatModal({ config, onClose }: { config: ChatbotConfig; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: config.greeting_message }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("https://lttwuobnufpjvlirpndn.supabase.co/functions/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, embed_key: config.embed_key }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.reply || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md h-[600px] rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-card border">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: config.primary_color }}>
          <Bot className="h-6 w-6 text-primary-foreground" />
          <span className="font-semibold text-primary-foreground flex-1">{config.bot_name}</span>
          <button onClick={onClose} className="text-primary-foreground/80 hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20" : ""}`} style={m.role === "bot" ? { background: config.primary_color } : {}}>
                  {m.role === "bot" ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4 text-primary" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: config.primary_color }}>
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" disabled={loading} />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="gradient-primary border-0 text-primary-foreground shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
