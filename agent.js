(function () {
  const BASE = 'https://sudhamshkalakonda.github.io/kaze/';
  const FRAME_SIZE = 128;
  const DISPLAY_SIZE = 160;
  const SCALE = DISPLAY_SIZE / FRAME_SIZE;
  const STORAGE_KEY = 'kaze_groq_key';
  const STORAGE_MINIMIZED = 'kaze_minimized';

  const CHARACTERS = {
    samurai: {
      label: 'Samurai',
      folder: 'Samurai',
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
      label: 'Fighter',
      folder: 'Fighter',
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
      label: 'Shinobi',
      folder: 'Shinobi',
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
  const SYSTEM_PROMPT = script?.getAttribute('data-prompt') || 'You are Kaze, a helpful AI assistant. Keep responses concise, friendly, and under 100 words.';
  const DEFAULT_CHAR = script?.getAttribute('data-character') || 'samurai';

  let GROQ_KEY = localStorage.getItem(STORAGE_KEY) || '';
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

  const style = document.createElement('style');
  style.textContent = `
    #kaze-agent {
      position: fixed;
      bottom: 0px;
      left: 60px;
      width: ${DISPLAY_SIZE}px;
      height: ${DISPLAY_SIZE}px;
      cursor: pointer;
      z-index: 99999;
      user-select: none;
      transition: opacity 0.3s;
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
    }
    #kaze-shadow {
      position: absolute;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px; height: 7px;
      background: rgba(0,0,0,0.15);
      border-radius: 50%;
    }
    #kaze-minimize-fab {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 22px; height: 22px;
      background: #1a1a2e;
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.2s;
    }
    #kaze-agent:hover #kaze-minimize-fab { opacity: 1; }
    #kaze-bubble {
      position: absolute;
      bottom: ${DISPLAY_SIZE + 8}px;
      left: 0px;
      background: white;
      border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 10px 10px 10px 2px;
      padding: 6px 10px;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      color: rgba(0,0,0,0.65);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    #kaze-bubble.show { opacity: 1; }
    #kaze-restore-btn {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 48px; height: 48px;
      background: #1a1a2e;
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 18px;
      cursor: pointer;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      transition: transform 0.2s;
    }
    #kaze-restore-btn:hover { transform: scale(1.1); }
    #kaze-restore-btn.show { display: flex; }
    #kaze-popup {
      position: fixed;
      bottom: ${DISPLAY_SIZE + 20}px;
      left: 60px;
      width: 320px;
      background: white;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 16px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      z-index: 99998;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15);
      font-family: system-ui, sans-serif;
    }
    #kaze-popup.open { display: flex; }
    #kaze-popup-header {
      padding: 12px 14px;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #kaze-popup-title {
      font-size: 13px;
      font-weight: 600;
      color: #111;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #kaze-avatar {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
    }
    #kaze-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kaze-hbtn {
      background: none;
      border: none;
      color: rgba(0,0,0,0.25);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      font-size: 14px;
      transition: color 0.15s;
    }
    .kaze-hbtn:hover { color: rgba(0,0,0,0.6); }
    #kaze-close { font-size: 20px; }
    #kaze-char-selector {
      padding: 10px 14px;
      border-bottom: 0.5px solid rgba(0,0,0,0.06);
      display: flex;
      gap: 8px;
    }
    .kaze-char-btn {
      flex: 1;
      padding: 6px 0;
      background: #f5f5f5;
      border: 0.5px solid transparent;
      border-radius: 8px;
      font-size: 11px;
      font-family: system-ui, sans-serif;
      color: rgba(0,0,0,0.4);
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .kaze-char-btn:hover { background: #eee; color: rgba(0,0,0,0.7); }
    .kaze-char-btn.active { background: #1a1a2e; color: white; border-color: #1a1a2e; }
    #kaze-setup-screen {
      padding: 20px;
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    #kaze-setup-screen.show { display: flex; }
    #kaze-setup-title { font-size: 13px; font-weight: 600; color: #111; }
    #kaze-setup-desc { font-size: 12px; color: rgba(0,0,0,0.5); line-height: 1.5; }
    #kaze-setup-desc a { color: #1a1a2e; text-decoration: none; }
    #kaze-setup-desc a:hover { text-decoration: underline; }
    #kaze-key-input {
      width: 100%;
      background: #f5f5f5;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
      color: #111;
      outline: none;
      font-family: monospace;
    }
    #kaze-key-input:focus { border-color: #1a1a2e; }
    #kaze-key-input::placeholder { color: rgba(0,0,0,0.25); font-family: system-ui; }
    #kaze-save-key {
      width: 100%;
      padding: 10px;
      background: #1a1a2e;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
      font-weight: 500;
    }
    #kaze-save-key:hover { background: #2a2a4e; }
    #kaze-key-error { font-size: 11px; color: #e24b4a; display: none; }
    #kaze-key-note { font-size: 10px; color: rgba(0,0,0,0.25); text-align: center; }
    #kaze-msgs {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
    }
    .kaze-msg {
      font-size: 13px;
      line-height: 1.55;
      padding: 8px 11px;
      border-radius: 10px;
      background: #f5f5f5;
      color: #222;
      max-width: 90%;
    }
    .kaze-msg.user {
      background: #1a1a2e;
      color: white;
      align-self: flex-end;
      border-radius: 10px 10px 2px 10px;
    }
    .kaze-msg p { margin: 0 0 6px; }
    .kaze-msg p:last-child { margin: 0; }
    .kaze-msg ul, .kaze-msg ol { padding-left: 16px; margin: 4px 0; }
    .kaze-msg li { margin: 2px 0; }
    .kaze-msg strong { font-weight: 600; }
    .kaze-msg em { font-style: italic; }
    .kaze-msg code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 4px; font-family: monospace; font-size: 11px; }
    .kaze-typing {
      display: flex; gap: 4px;
      padding: 10px 11px;
      background: #f5f5f5;
      border-radius: 10px;
      width: fit-content;
    }
    .kaze-typing span {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #aaa;
      animation: kaze-blink 1s infinite;
    }
    .kaze-typing span:nth-child(2) { animation-delay: 0.2s; }
    .kaze-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes kaze-blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
    #kaze-input-row {
      padding: 10px 12px;
      border-top: 0.5px solid rgba(0,0,0,0.06);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    #kaze-input {
      flex: 1;
      background: #f5f5f5;
      border: none;
      border-radius: 20px;
      padding: 8px 12px;
      font-size: 12px;
      color: #111;
      outline: none;
      font-family: inherit;
    }
    #kaze-input::placeholder { color: rgba(0,0,0,0.3); }
    #kaze-send {
      width: 30px; height: 30px;
      background: #1a1a2e;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    #kaze-send:hover { background: #2a2a4e; }
    #kaze-powered {
      padding: 6px 12px;
      font-size: 10px;
      color: rgba(0,0,0,0.25);
      text-align: center;
      border-top: 0.5px solid rgba(0,0,0,0.04);
      letter-spacing: 0.04em;
    }
  `;
  document.head.appendChild(style);

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
          <button class="kaze-hbtn" id="kaze-settings-btn" title="Change API key">⚙️</button>
          <button class="kaze-hbtn" id="kaze-min-btn" title="Minimize">−</button>
          <button class="kaze-hbtn" id="kaze-close">×</button>
        </div>
      </div>
      <div id="kaze-char-selector">
        <button class="kaze-char-btn ${DEFAULT_CHAR==='samurai'?'active':''}" data-char="samurai">Samurai</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR==='fighter'?'active':''}" data-char="fighter">Fighter</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR==='shinobi'?'active':''}" data-char="shinobi">Shinobi</button>
      </div>
      <div id="kaze-setup-screen">
        <div id="kaze-setup-title">Enter your Groq API key</div>
        <div id="kaze-setup-desc">
          Get a free key at <a href="https://console.groq.com" target="_blank">console.groq.com</a> — takes 30 seconds. Saved locally, never shared.
        </div>
        <input id="kaze-key-input" type="password" placeholder="gsk_..." />
        <div id="kaze-key-error">Invalid key — must start with gsk_</div>
        <button id="kaze-save-key">Save & Start Chatting</button>
        <div id="kaze-key-note">Your key is stored in your browser only</div>
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

  let pos = 60, dir = 1, open = false;
  let currentState = 'walk';
  let frame = 0, animInterval = null;
  let stateTimer = 0;
  let jumpY = 0, jumpPhase = 0, isJumping = false;
  let pendingOpen = false;
  let history = [];
  let isStreaming = false;
  const bubbles = ['click me! ⚔️', 'kaze desu...', 'ask me anything', 'i wander your site', 'built by SK 風'];
  let bi = 0;

  // Markdown parser
  function parseMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<strong>$1</strong>')
      .replace(/^# (.+)$/gm, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<)(.+)$/gm, (m) => m.startsWith('<') ? m : m)
      .trim();
  }

  function minimize() {
    minimized = true;
    localStorage.setItem(STORAGE_MINIMIZED, 'true');
    agent.style.display = 'none';
    popup.classList.remove('open');
    open = false;
    restoreBtn.classList.add('show');
  }

  function restore() {
    minimized = false;
    localStorage.setItem(STORAGE_MINIMIZED, 'false');
    agent.style.display = 'block';
    restoreBtn.classList.remove('show');
    setState('run');
    stateTimer = 0;
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

  function setState(s) {
    if (currentState === s && animInterval) return;
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
    setTimeout(() => setState('walk'), 1000);
  }

  function walkLoop() {
    stateTimer++;
    if (!open && !minimized) {
      if (currentState === 'walk' || currentState === 'run') {
        const speed = currentState === 'run' ? 3 : 1.2;
        pos += dir * speed;
        const max = window.innerWidth - DISPLAY_SIZE - 10;
        if (pos > max) { pos = max; dir = -1; }
        if (pos < 10) { pos = 10; dir = 1; }
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
        shadow.style.width = Math.max(20, 60 - jumpY * 0.5) + 'px';
        shadow.style.opacity = Math.max(0.03, 0.15 - jumpY / 500);
        pos += dir * 1.5;
        const max = window.innerWidth - DISPLAY_SIZE - 10;
        if (pos > max) { pos = max; dir = -1; }
        if (pos < 10) { pos = 10; dir = 1; }
        agent.style.left = pos + 'px';
        agent.style.transform = dir === -1 ? 'scaleX(-1)' : 'scaleX(1)';
      } else if (!isJumping) {
        agent.style.bottom = '0px';
        shadow.style.width = '60px';
        shadow.style.opacity = '0.15';
      }
    }
    requestAnimationFrame(walkLoop);
  }

  function openChatNow() {
    open = true;
    setState('idle');
    popup.classList.add('open');
    const left = Math.min(pos, window.innerWidth - 340);
    popup.style.left = Math.max(10, left) + 'px';
    if (!GROQ_KEY) { showSetup(); } else { input.focus(); }
  }

  function closeChat() {
    open = false;
    popup.classList.remove('open');
    hideSetup();
    setState('run');
    stateTimer = 0;
  }

  async function sendMsg() {
    const text = input.value.trim();
    if (!text || !GROQ_KEY || isStreaming) return;
    input.value = '';
    isStreaming = true;

    history.push({ role: 'user', content: text });
    const u = document.createElement('div');
    u.className = 'kaze-msg user';
    u.textContent = text;
    msgs.appendChild(u);

    const typing = document.createElement('div');
    typing.className = 'kaze-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          max_tokens: 200,
          stream: true
        })
      });

      typing.remove();
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      msgs.appendChild(a);
      msgs.scrollTop = msgs.scrollHeight;

      const reader = res.body.getReader();
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
    } catch {
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      a.textContent = 'Something went wrong. Check your Groq key.';
      msgs.appendChild(a);
    }

    isStreaming = false;
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Events
  agent.addEventListener('click', () => {
    if (open || minimized) return;
    setState('attack');
    pendingOpen = true;
  });

  document.getElementById('kaze-minimize-fab').addEventListener('click', (e) => {
    e.stopPropagation();
    minimize();
  });

  document.getElementById('kaze-min-btn').addEventListener('click', minimize);
  document.getElementById('kaze-close').addEventListener('click', closeChat);
  document.getElementById('kaze-send').addEventListener('click', sendMsg);
  document.getElementById('kaze-settings-btn').addEventListener('click', showSetup);
  restoreBtn.addEventListener('click', restore);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

  document.getElementById('kaze-save-key').addEventListener('click', () => {
    const val = keyInput.value.trim();
    if (!val.startsWith('gsk_')) { keyError.style.display = 'block'; return; }
    keyError.style.display = 'none';
    GROQ_KEY = val;
    localStorage.setItem(STORAGE_KEY, val);
    hideSetup();
    input.focus();
  });

  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('kaze-save-key').click();
  });

  document.querySelectorAll('.kaze-char-btn').forEach(btn => {
    btn.addEventListener('click', () => switchCharacter(btn.dataset.char));
  });

  // Init
  if (minimized) {
    agent.style.display = 'none';
    restoreBtn.classList.add('show');
  }

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