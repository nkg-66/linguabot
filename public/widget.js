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

  let WIDGET_CONFIG = { bot_name: "Chatbot", primary_color: "#6c63ff", greeting_message: "" };

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

  const style = document.createElement("style");
  style.textContent = `
    #lb-widget-btn {
      position:fixed;bottom:24px;right:24px;z-index:99999;
      width:56px;height:56px;border-radius:50%;border:none;
      background:var(--lb-primary, #6c63ff);color:#fff;cursor:pointer;
      box-shadow:0 4px 14px rgba(108,99,255,0.4);
      display:flex;align-items:center;justify-content:center;transition:transform 0.2s;
    }
    #lb-widget-btn:hover{transform:scale(1.08);}
    #lb-widget-btn svg{width:28px;height:28px;}
    #lb-widget-window{
      position:fixed;bottom:92px;right:24px;z-index:99999;
      width:370px;max-width:calc(100vw - 32px);height:500px;max-height:calc(100vh - 120px);
      border-radius:16px;overflow:hidden;display:none;
      flex-direction:column;background:#fff;
      box-shadow:0 8px 30px rgba(0,0,0,0.18);
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    }
    #lb-widget-window.open{display:flex;}
    #lb-header{
      background:var(--lb-primary, #6c63ff);color:#fff;padding:16px;
      font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;
    }
    #lb-header .lb-lang-pill{
      font-size:10px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;text-transform:uppercase;
    }
    #lb-messages{
      flex:1;overflow-y:auto;padding:16px;
      display:flex;flex-direction:column;gap:10px;
    }
    .lb-msg-wrap{display:flex;flex-direction:column;gap:2px;}
    .lb-msg-wrap.user{align-items:flex-end;}
    .lb-msg-wrap.bot{align-items:flex-start;}
    .lb-msg{
      max-width:80%;padding:10px 14px;border-radius:14px;
      font-size:14px;line-height:1.45;word-wrap:break-word;
    }
    .lb-msg.user{
      background:var(--lb-primary, #6c63ff);color:#fff;border-bottom-right-radius:4px;
    }
    .lb-msg.bot{
      background:#f0f0f5;color:#1a1a2e;border-bottom-left-radius:4px;
    }
    .lb-msg.error{background:#fee;color:#c00;}
    .lb-msg-meta{display:flex;align-items:center;gap:4px;padding:0 4px;}
    .lb-lang-badge{
      font-size:9px;background:#e8e8f0;color:#666;padding:1px 5px;
      border-radius:6px;text-transform:uppercase;font-weight:600;
    }
    .lb-speak-btn{
      background:none;border:none;cursor:pointer;padding:2px;
      color:#999;display:flex;align-items:center;
    }
    .lb-speak-btn:hover{color:var(--lb-primary, #6c63ff);}
    .lb-speak-btn svg{width:14px;height:14px;}
    .lb-dots{display:flex;gap:4px;padding:10px 14px;align-self:flex-start;}
    .lb-dots span{
      width:8px;height:8px;border-radius:50%;background:var(--lb-primary, #6c63ff);
      animation:lb-bounce 1.4s infinite both;
    }
    .lb-dots span:nth-child(2){animation-delay:0.16s;}
    .lb-dots span:nth-child(3){animation-delay:0.32s;}
    @keyframes lb-bounce{
      0%,80%,100%{transform:scale(0.6);opacity:0.4;}
      40%{transform:scale(1);opacity:1;}
    }
    #lb-input-area{display:flex;border-top:1px solid #eee;padding:10px;gap:6px;}
    #lb-input{
      flex:1;border:1px solid #ddd;border-radius:8px;
      padding:8px 12px;font-size:14px;outline:none;font-family:inherit;
    }
    #lb-input:focus{border-color:var(--lb-primary, #6c63ff);}
    #lb-send,#lb-mic{
      background:var(--lb-primary, #6c63ff);color:#fff;border:none;
      border-radius:8px;padding:8px 12px;cursor:pointer;
      font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:center;
    }
    #lb-send:disabled,#lb-mic:disabled{opacity:0.5;cursor:default;}
    #lb-mic.recording{background:#ef4444;animation:lb-pulse 1s infinite;}
    @keyframes lb-pulse{
      0%,100%{opacity:1;}50%{opacity:0.6;}
    }
    #lb-mic svg,#lb-send svg{width:16px;height:16px;}
  `;
  document.head.appendChild(style);

  // SVG icons
  const chatSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  const micSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const micOffSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const sendSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  const speakerSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>';
  const stopSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  // Button
  const btn = document.createElement("button");
  btn.id = "lb-widget-btn";
  btn.innerHTML = chatSvg;
  btn.onclick = function () {
    isOpen = !isOpen;
    win.classList.toggle("open", isOpen);
  };
  document.body.appendChild(btn);

  // Window
  const win = document.createElement("div");
  win.id = "lb-widget-window";
  win.innerHTML =
    '<div id="lb-header"><span id="lb-header-name" style="flex:1">Chatbot</span><span id="lb-header-lang" class="lb-lang-pill" style="display:none"></span></div>' +
    '<div id="lb-messages"></div>' +
    '<div id="lb-input-area">' +
      '<input id="lb-input" placeholder="Type or use mic..." />' +
      '<button id="lb-mic">' + micSvg + '</button>' +
      '<button id="lb-send">' + sendSvg + '</button>' +
    '</div>';
  document.body.appendChild(win);

  const msgBox = win.querySelector("#lb-messages");
  const input = win.querySelector("#lb-input");
  const sendBtn = win.querySelector("#lb-send");
  const micBtn = win.querySelector("#lb-mic");
  const headerLang = win.querySelector("#lb-header-lang");

  function updateLangDisplay() {
    if (detectedLanguage !== "en") {
      headerLang.textContent = detectedLanguage.toUpperCase();
      headerLang.style.display = "inline";
    } else {
      headerLang.style.display = "none";
    }
  }

  function addMsg(text, role, lang) {
    lang = lang || "en";
    var wrap = document.createElement("div");
    wrap.className = "lb-msg-wrap " + role;

    var div = document.createElement("div");
    div.className = "lb-msg " + role;
    div.textContent = text;
    wrap.appendChild(div);

    var meta = document.createElement("div");
    meta.className = "lb-msg-meta";

    if (lang !== "en") {
      var badge = document.createElement("span");
      badge.className = "lb-lang-badge";
      badge.textContent = lang.toUpperCase();
      meta.appendChild(badge);
    }

    if (role === "bot") {
      var spkBtn = document.createElement("button");
      spkBtn.className = "lb-speak-btn";
      spkBtn.innerHTML = speakerSvg;
      spkBtn.title = "Read aloud";
      spkBtn.onclick = function () {
        window.speechSynthesis.cancel();
        if (speakingEl === spkBtn) {
          spkBtn.innerHTML = speakerSvg;
          speakingEl = null;
          return;
        }
        if (speakingEl) speakingEl.innerHTML = speakerSvg;
        var utt = new SpeechSynthesisUtterance(text);
        utt.lang = LANG_MAP[lang] || "en-US";
        utt.onend = function () { spkBtn.innerHTML = speakerSvg; speakingEl = null; };
        utt.onerror = function () { spkBtn.innerHTML = speakerSvg; speakingEl = null; };
        spkBtn.innerHTML = stopSvg;
        speakingEl = spkBtn;
        window.speechSynthesis.speak(utt);
      };
      meta.appendChild(spkBtn);
    }

    if (meta.childNodes.length > 0) wrap.appendChild(meta);
    msgBox.appendChild(wrap);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  function showDots() {
    var d = document.createElement("div");
    d.className = "lb-dots";
    d.id = "lb-loading";
    d.innerHTML = "<span></span><span></span><span></span>";
    msgBox.appendChild(d);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  function hideDots() {
    var d = document.getElementById("lb-loading");
    if (d) d.remove();
  }

  async function translateText(text, fromLang, toLang) {
    if (fromLang === toLang) return text;
    try {
      var res = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
        body: JSON.stringify({ text: text, fromLang: fromLang, toLang: toLang }),
      });
      var data = await res.json();
      return data.translatedText || text;
    } catch (e) {
      return text;
    }
  }

  async function send() {
    var msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    var userLang = detectedLanguage;
    addMsg(msg, "user", userLang);
    sendBtn.disabled = true;
    micBtn.disabled = true;
    showDots();

    try {
      var englishMsg = await translateText(msg, userLang, "en");

      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
        body: JSON.stringify({ message: englishMsg, embed_key: EMBED_KEY }),
      });
      var data = await res.json();
      hideDots();
      var aiReply = data.reply || "No response";
      var translatedReply = await translateText(aiReply, "en", userLang);
      addMsg(translatedReply, "bot", userLang);
    } catch (e) {
      hideDots();
      addMsg("Something went wrong. Please try again.", "error", "en");
    }
    sendBtn.disabled = false;
    micBtn.disabled = false;
    input.focus();
  }

  // Mic recording
  function startRec() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("Voice input not supported in this browser");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
      audioChunks = [];

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(audioChunks, { type: mimeType });
        if (blob.size === 0) return;

        var fd = new FormData();
        fd.append("audio", blob, "recording.webm");

        fetch(VOICE_URL, {
          method: "POST",
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
          body: fd,
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.transcript) {
              input.value = data.transcript;
              if (data.detectedLanguage) {
                detectedLanguage = data.detectedLanguage;
                updateLangDisplay();
              }
            }
          })
          .catch(function () {
            alert("Failed to transcribe audio");
          });
      };

      mediaRecorder.start();
      recording = true;
      micBtn.classList.add("recording");
      micBtn.innerHTML = micOffSvg;

      recordingTimer = setTimeout(function () { stopRec(); }, 60000);
    }).catch(function () {
      alert("Could not access microphone");
    });
  }

  function stopRec() {
    if (recordingTimer) { clearTimeout(recordingTimer); recordingTimer = null; }
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    mediaRecorder = null;
    recording = false;
    micBtn.classList.remove("recording");
    micBtn.innerHTML = micSvg;
  }

  micBtn.onclick = function () {
    if (recording) stopRec();
    else startRec();
  };

  sendBtn.onclick = send;
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });
})();
