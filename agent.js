(function () {
  const BASE = 'https://sudhamshkalakonda.github.io/kaze/';
  const FRAME_SIZE = 128;
  const STORAGE_KEY = 'kaze_api';
  const STORAGE_SIZE = 'kaze_size';
  const STORAGE_MINIMIZED = 'kaze_minimized';
  const IS_MOBILE = window.innerWidth <= 768;

  let DISPLAY_SIZE = IS_MOBILE ? 100 : parseInt(localStorage.getItem(STORAGE_SIZE) || '160');
  let SCALE = DISPLAY_SIZE / FRAME_SIZE;

  const PROVIDERS = {
    groq: {
      label: 'Groq', badge: 'Free',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      keyPrefix: 'gsk_', stream: true,
    },
    openai: {
      label: 'OpenAI', badge: 'Paid',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
      endpoint: 'https://api.openai.com/v1/chat/completions',
      keyPrefix: 'sk-', stream: true,
    },
    anthropic: {
      label: 'Anthropic', badge: 'Paid',
      models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
      endpoint: 'https://api.anthropic.com/v1/messages',
      keyPrefix: 'sk-ant-', stream: false,
    },
    gemini: {
      label: 'Gemini', badge: 'Free',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      endpoint: 'gemini', keyPrefix: 'AI', stream: false,
    },
  };

  const CHARACTERS = {
    samurai: {
      label: 'Samurai', folder: 'Samurai',
      states: {
        walk:   { file: 'Walk.png',     frames: 8,  fps: 10 },
        run:    { file: 'Run.png',      frames: 8,  fps: 16 },
        idle:   { file: 'Idle.png',     frames: 6,  fps: 8  },
        jump:   { file: 'Jump.png',     frames: 12, fps: 12 },
        attack: { file: 'Attack_1.png', frames: 6,  fps: 10 },
        hurt:   { file: 'Hurt.png',     frames: 2,  fps: 8  },
      }
    },
    fighter: {
      label: 'Fighter', folder: 'Fighter',
      states: {
        walk:   { file: 'Walk.png',     frames: 8,  fps: 10 },
        run:    { file: 'Run.png',      frames: 8,  fps: 16 },
        idle:   { file: 'Idle.png',     frames: 6,  fps: 8  },
        jump:   { file: 'Jump.png',     frames: 8,  fps: 12 },
        attack: { file: 'Attack_1.png', frames: 4,  fps: 10 },
        hurt:   { file: 'Hurt.png',     frames: 2,  fps: 8  },
      }
    },
    shinobi: {
      label: 'Shinobi', folder: 'Shinobi',
      states: {
        walk:   { file: 'Walk.png',     frames: 8,  fps: 10 },
        run:    { file: 'Run.png',      frames: 8,  fps: 16 },
        idle:   { file: 'Idle.png',     frames: 6,  fps: 8  },
        jump:   { file: 'Jump.png',     frames: 10, fps: 12 },
        attack: { file: 'Attack_1.png', frames: 5,  fps: 10 },
        hurt:   { file: 'Hurt.png',     frames: 2,  fps: 8  },
      }
    }
  };

  const script = document.currentScript;
  const AGENT_NAME = script?.getAttribute('data-name') || 'Kaze';
  const SYSTEM_PROMPT = script?.getAttribute('data-prompt') || 'You are Kaze, a helpful AI assistant. Keep responses concise and under 100 words.';
  const DEFAULT_CHAR = script?.getAttribute('data-character') || 'samurai';

  let savedApi = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  let currentProvider = savedApi.provider || 'groq';
  let currentModel = savedApi.model || PROVIDERS.groq.models[0];
  let API_KEY = savedApi.key || '';
  let currentChar = CHARACTERS[DEFAULT_CHAR] || CHARACTERS.samurai;
  let images = {};
  let minimized = localStorage.getItem(STORAGE_MINIMIZED) === 'true';

  function preloadImages(char) {
    images = {};
    Object.entries(char.states).forEach(([key, data]) => {
      const img = new Image();
      img.src = BASE + char.folder + '/' + data.file;
      images[key] = img;
    });
  }

  preloadImages(currentChar);

  function updateSize(size) {
    DISPLAY_SIZE = size;
    SCALE = size / FRAME_SIZE;
    localStorage.setItem(STORAGE_SIZE, size);
    const agent = document.getElementById('kaze-agent');
    const wrap = document.getElementById('kaze-sprite-wrap');
    const img = document.getElementById('kaze-sprite-img');
    if (agent) { agent.style.width = size + 'px'; agent.style.height = size + 'px'; }
    if (wrap) { wrap.style.width = size + 'px'; wrap.style.height = size + 'px'; }
    if (img) { img.style.height = size + 'px'; }
    const popup = document.getElementById('kaze-popup');
    const bub = document.getElementById('kaze-bubble');
    if (popup) popup.style.bottom = (size + 20) + 'px';
    if (bub) bub.style.bottom = (size + 8) + 'px';
    if (currentState) setState(currentState, true);
  }

  const style = document.createElement('style');
  style.textContent = `
    #kaze-agent {
      position: fixed;
      bottom: 0;
      left: 60px;
      width: ${DISPLAY_SIZE}px;
      height: ${DISPLAY_SIZE}px;
      cursor: pointer;
      z-index: 99999;
      user-select: none;
      will-change: transform, left, bottom;
    }
    #kaze-sprite-wrap {
      width: ${DISPLAY_SIZE}px;
      height: ${DISPLAY_SIZE}px;
      overflow: hidden;
      position: relative;
    }
    #kaze-sprite-img {
      position: absolute;
      top: 0; left: 0;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      image-rendering: -moz-crisp-edges;
      will-change: left;
    }
    #kaze-shadow {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px; height: 8px;
      background: rgba(0,0,0,0.18);
      border-radius: 50%;
      filter: blur(2px);
      transition: width 0.1s, opacity 0.1s;
    }
    #kaze-minimize-fab {
      position: absolute; top: -10px; right: -10px;
      width: 22px; height: 22px;
      background: #1a1a2e; border: none; border-radius: 50%;
      color: white; font-size: 11px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 1; opacity: 0; transition: opacity 0.2s;
    }
    #kaze-agent:hover #kaze-minimize-fab { opacity: 1; }
    #kaze-bubble {
      position: absolute;
      bottom: ${DISPLAY_SIZE + 8}px;
      left: 0;
      background: white;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 12px 12px 12px 2px;
      padding: 7px 11px;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      color: rgba(0,0,0,0.6);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      transform: translateY(4px);
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    #kaze-bubble.show {
      opacity: 1;
      transform: translateY(0);
    }
    #kaze-restore-btn {
      position: fixed; bottom: 20px; left: 20px;
      width: 48px; height: 48px;
      background: #1a1a2e; border: none; border-radius: 50%;
      color: white; font-size: 18px; cursor: pointer;
      z-index: 99999; display: none; align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      transition: transform 0.2s;
    }
    #kaze-restore-btn:hover { transform: scale(1.1); }
    #kaze-restore-btn.show { display: flex; }
    #kaze-popup {
      position: fixed;
      bottom: ${DISPLAY_SIZE + 20}px;
      left: 60px;
      width: ${IS_MOBILE ? 'calc(100vw - 24px)' : '320px'};
      max-width: 320px;
      background: white;
      border: 0.5px solid rgba(0,0,0,0.08);
      border-radius: 18px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      z-index: 99998;
      box-shadow: 0 12px 48px rgba(0,0,0,0.15);
      font-family: system-ui, sans-serif;
    }
    #kaze-popup.open { display: flex; }
    #kaze-popup-header {
      padding: 12px 14px;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
      display: flex; align-items: center; justify-content: space-between;
      background: #fafafa;
    }
    #kaze-popup-title {
      font-size: 13px; font-weight: 600; color: #111;
      display: flex; align-items: center; gap: 8px;
    }
    #kaze-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: #1a1a2e;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: white;
    }
    #kaze-header-actions { display: flex; align-items: center; gap: 6px; }
    .kaze-hbtn {
      background: none; border: none;
      color: rgba(0,0,0,0.2); cursor: pointer;
      padding: 4px; line-height: 1; font-size: 14px;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .kaze-hbtn:hover { color: rgba(0,0,0,0.6); background: rgba(0,0,0,0.05); }
    #kaze-close { font-size: 20px; }
    #kaze-char-selector {
      padding: 8px 12px;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
      display: flex; gap: 6px;
      background: #fafafa;
    }
    .kaze-char-btn {
      flex: 1; padding: 5px 0;
      background: white;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 8px; font-size: 11px;
      font-family: system-ui, sans-serif;
      color: rgba(0,0,0,0.45); cursor: pointer;
      transition: all 0.15s; text-align: center;
    }
    .kaze-char-btn:hover { border-color: #1a1a2e; color: #1a1a2e; }
    .kaze-char-btn.active { background: #1a1a2e; color: white; border-color: #1a1a2e; }
    #kaze-size-row {
      padding: 8px 14px;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
      display: flex; align-items: center; gap: 10px;
      background: #fafafa;
    }
    #kaze-size-label { font-size: 10px; color: rgba(0,0,0,0.3); letter-spacing: 0.06em; }
    #kaze-size-slider { flex: 1; accent-color: #1a1a2e; cursor: pointer; }
    #kaze-size-val { font-size: 10px; color: rgba(0,0,0,0.3); min-width: 30px; text-align: right; }
    #kaze-setup-screen {
      padding: 16px; display: none;
      flex-direction: column; gap: 10px;
    }
    #kaze-setup-screen.show { display: flex; }
    #kaze-setup-title { font-size: 13px; font-weight: 600; color: #111; }
    #kaze-provider-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .kaze-provider-tab {
      padding: 5px 10px;
      background: #f5f5f5; border: 0.5px solid transparent;
      border-radius: 8px; font-size: 11px;
      font-family: system-ui, sans-serif;
      color: rgba(0,0,0,0.5); cursor: pointer;
      transition: all 0.15s;
      display: flex; align-items: center; gap: 4px;
    }
    .kaze-provider-tab:hover { background: #eee; }
    .kaze-provider-tab.active { background: #1a1a2e; color: white; }
    .kaze-badge {
      font-size: 9px; padding: 1px 5px;
      border-radius: 4px; background: rgba(255,255,255,0.2);
    }
    .kaze-provider-tab:not(.active) .kaze-badge {
      background: rgba(0,0,0,0.08); color: rgba(0,0,0,0.4);
    }
    #kaze-model-select {
      width: 100%; background: #f5f5f5;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 8px; padding: 8px 10px;
      font-size: 12px; color: #111; outline: none;
      font-family: inherit; cursor: pointer;
    }
    #kaze-key-input {
      width: 100%; background: #f5f5f5;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 10px; padding: 9px 12px;
      font-size: 12px; color: #111; outline: none;
      font-family: monospace;
      transition: border-color 0.2s;
    }
    #kaze-key-input:focus { border-color: #1a1a2e; background: white; }
    #kaze-key-input::placeholder { color: rgba(0,0,0,0.25); font-family: system-ui; }
    #kaze-setup-desc { font-size: 11px; color: rgba(0,0,0,0.4); line-height: 1.5; }
    #kaze-setup-desc a { color: #1a1a2e; text-decoration: none; }
    #kaze-save-key {
      width: 100%; padding: 10px;
      background: #1a1a2e; color: white; border: none;
      border-radius: 10px; font-size: 13px;
      font-family: system-ui, sans-serif;
      cursor: pointer; font-weight: 500;
      transition: background 0.15s;
    }
    #kaze-save-key:hover { background: #2a2a4e; }
    #kaze-key-error { font-size: 11px; color: #e24b4a; display: none; }
    #kaze-msgs {
      padding: 12px; display: flex;
      flex-direction: column; gap: 8px;
      max-height: ${IS_MOBILE ? '180px' : '200px'};
      overflow-y: auto;
      scroll-behavior: smooth;
    }
    #kaze-msgs::-webkit-scrollbar { width: 3px; }
    #kaze-msgs::-webkit-scrollbar-track { background: transparent; }
    #kaze-msgs::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
    .kaze-msg {
      font-size: 13px; line-height: 1.55;
      padding: 9px 12px; border-radius: 12px;
      background: #f5f5f5; color: #222; max-width: 90%;
      animation: kaze-msg-in 0.2s ease;
    }
    @keyframes kaze-msg-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .kaze-msg.user {
      background: #1a1a2e; color: white;
      align-self: flex-end;
      border-radius: 12px 12px 2px 12px;
    }
    .kaze-msg p { margin: 0 0 5px; }
    .kaze-msg p:last-child { margin: 0; }
    .kaze-msg ul, .kaze-msg ol { padding-left: 16px; margin: 4px 0; }
    .kaze-msg li { margin: 2px 0; }
    .kaze-msg strong { font-weight: 600; }
    .kaze-msg em { font-style: italic; }
    .kaze-msg code {
      background: rgba(0,0,0,0.07); padding: 1px 5px;
      border-radius: 4px; font-family: monospace; font-size: 11px;
    }
    .kaze-typing {
      display: flex; gap: 4px;
      padding: 10px 12px; background: #f5f5f5;
      border-radius: 12px; width: fit-content;
    }
    .kaze-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(0,0,0,0.2);
      animation: kaze-blink 1.2s infinite;
    }
    .kaze-typing span:nth-child(2) { animation-delay: 0.2s; }
    .kaze-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes kaze-blink { 0%,80%,100%{opacity:0.15} 40%{opacity:0.8} }
    #kaze-input-row {
      padding: 10px 12px;
      border-top: 0.5px solid rgba(0,0,0,0.06);
      display: flex; gap: 8px; align-items: center;
      background: #fafafa;
    }
    #kaze-input {
      flex: 1; background: white;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 20px; padding: 8px 14px;
      font-size: 13px; color: #111; outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    #kaze-input:focus { border-color: #1a1a2e; }
    #kaze-input::placeholder { color: rgba(0,0,0,0.3); }
    #kaze-send {
      width: 32px; height: 32px; background: #1a1a2e;
      border: none; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s, transform 0.1s;
    }
    #kaze-send:hover { background: #2a2a4e; }
    #kaze-send:active { transform: scale(0.95); }
    #kaze-powered {
      padding: 6px 12px; font-size: 10px;
      color: rgba(0,0,0,0.2); text-align: center;
      border-top: 0.5px solid rgba(0,0,0,0.04);
      letter-spacing: 0.05em;
      background: #fafafa;
    }
    @media (max-width: 768px) {
      #kaze-popup {
        left: 12px !important;
        width: calc(100vw - 24px) !important;
        max-width: 100% !important;
        bottom: 110px !important;
      }
      #kaze-agent { left: 12px !important; }
      #kaze-minimize-fab { opacity: 1 !important; }
    }
  `;
  document.head.appendChild(style);

  function buildProviderTabs() {
    return Object.entries(PROVIDERS).map(([key, p]) => `
      <button class="kaze-provider-tab ${key === currentProvider ? 'active' : ''}" data-provider="${key}">
        ${p.label} <span class="kaze-badge">${p.badge}</span>
      </button>
    `).join('');
  }

  function buildModelOptions(provider) {
    return PROVIDERS[provider].models.map(m =>
      `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
    ).join('');
  }

  function getKeyPlaceholder(p) {
    return { groq:'gsk_...', openai:'sk-...', anthropic:'sk-ant-...', gemini:'AIza...' }[p] || 'API key...';
  }

  function getKeyLink(p) {
    return {
      groq:'https://console.groq.com',
      openai:'https://platform.openai.com/api-keys',
      anthropic:'https://console.anthropic.com',
      gemini:'https://aistudio.google.com/app/apikey'
    }[p];
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="kaze-agent">
      <button id="kaze-minimize-fab" title="Minimize">−</button>
      <div id="kaze-bubble"></div>
      <div id="kaze-sprite-wrap">
        <img id="kaze-sprite-img" alt="kaze"/>
      </div>
      <div id="kaze-shadow"></div>
    </div>
    <button id="kaze-restore-btn" title="Restore Kaze">風</button>
    <div id="kaze-popup">
      <div id="kaze-popup-header">
        <div id="kaze-popup-title">
          <div id="kaze-avatar">風</div>
          ${AGENT_NAME}
        </div>
        <div id="kaze-header-actions">
          <button class="kaze-hbtn" id="kaze-settings-btn" title="Settings">⚙️</button>
          <button class="kaze-hbtn" id="kaze-clear-btn" title="Clear chat">🗑</button>
          <button class="kaze-hbtn" id="kaze-min-btn" title="Minimize">−</button>
          <button class="kaze-hbtn" id="kaze-close">×</button>
        </div>
      </div>
      <div id="kaze-char-selector">
        <button class="kaze-char-btn ${DEFAULT_CHAR==='samurai'?'active':''}" data-char="samurai">Samurai</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR==='fighter'?'active':''}" data-char="fighter">Fighter</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR==='shinobi'?'active':''}" data-char="shinobi">Shinobi</button>
      </div>
      ${!IS_MOBILE ? `
      <div id="kaze-size-row">
        <span id="kaze-size-label">SIZE</span>
        <input type="range" id="kaze-size-slider" min="80" max="240" step="10" value="${DISPLAY_SIZE}" />
        <span id="kaze-size-val">${DISPLAY_SIZE}px</span>
      </div>` : ''}
      <div id="kaze-setup-screen">
        <div id="kaze-setup-title">Connect your AI</div>
        <div id="kaze-provider-tabs">${buildProviderTabs()}</div>
        <select id="kaze-model-select">${buildModelOptions(currentProvider)}</select>
        <input id="kaze-key-input" type="password" placeholder="${getKeyPlaceholder(currentProvider)}" value="${API_KEY}" />
        <div id="kaze-setup-desc">
          Get a free key at <a href="${getKeyLink(currentProvider)}" target="_blank" id="kaze-key-link">${getKeyLink(currentProvider)}</a>
        </div>
        <div id="kaze-key-error">Invalid key format</div>
        <button id="kaze-save-key">Save & Start Chatting</button>
      </div>
      <div id="kaze-msgs">
        <div class="kaze-msg">⚔️ ${AGENT_NAME} at your service. Ask me anything.</div>
      </div>
      <div id="kaze-input-row">
        <input id="kaze-input" placeholder="Ask anything..." />
        <button id="kaze-send">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      </div>
      <div id="kaze-powered">powered by kaze · sudhamshkalakonda.com</div>
    </div>
  `);

  const agent = document.getElementById('kaze-agent');
  const popup = document.getElementById('kaze-popup');
  const bubble = document.getElementById('kaze-bubble');
  const shadow = document.getElementById('kaze-shadow');
  const spriteImg = document.getElementById('kaze-sprite-img');
  const msgs = document.getElementById('kaze-msgs');
  const input = document.getElementById('kaze-input');
  const setupScreen = document.getElementById('kaze-setup-screen');
  const keyInput = document.getElementById('kaze-key-input');
  const keyError = document.getElementById('kaze-key-error');
  const restoreBtn = document.getElementById('kaze-restore-btn');

  let pos = IS_MOBILE ? 12 : 60;
  let dir = 1, open = false;
  let currentState = 'walk';
  let frame = 0, animInterval = null;
  let stateTimer = 0;
  let jumpY = 0, jumpPhase = 0, isJumping = false;
  let pendingOpen = false;
  let history = [];
  let isStreaming = false;
  const bubbles = ['click me! ⚔️', 'kaze desu...', 'ask me anything', 'i wander your site', 'built by SK 風'];
  let bi = 0;

  function parseMarkdown(text) {
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/^#{1,3} (.+)$/gm,'<strong>$1</strong>')
      .replace(/^[\*\-] (.+)$/gm,'<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g,'<ul>$1</ul>')
      .trim();
  }

  function minimize() {
    minimized = true;
    localStorage.setItem(STORAGE_MINIMIZED,'true');
    agent.style.display = 'none';
    popup.classList.remove('open');
    open = false;
    restoreBtn.classList.add('show');
  }

  function restore() {
    minimized = false;
    localStorage.setItem(STORAGE_MINIMIZED,'false');
    agent.style.display = 'block';
    restoreBtn.classList.remove('show');
    setState('run'); stateTimer = 0;
  }

  function showSetup() {
    setupScreen.classList.add('show');
    msgs.style.display = 'none';
    document.getElementById('kaze-input-row').style.display = 'none';
    document.getElementById('kaze-powered').style.display = 'none';
    keyInput.focus();
  }

  function hideSetup() {
    setupScreen.classList.remove('show');
    msgs.style.display = 'flex';
    document.getElementById('kaze-input-row').style.display = 'flex';
    document.getElementById('kaze-powered').style.display = 'block';
  }

  function clearChat() {
    history = [];
    msgs.innerHTML = `<div class="kaze-msg">⚔️ ${AGENT_NAME} at your service. Ask me anything.</div>`;
  }

  function setState(s, force = false) {
    if (currentState === s && animInterval && !force) return;
    currentState = s;
    frame = 0;
    if (animInterval) clearInterval(animInterval);
    const st = currentChar.states[s];
    if (!st) return;
    const img = images[s];
    const frameW = FRAME_SIZE * SCALE;
    const totalW = st.frames * frameW;
    spriteImg.src = img.src;
    spriteImg.style.width = totalW + 'px';
    spriteImg.style.height = DISPLAY_SIZE + 'px';
    spriteImg.style.left = '0px';
    const run = () => {
      spriteImg.style.left = -(frame * frameW) + 'px';
      frame++;
      if (frame >= st.frames) {
        if (currentState === 'attack') {
          clearInterval(animInterval); animInterval = null;
          setState('idle');
          if (pendingOpen) { pendingOpen = false; openChatNow(); }
        } else if (currentState === 'jump') {
          clearInterval(animInterval); animInterval = null;
          isJumping = false; jumpY = 0; setState('walk');
        } else if (currentState === 'hurt') {
          clearInterval(animInterval); animInterval = null;
          setState('walk');
        } else { frame = 0; }
      }
    };
    if (img.complete) { animInterval = setInterval(run, 1000 / st.fps); }
    else { img.onload = () => { animInterval = setInterval(run, 1000 / st.fps); }; }
  }

  function switchCharacter(charKey) {
    currentChar = CHARACTERS[charKey];
    preloadImages(currentChar);
    document.querySelectorAll('.kaze-char-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.char === charKey);
    });
    if (animInterval) { clearInterval(animInterval); animInterval = null; }
    frame = 0;
    setState('idle');
    setTimeout(() => setState('walk'), 800);
  }

  function walkLoop() {
    stateTimer++;
    if (!open && !minimized) {
      if (currentState === 'walk' || currentState === 'run') {
        const speed = currentState === 'run' ? 3 : 1.2;
        pos += dir * speed;
        const max = window.innerWidth - DISPLAY_SIZE - 10;
        if (pos > max) { pos = max; dir = -1; }
        if (pos < (IS_MOBILE ? 12 : 10)) { pos = IS_MOBILE ? 12 : 10; dir = 1; }
        agent.style.left = pos + 'px';
        agent.style.transform = dir === -1 ? 'scaleX(-1)' : 'scaleX(1)';
        if (currentState === 'run' && stateTimer > 80) { setState('walk'); stateTimer = 0; }
        if (currentState === 'walk' && stateTimer > 350 && Math.random() < 0.008) {
          isJumping = true; jumpPhase = 0; setState('jump'); stateTimer = 0;
        }
        if (currentState === 'walk' && stateTimer > 450 && Math.random() < 0.005) {
          setState('hurt'); stateTimer = 0;
        }
      }
      if (isJumping && currentState === 'jump') {
        jumpPhase += 0.1;
        jumpY = Math.max(0, Math.sin(jumpPhase * Math.PI) * 60);
        agent.style.bottom = jumpY + 'px';
        shadow.style.width = Math.max(20, 60 - jumpY * 0.6) + 'px';
        shadow.style.opacity = Math.max(0.04, 0.18 - jumpY / 400);
        pos += dir * 1.5;
        const max = window.innerWidth - DISPLAY_SIZE - 10;
        if (pos > max) { pos = max; dir = -1; }
        if (pos < 10) { pos = 10; dir = 1; }
        agent.style.left = pos + 'px';
        agent.style.transform = dir === -1 ? 'scaleX(-1)' : 'scaleX(1)';
      } else if (!isJumping) {
        agent.style.bottom = '0px';
        shadow.style.width = '60px';
        shadow.style.opacity = '0.18';
      }
    }
    requestAnimationFrame(walkLoop);
  }

  function openChatNow() {
    open = true; setState('idle');
    popup.classList.add('open');
    if (IS_MOBILE) {
      popup.style.left = '12px';
      popup.style.bottom = (DISPLAY_SIZE + 10) + 'px';
    } else {
      const left = Math.min(pos, window.innerWidth - 340);
      popup.style.left = Math.max(10, left) + 'px';
    }
    if (!API_KEY) { showSetup(); } else { input.focus(); }
  }

  function closeChat() {
    open = false; popup.classList.remove('open');
    hideSetup(); setState('run'); stateTimer = 0;
  }

  async function callAPI(allMessages) {
    if (currentProvider === 'anthropic') {
      const res = await fetch(PROVIDERS.anthropic.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: currentModel, max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: allMessages.filter(m => m.role !== 'system')
        })
      });
      const data = await res.json();
      return { text: data.content?.[0]?.text || 'No response.', stream: false };
    }
    if (currentProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`;
      const contents = allMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] } })
      });
      const data = await res.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.', stream: false };
    }
    const endpoint = currentProvider === 'openai' ? PROVIDERS.openai.endpoint : PROVIDERS.groq.endpoint;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: currentModel, messages: allMessages, max_tokens: 200, stream: true })
    });
    return { res, stream: true };
  }

  async function sendMsg() {
    const text = input.value.trim();
    if (!text || !API_KEY || isStreaming) return;
    input.value = ''; isStreaming = true;

    history.push({ role: 'user', content: text });
    const u = document.createElement('div');
    u.className = 'kaze-msg user'; u.textContent = text;
    msgs.appendChild(u);

    const typing = document.createElement('div');
    typing.className = 'kaze-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    const allMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

    try {
      const result = await callAPI(allMessages);
      typing.remove();
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      msgs.appendChild(a);

      if (!result.stream) {
        a.innerHTML = '<p>' + parseMarkdown(result.text) + '</p>';
        history.push({ role: 'assistant', content: result.text });
      } else {
        const reader = result.res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const json = line.replace('data: ', '');
            if (json === '[DONE]') break;
            try {
              const data = JSON.parse(json);
              const token = data.choices?.[0]?.delta?.content || '';
              fullText += token;
              a.innerHTML = '<p>' + parseMarkdown(fullText) + '</p>';
              msgs.scrollTop = msgs.scrollHeight;
            } catch {}
          }
        }
        history.push({ role: 'assistant', content: fullText });
      }
    } catch {
      typing.remove();
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      a.textContent = 'Something went wrong. Check your API key.';
      msgs.appendChild(a);
    }

    isStreaming = false;
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Size slider (desktop only)
  if (!IS_MOBILE) {
    const sizeSlider = document.getElementById('kaze-size-slider');
    const sizeVal = document.getElementById('kaze-size-val');
    sizeSlider?.addEventListener('input', () => {
      const size = parseInt(sizeSlider.value);
      sizeVal.textContent = size + 'px';
      updateSize(size);
    });
  }

  // Provider tabs
  document.getElementById('kaze-provider-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.kaze-provider-tab');
    if (!btn) return;
    currentProvider = btn.dataset.provider;
    document.querySelectorAll('.kaze-provider-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.provider === currentProvider));
    document.getElementById('kaze-model-select').innerHTML = buildModelOptions(currentProvider);
    currentModel = PROVIDERS[currentProvider].models[0];
    keyInput.placeholder = getKeyPlaceholder(currentProvider);
    const link = document.getElementById('kaze-key-link');
    link.href = getKeyLink(currentProvider);
    link.textContent = getKeyLink(currentProvider);
    keyInput.value = '';
    API_KEY = '';
  });

  document.getElementById('kaze-model-select').addEventListener('change', (e) => {
    currentModel = e.target.value;
  });

  document.getElementById('kaze-save-key').addEventListener('click', () => {
    const val = keyInput.value.trim();
    if (!val || val.length < 10) { keyError.style.display = 'block'; return; }
    keyError.style.display = 'none';
    API_KEY = val;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: currentProvider, model: currentModel, key: val }));
    hideSetup(); input.focus();
  });

  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('kaze-save-key').click();
  });

  // Touch support
  agent.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (open || minimized) return;
    setState('attack'); pendingOpen = true;
  }, { passive: false });

  agent.addEventListener('click', () => {
    if (open || minimized) return;
    setState('attack'); pendingOpen = true;
  });

  document.getElementById('kaze-minimize-fab').addEventListener('click', (e) => { e.stopPropagation(); minimize(); });
  document.getElementById('kaze-min-btn').addEventListener('click', minimize);
  document.getElementById('kaze-close').addEventListener('click', closeChat);
  document.getElementById('kaze-send').addEventListener('click', sendMsg);
  document.getElementById('kaze-settings-btn').addEventListener('click', showSetup);
  document.getElementById('kaze-clear-btn').addEventListener('click', clearChat);
  restoreBtn.addEventListener('click', restore);

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) closeChat(); });

  document.querySelectorAll('.kaze-char-btn').forEach(btn => {
    btn.addEventListener('click', () => switchCharacter(btn.dataset.char));
  });

  if (minimized) { agent.style.display = 'none'; restoreBtn.classList.add('show'); }

  agent.style.left = pos + 'px';
  setState('walk');
  walkLoop();

  setTimeout(() => {
    bubble.textContent = bubbles[0];
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2500);
  }, 1200);

  setInterval(() => {
    if (!open && !minimized) {
      bubble.textContent = bubbles[bi % bubbles.length]; bi++;
      bubble.classList.add('show');
      setTimeout(() => bubble.classList.remove('show'), 2200);
    }
  }, 5000);
})();