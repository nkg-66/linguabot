(function () {
  if (window.__LinguaBotWidgetMounted) return;
  window.__LinguaBotWidgetMounted = true;

  var EMBED_KEY = window.ChatbotKey;
  if (!EMBED_KEY) {
    console.error("LinguaBot: Missing window.ChatbotKey");
    return;
  }

  var SUPA_BASE = "https://lttwuobnufpjvlirpndn.supabase.co/functions/v1";
  var API_URL = SUPA_BASE + "/chat";
  var VOICE_URL = SUPA_BASE + "/voice-to-text";
  var TRANSLATE_URL = SUPA_BASE + "/translate-message";
  var CONFIG_URL = SUPA_BASE + "/get-widget-config";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dHd1b2JudWZwanZsaXJwbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTc5NzAsImV4cCI6MjA5MDc3Mzk3MH0.jzPjDvkH47QjBFXsRUSRaL98MuitCostqWeZcufdchE";
  var LANG_MAP = {
    hi: "hi-IN", fr: "fr-FR", es: "es-ES", de: "de-DE", ar: "ar-SA", zh: "zh-CN",
    ja: "ja-JP", en: "en-US", pt: "pt-BR", ko: "ko-KR", it: "it-IT", ru: "ru-RU",
    nl: "nl-NL", tr: "tr-TR", pl: "pl-PL", sv: "sv-SE"
  };

  var state = {
    config: null,
    isOpen: false,
    detectedLanguage: "en",
    recording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingTimer: null,
    speakingButton: null,
  };

  var BOT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
  var USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var MIC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/></svg>';
  var MIC_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 1 19 14v2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M12 19v3"/><path d="M9 2.13A3 3 0 0 1 15 5v5"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  var VOLUME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  var VOLUME_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>';

  function hexToRgb(hex) {
    if (!hex) return { r: 108, g: 99, b: 255 };
    var normalized = String(hex).trim().replace("#", "");
    if (normalized.length === 3) {
      normalized = normalized.split("").map(function (c) { return c + c; }).join("");
    }
    var valid = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "6c63ff";
    return {
      r: parseInt(valid.slice(0, 2), 16),
      g: parseInt(valid.slice(2, 4), 16),
      b: parseInt(valid.slice(4, 6), 16),
    };
  }

  function toast(message) {
    var el = shadow.getElementById("lb-toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  var host = document.createElement("div");
  host.id = "lb-widget-host";
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: "open" });

  function buildShell(config) {
    var color = config.primary_color || "#6c63ff";
    var rgb = hexToRgb(color);
    var voiceEnabled = config.voice_enabled !== false;

    shadow.innerHTML = "";

    var style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
      :host, * { box-sizing: border-box; }
      #lb-root {
        --lb-bot-color: ${color};
        --lb-bot-tint: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2);
        --lb-app-primary: hsl(243 95% 57%);
        --lb-app-primary-foreground: hsl(0 0% 100%);
        --lb-muted: hsl(230 20% 95%);
        --lb-muted-foreground: hsl(230 10% 46%);
        --lb-border: hsl(230 20% 90%);
        --lb-foreground: hsl(230 25% 12%);
        --lb-gradient-primary: linear-gradient(135deg, hsl(243 95% 57%), hsl(168 90% 43%));
        font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
        color: var(--lb-foreground);
      }
      button, input { font: inherit; }
      #lb-widget-btn {
        position: fixed; right: 24px; bottom: 24px; z-index: 2147483646;
        width: 56px; height: 56px; border: none; border-radius: 999px;
        background: var(--lb-gradient-primary); color: white; cursor: pointer;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 0.2s ease;
      }
      #lb-widget-btn:hover { transform: scale(1.06); }
      #lb-widget-btn svg { width: 24px; height: 24px; }
      #lb-widget-window {
        position: fixed; right: 24px; bottom: 92px; z-index: 2147483646;
        width: min(100vw - 32px, 448px); height: min(calc(100vh - 120px), 600px);
        border-radius: 16px; overflow: hidden; display: none; flex-direction: column;
        background: white; border: 1px solid var(--lb-border); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.28);
      }
      #lb-widget-window.open { display: flex; }
      #lb-header {
        padding: 12px 16px; display: flex; align-items: center; gap: 12px;
        background: var(--lb-bot-color); color: white;
      }
      #lb-header-main-icon {
        width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; color: white;
      }
      #lb-header-main-icon svg { width: 24px; height: 24px; }
      #lb-title {
        flex: 1; font-size: 16px; font-weight: 600; line-height: 1.2; color: white;
      }
      #lb-header-lang {
        display: none; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.2);
        font-size: 11px; font-weight: 600; text-transform: uppercase; color: white;
      }
      #lb-close {
        border: none; background: transparent; color: rgba(255,255,255,0.8); cursor: pointer;
        width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; padding: 0;
      }
      #lb-close:hover { color: white; }
      #lb-close svg { width: 18px; height: 18px; }
      #lb-messages {
        flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: white;
      }
      .lb-row { display: flex; }
      .lb-row.user { justify-content: flex-end; }
      .lb-row.bot, .lb-row.error { justify-content: flex-start; }
      .lb-bubble-wrap { display: flex; align-items: flex-start; gap: 8px; max-width: 80%; }
      .lb-row.user .lb-bubble-wrap { flex-direction: row-reverse; }
      .lb-avatar {
        width: 28px; height: 28px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .lb-avatar.bot, .lb-avatar.error { background: var(--lb-bot-color); color: white; }
      .lb-avatar.user { background: var(--lb-bot-tint); color: var(--lb-app-primary); }
      .lb-avatar svg { width: 15px; height: 15px; }
      .lb-content { display: flex; flex-direction: column; gap: 4px; }
      .lb-bubble {
        border-radius: 16px; padding: 10px 16px; font-size: 14px; line-height: 1.45; word-break: break-word;
      }
      .lb-bubble.bot { background: var(--lb-muted); color: var(--lb-foreground); }
      .lb-bubble.user { background: var(--lb-app-primary); color: var(--lb-app-primary-foreground); }
      .lb-bubble.error { background: hsl(0 100% 96%); color: hsl(0 70% 42%); }
      .lb-meta { min-height: 14px; display: flex; align-items: center; gap: 6px; }
      .lb-lang-badge {
        padding: 2px 6px; border-radius: 999px; background: var(--lb-muted); color: var(--lb-muted-foreground);
        font-size: 10px; font-weight: 600; text-transform: uppercase;
      }
      .lb-speak-btn {
        border: none; background: transparent; color: color-mix(in srgb, var(--lb-muted-foreground) 65%, white);
        display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
      }
      .lb-speak-btn:hover { color: var(--lb-muted-foreground); }
      .lb-speak-btn svg { width: 14px; height: 14px; }
      #lb-loading {
        display: none; align-items: center; gap: 8px;
      }
      #lb-loading.show { display: flex; }
      #lb-loading-avatar {
        width: 28px; height: 28px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
        background: var(--lb-bot-color); color: white; flex-shrink: 0;
      }
      #lb-loading-avatar svg { width: 15px; height: 15px; }
      #lb-loading-bubble {
        background: var(--lb-muted); border-radius: 16px; padding: 14px 16px; display: inline-flex; gap: 4px;
      }
      .lb-dot {
        width: 8px; height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--lb-muted-foreground) 55%, white);
        animation: lb-bounce 1.2s infinite ease-in-out;
      }
      .lb-dot:nth-child(2) { animation-delay: 0.15s; }
      .lb-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes lb-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
        40% { transform: translateY(-4px); opacity: 1; }
      }
      #lb-input-bar {
        padding: 12px; border-top: 1px solid var(--lb-border); background: white;
      }
      #lb-form { display: flex; gap: 8px; }
      #lb-input {
        flex: 1; width: 100%; height: 40px; border-radius: 6px; border: 1px solid var(--lb-border);
        background: white; color: var(--lb-foreground); padding: 8px 12px; outline: none;
      }
      #lb-input::placeholder { color: var(--lb-muted-foreground); }
      #lb-input:focus {
        border-color: var(--lb-app-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lb-app-primary) 22%, white);
      }
      .lb-icon-btn {
        width: 40px; height: 40px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .lb-icon-btn:disabled { opacity: 0.5; cursor: default; }
      #lb-mic {
        border: 1px solid var(--lb-border); background: white; color: var(--lb-foreground);
        ${voiceEnabled ? "display:inline-flex;" : "display:none;"}
      }
      #lb-mic.recording {
        border-color: hsl(0 84% 60%); background: hsl(0 84% 60%); color: white; animation: lb-pulse 1s infinite ease-in-out;
      }
      #lb-mic-recording-dot {
        position: absolute; right: -3px; top: -3px; width: 12px; height: 12px; border-radius: 999px;
        background: hsl(0 84% 60%); box-shadow: 0 0 0 2px white;
        display: none; animation: lb-pulse 1s infinite ease-in-out;
      }
      #lb-mic.recording #lb-mic-recording-dot { display: block; }
      @keyframes lb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      #lb-send {
        border: none; background: var(--lb-gradient-primary); color: white;
      }
      #lb-mic svg, #lb-send svg { width: 16px; height: 16px; }
      #lb-toast {
        position: fixed; right: 24px; bottom: 164px; z-index: 2147483647; background: rgba(17,24,39,0.94); color: white;
        padding: 10px 12px; border-radius: 10px; font-size: 12px; max-width: 280px; opacity: 0; pointer-events: none;
        transform: translateY(8px); transition: opacity .18s ease, transform .18s ease;
      }
      #lb-toast.show { opacity: 1; transform: translateY(0); }
      @media (max-width: 640px) {
        #lb-widget-btn { right: 16px; bottom: 16px; }
        #lb-widget-window { right: 16px; bottom: 84px; width: calc(100vw - 24px); height: min(calc(100vh - 112px), 600px); }
        #lb-toast { right: 16px; width: calc(100vw - 32px); max-width: none; }
      }
    `;

    var root = document.createElement("div");
    root.id = "lb-root";
    root.innerHTML =
      '<button id="lb-widget-btn" type="button" title="Open chat">' + CHAT_ICON + '</button>' +
      '<div id="lb-widget-window" role="dialog" aria-label="Chatbot widget">' +
        '<div id="lb-header">' +
          '<div id="lb-header-main-icon">' + BOT_ICON + '</div>' +
          '<div id="lb-title"></div>' +
          '<div id="lb-header-lang"></div>' +
          '<button id="lb-close" type="button" title="Close">' + CLOSE_ICON + '</button>' +
        '</div>' +
        '<div id="lb-messages"></div>' +
        '<div id="lb-loading">' +
          '<div id="lb-loading-avatar">' + BOT_ICON + '</div>' +
          '<div id="lb-loading-bubble"><span class="lb-dot"></span><span class="lb-dot"></span><span class="lb-dot"></span></div>' +
        '</div>' +
        '<div id="lb-input-bar">' +
          '<form id="lb-form">' +
            '<input id="lb-input" type="text" placeholder="Type or use mic..." />' +
            '<button id="lb-mic" class="lb-icon-btn" type="button" title="Voice input">' + MIC_ICON + '<span id="lb-mic-recording-dot"></span></button>' +
            '<button id="lb-send" class="lb-icon-btn" type="submit" title="Send">' + SEND_ICON + '</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
      '<div id="lb-toast" aria-live="polite"></div>';

    shadow.appendChild(style);
    shadow.appendChild(root);

    shadow.getElementById("lb-title").textContent = config.bot_name || "Assistant";

    attachEvents(config, voiceEnabled);

    if (config.greeting_message) {
      addMessage({ role: "bot", text: config.greeting_message, lang: "en", speakable: true });
    }
  }

  function updateLanguagePill() {
    var pill = shadow.getElementById("lb-header-lang");
    if (!pill) return;
    if (state.detectedLanguage && state.detectedLanguage !== "en") {
      pill.textContent = state.detectedLanguage;
      pill.style.display = "inline-flex";
    } else {
      pill.style.display = "none";
    }
  }

  function addMessage(message) {
    var messages = shadow.getElementById("lb-messages");
    var row = document.createElement("div");
    row.className = "lb-row " + message.role;

    var wrap = document.createElement("div");
    wrap.className = "lb-bubble-wrap";

    var avatar = document.createElement("div");
    avatar.className = "lb-avatar " + (message.role === "user" ? "user" : message.role);
    avatar.innerHTML = message.role === "user" ? USER_ICON : BOT_ICON;

    var content = document.createElement("div");
    content.className = "lb-content";

    var bubble = document.createElement("div");
    bubble.className = "lb-bubble " + message.role;
    bubble.textContent = message.text;

    var meta = document.createElement("div");
    meta.className = "lb-meta";

    if (message.lang && message.lang !== "en") {
      var langBadge = document.createElement("span");
      langBadge.className = "lb-lang-badge";
      langBadge.textContent = message.lang;
      meta.appendChild(langBadge);
    }

    if (message.role === "bot" && message.speakable) {
      var speakBtn = document.createElement("button");
      speakBtn.type = "button";
      speakBtn.className = "lb-speak-btn";
      speakBtn.innerHTML = VOLUME_ICON;
      speakBtn.title = "Read aloud";
      speakBtn.addEventListener("click", function () {
        window.speechSynthesis.cancel();

        if (state.speakingButton === speakBtn) {
          state.speakingButton = null;
          speakBtn.innerHTML = VOLUME_ICON;
          return;
        }

        if (state.speakingButton) {
          state.speakingButton.innerHTML = VOLUME_ICON;
        }

        var utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = LANG_MAP[message.lang || "en"] || LANG_MAP.en;
        utterance.onend = function () {
          state.speakingButton = null;
          speakBtn.innerHTML = VOLUME_ICON;
        };
        utterance.onerror = function () {
          state.speakingButton = null;
          speakBtn.innerHTML = VOLUME_ICON;
        };

        state.speakingButton = speakBtn;
        speakBtn.innerHTML = VOLUME_OFF_ICON;
        window.speechSynthesis.speak(utterance);
      });
      meta.appendChild(speakBtn);
    }

    content.appendChild(bubble);
    if (meta.childNodes.length > 0) content.appendChild(meta);
    wrap.appendChild(avatar);
    wrap.appendChild(content);
    row.appendChild(wrap);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function setLoading(loading) {
    var loadingEl = shadow.getElementById("lb-loading");
    if (!loadingEl) return;
    loadingEl.classList.toggle("show", loading);
    if (loading) {
      var messages = shadow.getElementById("lb-messages");
      messages.scrollTop = messages.scrollHeight;
    }
  }

  async function translateText(text, fromLang, toLang) {
    if (fromLang === toLang) return text;
    try {
      var res = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: "Bearer " + ANON_KEY,
        },
        body: JSON.stringify({
          text: text,
          fromLang: fromLang,
          toLang: toLang,
          embed_key: EMBED_KEY,
        }),
      });
      var data = await res.json();
      return data.translatedText || text;
    } catch (error) {
      return text;
    }
  }

  async function sendMessage() {
    var input = shadow.getElementById("lb-input");
    var sendBtn = shadow.getElementById("lb-send");
    var micBtn = shadow.getElementById("lb-mic");
    var message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessage({ role: "user", text: message, lang: state.detectedLanguage, speakable: false });
    sendBtn.disabled = true;
    if (micBtn) micBtn.disabled = true;
    setLoading(true);

    try {
      var englishMessage = await translateText(message, state.detectedLanguage, "en");
      var res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: "Bearer " + ANON_KEY,
        },
        body: JSON.stringify({ message: englishMessage, embed_key: EMBED_KEY }),
      });
      var data = await res.json();
      var reply = data.reply || "Sorry, I couldn't process that.";
      var translatedReply = await translateText(reply, "en", state.detectedLanguage);
      addMessage({ role: "bot", text: translatedReply, lang: state.detectedLanguage, speakable: true });
    } catch (error) {
      addMessage({ role: "error", text: "Something went wrong. Please try again.", lang: "en", speakable: false });
    } finally {
      setLoading(false);
      sendBtn.disabled = false;
      if (micBtn) micBtn.disabled = false;
      input.focus();
    }
  }

  function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast("Voice input is not supported in this browser.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      var recorder = preferredMimeType ? new MediaRecorder(stream, { mimeType: preferredMimeType }) : new MediaRecorder(stream);

      state.audioChunks = [];
      state.mediaRecorder = recorder;

      recorder.ondataavailable = function (event) {
        if (event.data.size > 0) state.audioChunks.push(event.data);
      };

      recorder.onstop = function () {
        stream.getTracks().forEach(function (track) { track.stop(); });
        var blobMime = (state.audioChunks[0] && state.audioChunks[0].type) || recorder.mimeType || preferredMimeType || "audio/webm";
        var blob = new Blob(state.audioChunks, { type: blobMime });
        if (blob.size === 0) return;
        if (blob.size > 500000) {
          toast("Recording too long, please keep it under 10 seconds.");
          return;
        }

        var formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("embed_key", EMBED_KEY);

        fetch(VOICE_URL, {
          method: "POST",
          headers: {
            apikey: ANON_KEY,
            Authorization: "Bearer " + ANON_KEY,
          },
          body: formData,
        })
          .then(function (response) { return response.json(); })
          .then(function (data) {
            if (data.error && data.error !== "No speech detected") {
              toast(data.error);
              return;
            }
            if (!data.transcript) {
              toast("No speech detected. Please speak clearly and try again.");
              return;
            }
            shadow.getElementById("lb-input").value = data.transcript;
            if (data.detectedLanguage) {
              state.detectedLanguage = data.detectedLanguage;
              updateLanguagePill();
            }
          })
          .catch(function () {
            toast("Failed to transcribe audio.");
          });
      };

      recorder.start();
      state.recording = true;
      syncMicState();
      state.recordingTimer = setTimeout(function () { stopRecording(); }, 10000);
    }).catch(function () {
      toast("Could not access microphone.");
    });
  }

  function stopRecording() {
    if (state.recordingTimer) {
      clearTimeout(state.recordingTimer);
      state.recordingTimer = null;
    }
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    }
    state.mediaRecorder = null;
    state.recording = false;
    syncMicState();
  }

  function syncMicState() {
    var micBtn = shadow.getElementById("lb-mic");
    if (!micBtn) return;
    micBtn.classList.toggle("recording", state.recording);
    micBtn.innerHTML = (state.recording ? MIC_OFF_ICON : MIC_ICON) + '<span id="lb-mic-recording-dot"></span>';
  }

  function attachEvents(config, voiceEnabled) {
    var widgetBtn = shadow.getElementById("lb-widget-btn");
    var widgetWindow = shadow.getElementById("lb-widget-window");
    var closeBtn = shadow.getElementById("lb-close");
    var form = shadow.getElementById("lb-form");
    var input = shadow.getElementById("lb-input");
    var micBtn = shadow.getElementById("lb-mic");

    widgetBtn.addEventListener("click", function () {
      state.isOpen = !state.isOpen;
      widgetWindow.classList.toggle("open", state.isOpen);
      if (state.isOpen) input.focus();
    });

    closeBtn.addEventListener("click", function () {
      state.isOpen = false;
      widgetWindow.classList.remove("open");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    if (voiceEnabled && micBtn) {
      micBtn.addEventListener("click", function () {
        if (state.recording) stopRecording();
        else startRecording();
      });
    }

    updateLanguagePill();
    syncMicState();
  }

  fetch(CONFIG_URL + "?embed_key=" + encodeURIComponent(EMBED_KEY), {
    headers: {
      apikey: ANON_KEY,
      Authorization: "Bearer " + ANON_KEY,
    },
  })
    .then(function (response) { return response.json(); })
    .then(function (config) {
      if (!config || config.error) {
        throw new Error(config && config.error ? config.error : "Config not found");
      }
      state.config = config;
      buildShell(config);
    })
    .catch(function (error) {
      console.error("LinguaBot: failed to initialize widget", error);
      host.remove();
      window.__LinguaBotWidgetMounted = false;
    });
})();
