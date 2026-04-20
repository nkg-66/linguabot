import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_AUDIO_MIMES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const embed_key = formData.get("embed_key") as string | null;

    if (!embed_key) {
      return new Response(JSON.stringify({ error: "Missing embed_key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseMime = (audioFile.type || "").split(";")[0].trim().toLowerCase();
    if (baseMime && !ALLOWED_AUDIO_MIMES.includes(baseMime)) {
      return new Response(JSON.stringify({ error: `Unsupported audio type: ${baseMime}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (audioFile.size > 500000) {
      return new Response(JSON.stringify({ error: "Audio too large, keep recording under 10 seconds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    console.log("Base64 audio length:", base64Audio.length);
    console.log("Calling Gemini...");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: "audio/webm;codecs=opus",
                data: base64Audio,
              },
            },
            {
              text: "Listen to this audio recording carefully. Write down exactly what the person says word for word. After the transcription, write on a new line: LANG: and then the 2-letter ISO language code (like en, hi, fr, es, de, ar, ta, te, bn). If you cannot hear anything or the audio is silent, write SILENT on the first line. Output nothing else.",
            },
          ],
        }],
        generationConfig: {
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    console.log("Full Gemini response:", JSON.stringify(result, null, 2));
    console.log("Finish reason:", result.candidates?.[0]?.finishReason);
    console.log("Safety ratings:", JSON.stringify(result.candidates?.[0]?.safetyRatings));

    let transcript = "";
    let detectedLanguage = "en";
    let errorMessage: string | null = null;

    const content = result.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    const finishReason = result.candidates?.[0]?.finishReason as string | undefined;

    if (content) {
      const lines = content.trim().split("\n");
      transcript = lines[0]?.trim() || "";
      if (lines.length > 1 && lines[1].startsWith("LANG:")) {
        detectedLanguage = lines[1].substring(5).trim().toLowerCase().slice(0, 2) || "en";
      }
    }

    if (!transcript || transcript === "SILENT" || finishReason === "SAFETY" || finishReason === "MAX_TOKENS") {
      if (finishReason === "SAFETY") {
        errorMessage = "Content filtered by safety settings.";
      } else if (finishReason === "MAX_TOKENS") {
        errorMessage = "Response truncated due to token limit.";
      } else {
        errorMessage = "No speech detected";
      }

      return new Response(JSON.stringify({ transcript: "", detectedLanguage: "en", error: errorMessage }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ transcript, detectedLanguage, error: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[voice-to-text] unhandled:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
