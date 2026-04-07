(function () {
  const EMBED_KEY = window.ChatbotKey;
  if (!EMBED_KEY) {
    console.error("LinguaBot: Missing window.ChatbotKey");
    return;
  }

  const API_URL = "https://lttwuobnufpjvlirpndn.supabase.co/functions/v1/chat";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dHd1b2JudWZwanZsaXJwbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTc5NzAsImV4cCI6MjA5MDc3Mzk3MH0.jzPjDvkH47QjBFXsRUSRaL98MuitCostqWeZcufdchE";

  let isOpen = false;
  const messages = [];

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    #lb-widget-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%; border: none;
      background: #6c63ff; color: #fff; cursor: pointer;
      box-shadow: 0 4px 14px rgba(108,99,255,0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    #lb-widget-btn:hover { transform: scale(1.08); }
    #lb-widget-btn svg { width: 28px; height: 28px; }
    #lb-widget-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 99999;
      width: 370px; max-width: calc(100vw - 32px); height: 500px; max-height: calc(100vh - 120px);
      border-radius: 16px; overflow: hidden; display: none;
      flex-direction: column; background: #fff;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    #lb-widget-window.open { display: flex; }
    #lb-header {
      background: #6c63ff; color: #fff; padding: 16px;
      font-weight: 700; font-size: 15px;
    }
    #lb-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .lb-msg {
      max-width: 80%; padding: 10px 14px; border-radius: 14px;
      font-size: 14px; line-height: 1.45; word-wrap: break-word;
    }
    .lb-msg.user {
      align-self: flex-end; background: #6c63ff; color: #fff;
      border-bottom-right-radius: 4px;
    }
    .lb-msg.bot {
      align-self: flex-start; background: #f0f0f5; color: #1a1a2e;
      border-bottom-left-radius: 4px;
    }
    .lb-msg.error { background: #fee; color: #c00; }
    .lb-dots { display: flex; gap: 4px; padding: 10px 14px; align-self: flex-start; }
    .lb-dots span {
      width: 8px; height: 8px; border-radius: 50%; background: #6c63ff;
      animation: lb-bounce 1.4s infinite both;
    }
    .lb-dots span:nth-child(2) { animation-delay: 0.16s; }
    .lb-dots span:nth-child(3) { animation-delay: 0.32s; }
    @keyframes lb-bounce {
      0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    #lb-input-area {
      display: flex; border-top: 1px solid #eee; padding: 10px;
    }
    #lb-input {
      flex: 1; border: 1px solid #ddd; border-radius: 8px;
      padding: 8px 12px; font-size: 14px; outline: none;
      font-family: inherit;
    }
    #lb-input:focus { border-color: #6c63ff; }
    #lb-send {
      margin-left: 8px; background: #6c63ff; color: #fff; border: none;
      border-radius: 8px; padding: 8px 14px; cursor: pointer;
      font-weight: 600; font-size: 14px;
    }
    #lb-send:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);

  // Button
  const btn = document.createElement("button");
  btn.id = "lb-widget-btn";
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  btn.onclick = function () {
    isOpen = !isOpen;
    win.classList.toggle("open", isOpen);
  };
  document.body.appendChild(btn);

  // Window
  const win = document.createElement("div");
  win.id = "lb-widget-window";
  win.innerHTML = `
    <div id="lb-header">LinguaBot</div>
    <div id="lb-messages"></div>
    <div id="lb-input-area">
      <input id="lb-input" placeholder="Type a message..." />
      <button id="lb-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const msgBox = win.querySelector("#lb-messages");
  const input = win.querySelector("#lb-input");
  const sendBtn = win.querySelector("#lb-send");

  function addMsg(text, role) {
    const div = document.createElement("div");
    div.className = "lb-msg " + role;
    div.textContent = text;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
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

  async function send() {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    addMsg(msg, "user");
    sendBtn.disabled = true;
    showDots();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: "Bearer " + ANON_KEY,
        },
        body: JSON.stringify({ message: msg, embed_key: EMBED_KEY }),
      });
      const data = await res.json();
      hideDots();
      addMsg(data.reply || "No response", "bot");
    } catch (e) {
      hideDots();
      addMsg("Something went wrong. Please try again.", "error");
    }
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.onclick = send;
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });
})();
