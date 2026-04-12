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
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      console.log("No audio file in request");
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Audio file size:", audioFile.size, "type:", audioFile.type);

    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    
    // Use chunked approach for large arrays to avoid stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    console.log("Base64 audio length:", base64Audio.length);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "audio/webm", data: base64Audio } },
              { text: "Transcribe this audio exactly as spoken. Then on a new line write LANG: followed by the ISO 639-1 language code only. Output nothing else." },
            ],
          }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    console.log("Gemini response:", JSON.stringify(geminiData));

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let transcript = rawText.trim();
    let detectedLanguage = "en";

    const langIdx = rawText.indexOf("LANG:");
    if (langIdx !== -1) {
      transcript = rawText.substring(0, langIdx).trim();
      detectedLanguage = rawText.substring(langIdx + 5).trim().toLowerCase().slice(0, 2);
    }

    console.log("Transcript:", transcript, "Language:", detectedLanguage);

    return new Response(JSON.stringify({ transcript, detectedLanguage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-to-text error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
