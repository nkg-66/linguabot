import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Function called, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, fromLang, toLang } = await req.json();
    console.log("Translate request:", fromLang, "->", toLang, "text length:", text?.length);

    if (!text || !fromLang || !toLang) {
      return new Response(JSON.stringify({ error: "Missing text, fromLang, or toLang" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fromLang === toLang) {
      return new Response(JSON.stringify({ translatedText: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate the following text from ${fromLang} to ${toLang}. Output ONLY the translated text, no explanations, no quotes, no extra text.\n\nText: ${text}`,
            }],
          }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    console.log("Gemini response:", JSON.stringify(geminiData));
    const translatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-message error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
