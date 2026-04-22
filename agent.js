(function () {
  const BASE = 'https://sudhamshkalakonda.github.io/kaze/';
  const FRAME_SIZE = 128;
  const DISPLAY_SIZE = 160;
  const SCALE = DISPLAY_SIZE / FRAME_SIZE;

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
  const GROQ_KEY = script?.getAttribute('data-groq-key') || '';
  const AGENT_NAME = script?.getAttribute('data-name') || 'Kaze';
  const SYSTEM_PROMPT = script?.getAttribute('data-prompt') || 'You are a helpful AI assistant.';
  const DEFAULT_CHAR = script?.getAttribute('data-character') || 'samurai';

  let currentChar = CHARACTERS[DEFAULT_CHAR] || CHARACTERS.samurai;
  let images = {};

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
    }
    #kaze-sprite-wrap {
      width: ${DISPLAY_SIZE}px;
      height: ${DISPLAY_SIZE}px;
      overflow: hidden;
      position: relative;
    }
    #kaze-sprite-img {
      position: absolute;
      top: 0;
      left: 0;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    #kaze-shadow {
      position: absolute;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 7px;
      background: rgba(0,0,0,0.15);
      border-radius: 50%;
    }
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
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
    }
    #kaze-close {
      background: none;
      border: none;
      font-size: 20px;
      color: rgba(0,0,0,0.3);
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    #kaze-close:hover { color: rgba(0,0,0,0.7); }
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
    .kaze-char-btn.active {
      background: #1a1a2e;
      color: white;
      border-color: #1a1a2e;
    }
    #kaze-msgs {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .kaze-msg {
      font-size: 13px;
      line-height: 1.5;
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
    .kaze-typing {
      display: flex;
      gap: 4px;
      padding: 10px 11px;
      background: #f5f5f5;
      border-radius: 10px;
      width: fit-content;
    }
    .kaze-typing span {
      width: 6px;
      height: 6px;
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
      width: 30px;
      height: 30px;
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
      <div id="kaze-bubble"></div>
      <div id="kaze-sprite-wrap">
        <img id="kaze-sprite-img" alt="kaze"/>
      </div>
      <div id="kaze-shadow"></div>
    </div>
    <div id="kaze-popup">
      <div id="kaze-popup-header">
        <div id="kaze-popup-title">
          <div id="kaze-avatar">風</div>
          ${AGENT_NAME}
        </div>
        <button id="kaze-close">×</button>
      </div>
      <div id="kaze-char-selector">
        <button class="kaze-char-btn ${DEFAULT_CHAR === 'samurai' ? 'active' : ''}" data-char="samurai">Samurai</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR === 'fighter' ? 'active' : ''}" data-char="fighter">Fighter</button>
        <button class="kaze-char-btn ${DEFAULT_CHAR === 'shinobi' ? 'active' : ''}" data-char="shinobi">Shinobi</button>
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

  let pos = 60, dir = 1, open = false;
  let currentState = 'walk';
  let frame = 0, animInterval = null;
  let stateTimer = 0;
  let jumpY = 0, jumpPhase = 0, isJumping = false;
  let pendingOpen = false;
  let history = [];

  const bubbles = ['click me! ⚔️', 'kaze desu...', 'ask me anything', 'i wander your site', 'built by SK 風'];
  let bi = 0;

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
          isJumping = false; jumpY = 0;
          setState('walk');
        } else if (currentState === 'hurt') {
          clearInterval(animInterval); animInterval = null;
          setState('walk');
        } else { frame = 0; }
      }
    };

    if (img.complete) {
      animInterval = setInterval(run, 1000 / st.fps);
    } else {
      img.onload = () => { animInterval = setInterval(run, 1000 / st.fps); };
    }
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
    if (!open) {
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
    input.focus();
  }

  function closeChat() {
    open = false;
    popup.classList.remove('open');
    setState('run');
    stateTimer = 0;
  }

  async function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
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
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history
          ],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Hmm, something went wrong.';
      history.push({ role: 'assistant', content: reply });
      typing.remove();
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      a.textContent = reply;
      msgs.appendChild(a);
    } catch {
      typing.remove();
      const a = document.createElement('div');
      a.className = 'kaze-msg';
      a.textContent = 'Something went wrong. Check your Groq key.';
      msgs.appendChild(a);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Events
  agent.addEventListener('click', () => {
    if (open) return;
    setState('attack');
    pendingOpen = true;
  });

  document.getElementById('kaze-close').addEventListener('click', closeChat);
  document.getElementById('kaze-send').addEventListener('click', sendMsg);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

  document.querySelectorAll('.kaze-char-btn').forEach(btn => {
    btn.addEventListener('click', () => switchCharacter(btn.dataset.char));
  });

  // Init
  agent.style.left = pos + 'px';
  setState('walk');
  walkLoop();

  setTimeout(() => {
    bubble.textContent = bubbles[0];
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2500);
  }, 1200);

  setInterval(() => {
    if (!open) {
      bubble.textContent = bubbles[bi % bubbles.length]; bi++;
      bubble.classList.add('show');
      setTimeout(() => bubble.classList.remove('show'), 2200);
    }
  }, 5000);
})();