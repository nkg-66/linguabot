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
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      console.log("No audio file in request");
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Audio file size:", audioFile.size, "type:", audioFile.type);

    if (audioFile.size > 500000) {
      return new Response(JSON.stringify({ error: "Audio too large, keep recording under 10 seconds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
