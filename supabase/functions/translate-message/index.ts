import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_LANGS = new Set([
  "en","hi","fr","es","de","ar","zh","ja","pt","ko",
  "it","ru","nl","tr","pl","sv","ta","te","bn","gu",
  "kn","ml","mr","pa","ur","th","vi","id","ms","fil",
]);
const MAX_TEXT_LEN = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, fromLang, toLang, embed_key } = await req.json();

    if (!embed_key || typeof embed_key !== "string") {
      return new Response(JSON.stringify({ error: "Missing embed_key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!text || typeof text !== "string" || !fromLang || !toLang) {
      return new Response(JSON.stringify({ error: "Missing text, fromLang, or toLang" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_TEXT_LEN) {
      return new Response(JSON.stringify({ error: `Text exceeds ${MAX_TEXT_LEN} characters` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const from = String(fromLang).toLowerCase().slice(0, 5);
    const to = String(toLang).toLowerCase().slice(0, 5);
    if (!ALLOWED_LANGS.has(from) || !ALLOWED_LANGS.has(to)) {
      return new Response(JSON.stringify({ error: "Unsupported language code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (from === to) {
      return new Response(JSON.stringify({ translatedText: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate embed_key against DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: keyOk } = await supabase.rpc("embed_key_exists", { _embed_key: embed_key });
    if (!keyOk) {
      return new Response(JSON.stringify({ error: "Invalid embed_key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate the following text from "${from}" to "${to}" (ISO 639-1 codes). Output ONLY the translated text, no explanations, no quotes, no extra text.\n\nText: ${text}`,
            }],
          }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const translatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[translate-message] unhandled:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
