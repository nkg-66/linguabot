import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import type { ChatbotConfig } from "@/lib/supabase";

const SUPABASE_URL = "https://lttwuobnufpjvlirpndn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dHd1b2JudWZwanZsaXJwbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTc5NzAsImV4cCI6MjA5MDc3Mzk3MH0.jzPjDvkH47QjBFXsRUSRaL98MuitCostqWeZcufdchE";

const LANG_MAP: Record<string, string> = {
  hi: "hi-IN", fr: "fr-FR", es: "es-ES", de: "de-DE",
  ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", en: "en-US",
  pt: "pt-BR", ko: "ko-KR", it: "it-IT", ru: "ru-RU",
  nl: "nl-NL", tr: "tr-TR", pl: "pl-PL", sv: "sv-SE",
};

type Message = { role: "bot" | "user"; text: string; lang?: string };

export function ChatModal({ config, onClose }: { config: ChatbotConfig; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: config.greeting_message, lang: "en" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [recording, setRecording] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const callFunction = async (fnName: string, body: any, isFormData = false) => {
    const headers: Record<string, string> = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    };
    if (!isFormData) headers["Content-Type"] = "application/json";

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return res.json();
  };

  const translateText = async (text: string, fromLang: string, toLang: string): Promise<string> => {
    if (fromLang === toLang) return text;
    try {
      const data = await callFunction("translate-message", { text, fromLang, toLang });
      return data.translatedText || text;
    } catch {
      return text;
    }
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    const userLang = detectedLanguage;
    setMessages((m) => [...m, { role: "user", text: msg, lang: userLang }]);
    setLoading(true);

    try {
      // Translate user message to English if needed
      const englishMsg = await translateText(msg, userLang, "en");

      // Send to AI
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ message: englishMsg, embed_key: config.embed_key }),
      });
      const data = await res.json();
      const aiReply = data.reply || "Sorry, I couldn't process that.";

      // Translate AI response back to user's language
      const translatedReply = await translateText(aiReply, "en", userLang);
      setMessages((m) => [...m, { role: "bot", text: translatedReply, lang: userLang }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong. Please try again.", lang: "en" }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const data = await callFunction("voice-to-text", formData, true);
          if (data.transcript) {
            setInput(data.transcript);
            if (data.detectedLanguage) {
              setDetectedLanguage(data.detectedLanguage);
            }
          }
        } catch {
          toast.error("Failed to transcribe audio");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);

      // Auto-stop after 60s
      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);
    } catch {
      toast.error("Could not access microphone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const speakMessage = (text: string, lang: string, idx: number) => {
    window.speechSynthesis.cancel();

    if (speakingMsgIdx === idx) {
      setSpeakingMsgIdx(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[lang] || LANG_MAP["en"];
    utterance.onend = () => setSpeakingMsgIdx(null);
    utterance.onerror = () => setSpeakingMsgIdx(null);
    setSpeakingMsgIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md h-[600px] rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-card border">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: config.primary_color }}>
          <Bot className="h-6 w-6 text-primary-foreground" />
          <span className="font-semibold text-primary-foreground flex-1">{config.bot_name}</span>
          {detectedLanguage !== "en" && (
            <span className="text-xs bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full uppercase">
              {detectedLanguage}
            </span>
          )}
          <button onClick={onClose} className="text-primary-foreground/80 hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20" : ""}`}
                  style={m.role === "bot" ? { background: config.primary_color } : {}}
                >
                  {m.role === "bot" ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1">
                    {m.lang && m.lang !== "en" && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase font-medium">
                        {m.lang}
                      </span>
                    )}
                    {m.role === "bot" && i > 0 && (
                      <button
                        onClick={() => speakMessage(m.text, m.lang || "en", i)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors p-0.5"
                        title={speakingMsgIdx === i ? "Stop speaking" : "Read aloud"}
                      >
                        {speakingMsgIdx === i ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
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
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
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
            <Input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" disabled={loading} placeholder="Type or use mic..." />
            <Button
              type="button"
              size="icon"
              variant={recording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={loading}
              className={`shrink-0 relative ${recording ? "animate-pulse" : ""}`}
              title={recording ? "Stop recording" : "Voice input"}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {recording && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              )}
            </Button>
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="gradient-primary border-0 text-primary-foreground shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
