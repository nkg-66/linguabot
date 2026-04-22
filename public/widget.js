(function () {
  const EMBED_KEY = window.ChatbotKey;
  if (!EMBED_KEY) {
    console.error("LinguaBot: Missing window.ChatbotKey");
    return;
  }

  const SUPA_BASE = "https://lttwuobnufpjvlirpndn.supabase.co/functions/v1";
  const API_URL = SUPA_BASE + "/chat";
  const VOICE_URL = SUPA_BASE + "/voice-to-text";
  const TRANSLATE_URL = SUPA_BASE + "/translate-message";
  const CONFIG_URL = SUPA_BASE + "/get-widget-config";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dHd1b2JudWZwanZsaXJwbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTc5NzAsImV4cCI6MjA5MDc3Mzk3MH0.jzPjDvkH47QjBFXsRUSRaL98MuitCostqWeZcufdchE";

  const LANG_MAP = {
    hi:"hi-IN",fr:"fr-FR",es:"es-ES",de:"de-DE",ar:"ar-SA",
    zh:"zh-CN",ja:"ja-JP",en:"en-US",pt:"pt-BR",ko:"ko-KR",
    it:"it-IT",ru:"ru-RU",nl:"nl-NL",tr:"tr-TR",pl:"pl-PL",sv:"sv-SE"
  };

  let isOpen = false;
  let detectedLanguage = "en";
  let recording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingTimer = null;
  let speakingEl = null;
  let CFG = null;

  // Helper: hex -> rgba for translucent overlays (mirrors bg-primary/20 etc.)
  function hexToRgba(hex, a) {
    if (!hex) return "rgba(108,99,255," + a + ")";
    const h = hex.replace("#", "");
    const v = h.length === 3
      ? h.split("").map(function (c) { return parseInt(c + c, 16); })
      : [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    return "rgba(" + v[0] + "," + v[1] + "," + v[2] + "," + a + ")";
  }

  // SVG icons (match lucide-react icons used in ChatModal)
  const chatSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  const botSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>';
  const userSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const closeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const micSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const micOffSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const sendSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  const speakerSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>';
  const stopSpeakSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

  // Inject styles only after we know the primary color, so it always matches the app
  function injectStyles(primary) {
    const tint10 = hexToRgba(primary, 0.1);
    const tint20 = hexToRgba(primary, 0.2);
    const shadow = hexToRgba(primary, 0.4);
    const style = document.createElement("style");
    style.id = "lb-widget-style";
    style.textContent = `
      #lb-widget-btn{
        position:fixed;bottom:24px;right:24px;z-index:99999;
        width:56px;height:56px;border-radius:50%;border:none;
        background:${primary};color:#fff;cursor:pointer;
        box-shadow:0 8px 24px ${shadow};
        display:flex;align-items:center;justify-content:center;transition:transform .2s;
      }
      #lb-widget-btn:hover{transform:scale(1.08);}
      #lb-widget-btn svg{width:26px;height:26px;}

      #lb-widget-window{
        position:fixed;bottom:92px;right:24px;z-index:99999;
        width:400px;max-width:calc(100vw - 32px);
        height:600px;max-height:calc(100vh - 120px);
        border-radius:16px;overflow:hidden;display:none;
        flex-direction:column;background:#ffffff;border:1px solid #e5e7eb;
        box-shadow:0 20px 50px rgba(0,0,0,.25);
        font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;
      }
      #lb-widget-window.open{display:flex;}

      #lb-header{
        background:${primary};color:#fff;padding:12px 16px;
        display:flex;align-items:center;gap:12px;
      }
      #lb-header .lb-avatar{
        width:32px;height:32px;display:flex;align-items:center;justify-content:center;
        color:#fff;
      }
      #lb-header .lb-avatar svg{width:22px;height:22px;}
      #lb-header .lb-title{flex:1;font-weight:600;font-size:15px;color:#fff;}
      #lb-header .lb-lang-pill{
        font-size:10px;background:rgba(255,255,255,.2);color:#fff;
        padding:2px 8px;border-radius:999px;text-transform:uppercase;font-weight:600;
      }
      #lb-close{background:none;border:none;color:rgba(255,255,255,.85);cursor:pointer;padding:4px;display:flex;}
      #lb-close:hover{color:#fff;}
      #lb-close svg{width:18px;height:18px;}

      #lb-messages{
        flex:1;overflow-y:auto;padding:16px;background:#fff;
        display:flex;flex-direction:column;gap:12px;
      }
      .lb-row{display:flex;}
      .lb-row.user{justify-content:flex-end;}
      .lb-row.bot{justify-content:flex-start;}
      .lb-bubble-wrap{display:flex;gap:8px;align-items:flex-start;max-width:80%;}
      .lb-row.user .lb-bubble-wrap{flex-direction:row-reverse;}
      .lb-avatar-sm{
        width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      }
      .lb-avatar-sm.bot{background:${primary};color:#fff;}
      .lb-avatar-sm.user{background:${tint20};color:${primary};}
      .lb-avatar-sm svg{width:15px;height:15px;}
      .lb-bubble-col{display:flex;flex-direction:column;gap:4px;}
      .lb-bubble{
        border-radius:16px;padding:10px 14px;font-size:14px;line-height:1.45;word-wrap:break-word;
      }
      .lb-bubble.user{background:${primary};color:#fff;}
      .lb-bubble.bot{background:#f3f4f6;color:#111827;}
      .lb-bubble.error{background:#fee2e2;color:#b91c1c;}
      .lb-meta{display:flex;align-items:center;gap:6px;}
      .lb-lang-badge{
        font-size:10px;background:#f3f4f6;color:#6b7280;padding:1px 6px;
        border-radius:4px;text-transform:uppercase;font-weight:600;
      }
      .lb-speak-btn{background:none;border:none;cursor:pointer;padding:2px;color:#9ca3af;display:flex;}
      .lb-speak-btn:hover{color:#4b5563;}
      .lb-speak-btn svg{width:14px;height:14px;}

      .lb-dots{display:flex;gap:4px;padding:12px 16px;background:#f3f4f6;border-radius:16px;align-self:flex-start;margin-left:36px;}
      .lb-dots span{width:8px;height:8px;border-radius:50%;background:#9ca3af;animation:lb-bounce 1.4s infinite both;}
      .lb-dots span:nth-child(2){animation-delay:.16s;}
      .lb-dots span:nth-child(3){animation-delay:.32s;}
      @keyframes lb-bounce{0%,80%,100%{transform:scale(.6);opacity:.4;}40%{transform:scale(1);opacity:1;}}

      #lb-input-area{display:flex;border-top:1px solid #e5e7eb;padding:12px;gap:8px;background:#fff;}
      #lb-input{
        flex:1;border:1px solid #e5e7eb;border-radius:8px;
        padding:8px 12px;font-size:14px;outline:none;font-family:inherit;color:#111827;background:#fff;
      }
      #lb-input:focus{border-color:${primary};box-shadow:0 0 0 2px ${tint20};}
      #lb-mic{
        width:40px;height:40px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
      }
      #lb-mic:hover{background:#f9fafb;}
      #lb-mic.recording{background:#ef4444;border-color:#ef4444;color:#fff;animation:lb-pulse 1s infinite;}
      @keyframes lb-pulse{0%,100%{opacity:1;}50%{opacity:.7;}}
      #lb-send{
        width:40px;height:40px;border-radius:8px;border:none;background:${primary};color:#fff;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
      }
      #lb-send:disabled,#lb-mic:disabled{opacity:.5;cursor:default;}
      #lb-mic svg,#lb-send svg{width:16px;height:16px;}
    `;
    document.head.appendChild(style);
  }

  // Render the widget AFTER config is loaded
  function render() {
    const primary = (CFG && CFG.primary_color) || "#6c63ff";
    const botName = (CFG && CFG.bot_name) || "Assistant";
    const greeting = (CFG && CFG.greeting_message) || "";

    injectStyles(primary);

    const btn = document.createElement("button");
    btn.id = "lb-widget-btn";
    btn.title = botName;
    btn.innerHTML = chatSvg;
    document.body.appendChild(btn);

    const win = document.createElement("div");
    win.id = "lb-widget-window";
    win.innerHTML =
      '<div id="lb-header">' +
        '<div class="lb-avatar">' + botSvg + '</div>' +
        '<span class="lb-title"></span>' +
        '<span id="lb-header-lang" class="lb-lang-pill" style="display:none"></span>' +
        '<button id="lb-close" title="Close">' + closeSvg + '</button>' +
      '</div>' +
      '<div id="lb-messages"></div>' +
      '<div id="lb-input-area">' +
        '<input id="lb-input" placeholder="Type or use mic..." />' +
        '<button id="lb-mic" title="Voice input">' + micSvg + '</button>' +
        '<button id="lb-send" title="Send">' + sendSvg + '</button>' +
      '</div>';
    document.body.appendChild(win);

    win.querySelector(".lb-title").textContent = botName;

    const msgBox = win.querySelector("#lb-messages");
    const input = win.querySelector("#lb-input");
    const sendBtn = win.querySelector("#lb-send");
    const micBtn = win.querySelector("#lb-mic");
    const closeBtn = win.querySelector("#lb-close");
    const headerLang = win.querySelector("#lb-header-lang");

    btn.onclick = function () {
      isOpen = !isOpen;
      win.classList.toggle("open", isOpen);
      if (isOpen) input.focus();
    };
    closeBtn.onclick = function () {
      isOpen = false;
      win.classList.remove("open");
    };

    if (greeting) addMsg(msgBox, greeting, "bot", "en", true);

    function updateLangDisplay() {
      if (detectedLanguage !== "en") {
        headerLang.textContent = detectedLanguage.toUpperCase();
        headerLang.style.display = "inline";
      } else {
        headerLang.style.display = "none";
      }
    }

    function showDots() {
      const d = document.createElement("div");
      d.className = "lb-dots";
      d.id = "lb-loading";
      d.innerHTML = "<span></span><span></span><span></span>";
      msgBox.appendChild(d);
      msgBox.scrollTop = msgBox.scrollHeight;
    }
    function hideDots() {
      const d = document.getElementById("lb-loading");
      if (d) d.remove();
    }

    async function translateText(text, fromLang, toLang) {
      if (fromLang === toLang) return text;
      try {
        const res = await fetch(TRANSLATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
          body: JSON.stringify({ text: text, fromLang: fromLang, toLang: toLang, embed_key: EMBED_KEY }),
        });
        const data = await res.json();
        return data.translatedText || text;
      } catch (e) { return text; }
    }

    async function send() {
      const msg = input.value.trim();
      if (!msg) return;
      input.value = "";
      const userLang = detectedLanguage;
      addMsg(msgBox, msg, "user", userLang, false);
      sendBtn.disabled = true; micBtn.disabled = true;
      showDots();
      try {
        const englishMsg = await translateText(msg, userLang, "en");
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
          body: JSON.stringify({ message: englishMsg, embed_key: EMBED_KEY }),
        });
        const data = await res.json();
        hideDots();
        const aiReply = data.reply || "Sorry, I couldn't process that.";
        const translatedReply = await translateText(aiReply, "en", userLang);
        addMsg(msgBox, translatedReply, "bot", userLang, true);
      } catch (e) {
        hideDots();
        addMsg(msgBox, "Something went wrong. Please try again.", "error", "en", false);
      }
      sendBtn.disabled = false; micBtn.disabled = false;
      input.focus();
    }

    function startRec() {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        alert("Voice input not supported in this browser"); return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        audioChunks = [];
        mediaRecorder.ondataavailable = function (e) { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          const blob = new Blob(audioChunks, { type: mimeType });
          if (blob.size === 0) return;
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          fd.append("embed_key", EMBED_KEY);
          fetch(VOICE_URL, {
            method: "POST",
            headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
            body: fd,
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.transcript) {
                input.value = data.transcript;
                if (data.detectedLanguage) { detectedLanguage = data.detectedLanguage; updateLangDisplay(); }
              }
            })
            .catch(function () { alert("Failed to transcribe audio"); });
        };
        mediaRecorder.start();
        recording = true;
        micBtn.classList.add("recording");
        micBtn.innerHTML = micOffSvg;
        recordingTimer = setTimeout(function () { stopRec(); }, 10000);
      }).catch(function () { alert("Could not access microphone"); });
    }

    function stopRec() {
      if (recordingTimer) { clearTimeout(recordingTimer); recordingTimer = null; }
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      mediaRecorder = null;
      recording = false;
      micBtn.classList.remove("recording");
      micBtn.innerHTML = micSvg;
    }

    micBtn.onclick = function () { if (recording) stopRec(); else startRec(); };
    sendBtn.onclick = send;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
  }

  function addMsg(msgBox, text, role, lang, withSpeak) {
    lang = lang || "en";
    const primary = (CFG && CFG.primary_color) || "#6c63ff";

    const row = document.createElement("div");
    row.className = "lb-row " + (role === "user" ? "user" : "bot");

    const wrap = document.createElement("div");
    wrap.className = "lb-bubble-wrap";

    const avatar = document.createElement("div");
    avatar.className = "lb-avatar-sm " + (role === "user" ? "user" : "bot");
    avatar.innerHTML = role === "user" ? userSvg : botSvg;
    wrap.appendChild(avatar);

    const col = document.createElement("div");
    col.className = "lb-bubble-col";

    const bubble = document.createElement("div");
    bubble.className = "lb-bubble " + role;
    bubble.textContent = text;
    col.appendChild(bubble);

    const meta = document.createElement("div");
    meta.className = "lb-meta";
    if (lang !== "en") {
      const badge = document.createElement("span");
      badge.className = "lb-lang-badge";
      badge.textContent = lang.toUpperCase();
      meta.appendChild(badge);
    }
    if (role === "bot" && withSpeak) {
      const spk = document.createElement("button");
      spk.className = "lb-speak-btn";
      spk.innerHTML = speakerSvg;
      spk.title = "Read aloud";
      spk.onclick = function () {
        window.speechSynthesis.cancel();
        if (speakingEl === spk) { spk.innerHTML = speakerSvg; speakingEl = null; return; }
        if (speakingEl) speakingEl.innerHTML = speakerSvg;
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = LANG_MAP[lang] || "en-US";
        utt.onend = function () { spk.innerHTML = speakerSvg; speakingEl = null; };
        utt.onerror = function () { spk.innerHTML = speakerSvg; speakingEl = null; };
        spk.innerHTML = stopSpeakSvg;
        speakingEl = spk;
        window.speechSynthesis.speak(utt);
      };
      meta.appendChild(spk);
    }
    if (meta.childNodes.length > 0) col.appendChild(meta);

    wrap.appendChild(col);
    row.appendChild(wrap);
    msgBox.appendChild(row);
    msgBox.scrollTop = msgBox.scrollHeight;
    // suppress unused-var lint
    void primary;
  }

  // Fetch config FIRST, then render. Widget never appears with default styling.
  fetch(CONFIG_URL + "?embed_key=" + encodeURIComponent(EMBED_KEY), {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
  })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg || cfg.error) {
        console.error("LinguaBot: invalid embed key or config not found");
        return;
      }
      CFG = cfg;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", render);
      } else {
        render();
      }
    })
    .catch(function (e) {
      console.error("LinguaBot: failed to load widget config", e);
    });
})();
