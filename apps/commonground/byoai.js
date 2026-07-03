/**
 * BYOAI — Bring Your Own AI Facilitator for CommonGround Suite
 *
 * A self-contained overlay that reads all session data from IndexedDB and
 * forwards it to the user's own AI API key (Google Gemini or any
 * OpenAI-compatible endpoint).  No data is sent anywhere without an explicit
 * user action.  The API key is stored in localStorage and never leaves the
 * browser except in requests to the provider the user configured.
 */
(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  const CONFIG_KEY = 'byoai_config';
  const DB_CACHE_KEY = 'byoai_db_name';
  const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
  const modelListCache = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAFT_KEY = 'byoai_draft';
  const QUICK_PROMPTS = [
    { label: '20-min plan', prompt: 'Give me a 3-step facilitation plan for the next 20 minutes.' },
    { label: 'Next questions', prompt: 'Draft 4 neutral, high-leverage questions I should ask next.' },
    { label: 'Risk scan', prompt: 'Identify risks, power imbalances, and one mitigation for each.' },
    { label: 'Commitments', prompt: 'Turn this into clear commitments with owner, due date, and check-in.' },
  ];

  const GEMINI_MODELS = [
    { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash (recommended)' },
    { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-2.5-pro-preview-03-25',  label: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini-1.5-flash',              label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro',               label: 'Gemini 1.5 Pro' },
  ];

  const OPENAI_MODELS = [
    { id: 'gpt-4.1',      label: 'GPT-4.1 (recommended)' },
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { id: 'o3',           label: 'o3' },
    { id: 'o4-mini',      label: 'o4-mini' },
  ];

  // ── Config ────────────────────────────────────────────────────────────────

  function loadConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
    catch { return null; }
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  // ── IndexedDB helpers ─────────────────────────────────────────────────────

  function idbOpen(name) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    });
  }

  function idbReadAll(db, store) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror  = () => reject(req.error);
    });
  }

  async function discoverDB() {
    const cached = sessionStorage.getItem(DB_CACHE_KEY);
    if (cached) return cached;

    const dbs = await indexedDB.databases();
    const required = ['workspaces', 'matters', 'participants'];

    for (const { name } of dbs) {
      if (!name) continue;
      try {
        const db = await idbOpen(name);
        const stores = Array.from(db.objectStoreNames);
        db.close();
        if (required.every(s => stores.includes(s))) {
          sessionStorage.setItem(DB_CACHE_KEY, name);
          return name;
        }
      } catch { /* skip */ }
    }
    return null;
  }

  const STORES = [
    'workspaces', 'matters', 'participants', 'intakeRecords',
    'issueNodes', 'sessions', 'commitments', 'followUps',
  ];

  async function gatherContext(matterId) {
    const dbName = await discoverDB();
    if (!dbName) return null;

    const db = await idbOpen(dbName);
    const results = await Promise.all(
      STORES.map(s => idbReadAll(db, s).catch(() => []))
    );
    db.close();

    const [workspaces, matters, participants, intakeRecords,
           issueNodes, sessions, commitments, followUps] = results;

    const workspace = workspaces[0] || null;
    const mf = id => r => r.matterId === id;

    if (matterId) {
      return {
        workspace,
        matter:       matters.find(m => m.id === matterId) || null,
        allMatters:   matters,
        participants: participants.filter(mf(matterId)),
        intakeRecords:intakeRecords.filter(mf(matterId)),
        issueNodes:   issueNodes.filter(mf(matterId)),
        sessions:     sessions.filter(mf(matterId)).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)),
        commitments:  commitments.filter(mf(matterId)),
        followUps:    followUps.filter(mf(matterId)),
      };
    }

    return { workspace, matter: null, allMatters: matters,
             participants:[], intakeRecords:[], issueNodes:[],
             sessions:[], commitments:[], followUps:[] };
  }

  // ── Route & matter detection ──────────────────────────────────────────────

  function detectMatterId() {
    const m = location.hash.match(/[?&]id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    // Scan localStorage for UUID-shaped values associated with "matter"
    try {
      for (const k of Object.keys(localStorage)) {
        if (/matter|current/i.test(k)) {
          const v = localStorage.getItem(k);
          if (v && /^[0-9a-f-]{36}$/i.test(v)) return v;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  function detectRoute() {
    return location.hash.replace(/^#\/?/, '').replace(/\?.*$/, '') || 'dashboard';
  }

  function currentDraftKey() {
    const route = detectRoute();
    const matterId = detectMatterId() || 'workspace';
    return `${DRAFT_KEY}:${route}:${matterId}`;
  }

  // ── System prompt builder ─────────────────────────────────────────────────

  function fmt(d) { return d ? new Date(d).toLocaleDateString() : ''; }

  function buildSystemPrompt(ctx, route) {
    const L = [
      'You are an expert conflict-resolution and team-facilitation AI assistant embedded in CommonGround Suite.',
      'You act as the facilitator\'s strategic partner with full access to the current matter\'s data.',
      '',
      '## Your Role',
      '- Offer evidence-based facilitation guidance tailored to the current phase and matter type.',
      '- Suggest specific questions, reframing prompts, and process interventions.',
      '- Draft commitments, summaries, and follow-up plans on request.',
      '- Flag safety concerns, power imbalances, or suitability issues prominently.',
      '- Be trauma-informed, culturally sensitive, and power-aware at all times.',
      '- Adapt tone and depth to the matter type: mediation, team health, performance, or change.',
      '',
      '## Current Screen',
      `Route: **${route}**`,
    ];

    if (ctx?.workspace) {
      L.push('', '## Workspace');
      L.push(`- Name: ${ctx.workspace.name || '(unnamed)'}`);
      if (ctx.workspace.owner) L.push(`- Facilitator: ${ctx.workspace.owner}`);
    }

    if (ctx?.matter) {
      const m = ctx.matter;
      L.push('', '## Active Matter');
      L.push(`- Title: ${m.title || '(untitled)'}`);
      L.push(`- Type: ${m.type || 'unknown'}`);
      L.push(`- Status: ${m.status || 'unknown'}`);
      if (m.suitabilityState) L.push(`- Suitability: ${m.suitabilityState}`);
      if (m.currentPhase) L.push(`- Current phase: ${m.currentPhase}`);
      if (m.createdAt) L.push(`- Created: ${fmt(m.createdAt)}`);
    }

    if (ctx?.participants?.length) {
      L.push('', '## Participants');
      for (const p of ctx.participants) {
        L.push(`- **${p.displayName || 'Unknown'}** (${p.role || 'participant'})`);
      }
    }

    if (ctx?.intakeRecords?.length) {
      L.push('', '## Intake Records');
      for (const r of ctx.intakeRecords) {
        const pName = ctx.participants?.find(p => p.id === r.participantId)?.displayName || 'Unknown';
        L.push(`### ${pName}`);
        if (r.responses?.notes)          L.push(`- Notes: ${r.responses.notes}`);
        if (r.responses?.desiredOutcome) L.push(`- Desired outcome: ${r.responses.desiredOutcome}`);
        if (r.responses?.constraints)    L.push(`- Constraints: ${r.responses.constraints}`);
        const triggered = r.riskFlags?.filter(f => f.triggered) || [];
        if (triggered.length) L.push(`- ⚠ Risk flags: ${triggered.map(f => f.category).join(', ')}`);
      }
    }

    if (ctx?.issueNodes?.length) {
      L.push('', '## Issue Map');
      for (const priority of ['critical', 'high', 'medium', 'low']) {
        const nodes = ctx.issueNodes.filter(n => (n.priority || 'medium') === priority);
        if (!nodes.length) continue;
        L.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`);
        for (const n of nodes) {
          L.push(`- ${n.label || '(no label)'}`);
          if (n.notes) L.push(`  ${n.notes}`);
        }
      }
    }

    if (ctx?.sessions?.length) {
      const recent = ctx.sessions.slice(-3);
      L.push('', `## Session Log (${ctx.sessions.length} total — showing last ${recent.length})`);
      recent.forEach((s, i) => {
        L.push(`### Session ${ctx.sessions.length - recent.length + i + 1}`);
        if (s.phase)  L.push(`- Phase: ${s.phase}`);
        if (s.date || s.createdAt) L.push(`- Date: ${fmt(s.date || s.createdAt)}`);
        if (Array.isArray(s.agenda) && s.agenda.length) L.push(`- Agenda: ${s.agenda.join('; ')}`);
        if (s.notes)  L.push(`- Notes: ${s.notes}`);
      });
    }

    if (ctx?.commitments?.length) {
      L.push('', '## Commitments');
      for (const c of ctx.commitments) {
        L.push(`- [${c.status || 'pending'}] ${c.text || '(no text)'}`);
        if (c.ownerId) {
          const owner = ctx.participants?.find(p => p.id === c.ownerId)?.displayName || c.ownerId;
          L.push(`  Owner: ${owner}`);
        }
        if (c.dueDate) L.push(`  Due: ${fmt(c.dueDate)}`);
      }
    }

    if (ctx?.followUps?.length) {
      L.push('', '## Follow-up Checkpoints');
      for (const f of ctx.followUps) {
        L.push(`- Target: ${f.targetDate ? fmt(f.targetDate) : '(no date set)'}`);
        if (f.result)      L.push(`  Result: ${f.result}`);
        if (f.completedAt) L.push(`  Completed: ${fmt(f.completedAt)}`);
      }
    }

    if (!ctx?.matter && ctx?.allMatters?.length) {
      const shown = ctx.allMatters.slice(0, 5);
      L.push('', `## Matters in Workspace (${ctx.allMatters.length} total)`);
      for (const m of shown)
        L.push(`- ${m.title || '(untitled)'} [${m.status || '?'}] — ${m.type || 'unknown'}`);
      if (ctx.allMatters.length > 5) L.push(`*(and ${ctx.allMatters.length - 5} more)*`);
    }

    const matterLabel = ctx?.matter
      ? `"${ctx.matter.title}" (${ctx.matter.type || 'unknown type'})`
      : 'the current facilitation context';

    L.push(
      '', '## Response Format',
      'Output plain text only. Do not use markdown: no asterisks, no hash headings, no dashes for bullets, no backticks.',
      'Be concise — 3 to 5 sentences, or a short numbered list when listing questions. No lengthy preamble.',
      `Focus all guidance on ${matterLabel}.`,
      'Lead with any safety or ethical flags before other content.',
    );

    return L.join('\n');
  }

  // ── AI API calls ──────────────────────────────────────────────────────────

  async function callGemini(cfg, messages) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const systemMsg = messages.find(m => m.role === 'system');
    // Gemini requires contents to start with a user turn; drop any leading assistant messages
    // (can occur after the initial greeting or at history-trim boundaries).
    const allChat   = messages.filter(m => m.role !== 'system');
    const firstUser = allChat.findIndex(m => m.role === 'user');
    const chatMsgs  = firstUser >= 0 ? allChat.slice(firstUser) : allChat;

    const body = {
      ...(systemMsg && { systemInstruction: { parts: [{ text: systemMsg.content }] } }),
      contents: chatMsgs.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
  }

  async function callOpenAI(cfg, messages) {
    const base = (cfg.endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '(no response)';
  }

  async function callAI(cfg, messages) {
    return cfg.provider === 'gemini' ? callGemini(cfg, messages) : callOpenAI(cfg, messages);
  }

  // ── Design tokens ─────────────────────────────────────────────────────────

  const C = {
    bg:         'rgba(20, 24, 39, 0.65)',
    bgL:        'rgba(37, 43, 61, 0.65)',
    bgLL:       'rgba(45, 52, 80, 0.75)',
    border:     'rgba(255, 255, 255, 0.1)',
    accent:     'linear-gradient(135deg, #4f8ef7 0%, #7b5ea7 100%)',
    accentH:    'linear-gradient(135deg, #6ba3ff 0%, #906ed2 100%)',
    text:       '#f8f9fc',
    muted:      'rgba(255, 255, 255, 0.65)',
    error:      '#ff6b6b',
    userBg:     'linear-gradient(135deg, rgba(45, 52, 80, 0.5) 0%, rgba(45, 52, 80, 0.8) 100%)',
    aiBg:       'linear-gradient(135deg, rgba(79, 142, 247, 0.15) 0%, rgba(123, 94, 167, 0.15) 100%)',
  };

  const inputCSS = `width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.25);color:${C.text};font-size:14px;box-sizing:border-box;transition:all 0.25s ease;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);`;
  const btnCSS   = `display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);cursor:pointer;font-size:13.5px;font-weight:600;touch-action:manipulation;transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);`;

  // Inject Custom Styles to make the app & overlay maximally joyful
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    /* BYOAI Premium UI */
    #byoai-panel { backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); }
    @media (hover: hover) {
      .byoai-btn:hover { transform: translateY(-2px); filter: brightness(1.15); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      #byoai-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
    }
    .byoai-btn:active { transform: translateY(1px); filter: brightness(0.95); box-shadow: none; }
    .byoai-input:focus { border-color: #4f8ef7; box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.25); outline: none; }
    #byoai-body::-webkit-scrollbar { width: 6px; }
    #byoai-body::-webkit-scrollbar-track { background: transparent; }
    #byoai-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 6px; }
    @keyframes byoaiFadeIn { from { opacity: 0; transform: translateY(12px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
    .byoai-msg { animation: byoaiFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes byoaiPulse { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); filter: brightness(1.2); } }
    .byoai-typing-dot { animation: byoaiPulse 1.4s infinite ease-in-out; }
    
    /* Global App Aesthetics Polish (moved to index.html for native loading) */
  `;
  document.head.appendChild(styleEl);

  // ── Panel DOM ─────────────────────────────────────────────────────────────

  function buildPanel() {
    const el = document.createElement('div');
    el.id = 'byoai-panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'AI Facilitator');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `
      position:fixed;inset:0 0 0 auto;width:min(420px,100vw);
      background:${C.bg};border-left:1px solid ${C.border};
      display:flex;flex-direction:column;z-index:99999;
      font-family:'Inter',system-ui,-apple-system,sans-serif;
      color:${C.text};box-shadow:-8px 0 40px rgba(0,0,0,0.6);
      transform:translateX(100%);${reducedMotion ? '' : 'transition:transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);'}
    `;
    el.innerHTML = `
      <div style="padding:max(16px,env(safe-area-inset-top,0px)) 16px 14px;border-bottom:1px solid ${C.border};
                  display:flex;align-items:center;gap:10px;flex-shrink:0;background:rgba(255,255,255,0.02);">
        <span aria-hidden="true" style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🤝</span>
        <span style="font-weight:700;font-size:15px;flex:1;letter-spacing:0.02em;">AI Facilitator</span>
        <button id="byoai-btn-settings" class="byoai-btn" aria-label="Settings"
          style="${btnCSS}background:transparent;color:${C.muted};padding:6px 10px;font-size:15px;">⚙</button>
        <button id="byoai-btn-close" class="byoai-btn" aria-label="Close panel"
          style="${btnCSS}background:transparent;color:${C.muted};padding:6px 10px;font-size:15px;">✕</button>
      </div>
      <div id="byoai-body" style="flex:1;overflow-y:auto;padding:16px;
           display:flex;flex-direction:column;gap:12px;" role="log" aria-live="polite"></div>
      <div id="byoai-footer" style="padding:12px 16px max(14px,env(safe-area-inset-bottom,0px)) 16px;border-top:1px solid ${C.border};
           display:flex;gap:10px;flex-shrink:0;align-items:flex-end;background:rgba(255,255,255,0.01);">
        <textarea id="byoai-input" class="byoai-input" rows="1" placeholder="Ask the AI facilitator…"
          aria-label="Message to AI facilitator"
          style="${inputCSS}resize:none;flex:1;line-height:1.5;max-height:140px;overflow-y:auto;"></textarea>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button id="byoai-btn-send" class="byoai-btn" aria-label="Send message"
            style="${btnCSS}background:${C.accent};color:#fff;padding:10px 14px;box-shadow:0 4px 12px rgba(79,142,247,0.3);">▶</button>
          <button id="byoai-btn-clear-chat" class="byoai-btn" aria-label="Clear chat" title="Clear chat history"
            style="${btnCSS}background:rgba(255,255,255,0.05);color:${C.muted};padding:6px;font-size:12px;">🧹</button>
          <button id="byoai-btn-refresh" class="byoai-btn" aria-label="Refresh context" title="Refresh context from app data"
            style="${btnCSS}background:rgba(255,255,255,0.05);color:${C.muted};padding:6px;font-size:12px;">↻</button>
        </div>
      </div>
    `;
    return el;
  }

  function buildBackdrop() {
    const el = document.createElement('div');
    el.id = 'byoai-backdrop';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `
      position:fixed;inset:0;z-index:99997;background:rgba(0,0,0,0.4);
      opacity:0;pointer-events:none;${reducedMotion ? '' : 'transition:opacity 0.2s ease;'}
    `;
    el.addEventListener('click', () => {
      if (state.open) closePanel();
    });
    return el;
  }

  // ── Settings view ─────────────────────────────────────────────────────────

  function renderSettings() {
    const cfg  = loadConfig() || {};
    const body = document.getElementById('byoai-body');
    body.innerHTML = '';
    document.getElementById('byoai-footer').style.display = 'none';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:4px 2px;';
    wrap.innerHTML = `
      <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;">API Configuration</h3>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-sel-provider">Provider</label>
        <select id="byoai-sel-provider" style="${inputCSS}">
          <option value="gemini" ${cfg.provider==='gemini'?'selected':''}>Google Gemini</option>
          <option value="openai" ${cfg.provider==='openai'?'selected':''}>OpenAI / Compatible</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-inp-key">API Key</label>
        <input type="password" id="byoai-inp-key" autocomplete="off" spellcheck="false"
          placeholder="Paste your API key here"
          style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};line-height:1.4;">
          Stored in your browser only. Sent exclusively to your chosen AI provider.
        </p>
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-sel-model">Model</label>
        <select id="byoai-sel-model" style="${inputCSS}margin-bottom:6px;"></select>
        <input type="text" id="byoai-inp-model-custom" placeholder="Or enter a custom model ID"
          value="" style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};">Custom ID overrides the selection above.</p>
        <p id="byoai-model-status" style="margin:4px 0 0;font-size:11px;color:${C.muted};"></p>
      </div>

      <div id="byoai-endpoint-row" style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-inp-endpoint">
          Base URL <span style="font-weight:400;">(OpenAI-compatible)</span>
        </label>
        <input type="url" id="byoai-inp-endpoint" class="byoai-input"
          placeholder="https://api.openai.com/v1"
          style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};">
          Works with Groq, Mistral, Together AI, local Ollama, and any OpenAI-compatible server.
        </p>
      </div>

      <button id="byoai-btn-save" class="byoai-btn"
        style="${btnCSS}background:${C.accent};color:#fff;width:100%;margin-top:4px;box-shadow:0 4px 16px rgba(79,142,247,0.25);">
        Save &amp; Start
      </button>
      <button id="byoai-btn-clear" class="byoai-btn"
        style="${btnCSS}background:rgba(255,107,107,0.1);color:${C.error};width:100%;margin-top:8px;border:1px solid rgba(255,107,107,0.3);">
        Clear Saved Key
      </button>
    `;
    body.appendChild(wrap);

    const selProvider  = document.getElementById('byoai-sel-provider');
    const selModel     = document.getElementById('byoai-sel-model');
    const inpEndpoint  = document.getElementById('byoai-endpoint-row');
    const inpModelCust = document.getElementById('byoai-inp-model-custom');
    const inpKey       = document.getElementById('byoai-inp-key');
    const modelStatus  = document.getElementById('byoai-model-status');
    const inpEndpointUrl = document.getElementById('byoai-inp-endpoint');

    // Set user-supplied values via DOM to avoid HTML injection via template literals
    inpKey.value = cfg.apiKey || '';
    inpEndpointUrl.value = cfg.endpoint || 'https://api.openai.com/v1';

    function renderModelOptions(models, preferred) {
      const prev = preferred || selModel.value;
      selModel.innerHTML = '';
      for (const m of models) {
        const id = m.id || String(m);
        const label = m.label || String(m);
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        opt.selected = prev === id;
        selModel.appendChild(opt);
      }
    }

    async function discoverModels(provider, apiKey, endpoint) {
      const keyFingerprint = `${apiKey.length}:${apiKey.slice(0,2)}:${apiKey.slice(-2)}`;
      const cacheKey = `${provider}|${endpoint || ''}|${keyFingerprint}`;
      const cached = modelListCache.get(cacheKey);
      if (cached && (Date.now() - cached.ts) < MODEL_CACHE_TTL_MS) {
        return cached.models;
      }

      let models;
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Gemini model list error ${res.status}`);
        const data = await res.json();
        models = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => String(m.name || '').split('/').pop())
          .filter(Boolean);
      } else {
        const base = (endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
        const res = await fetch(`${base}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`OpenAI model list error ${res.status}`);
        const data = await res.json();
        models = (data.data || []).map(m => m.id).filter(Boolean);
      }
      modelListCache.set(cacheKey, { ts: Date.now(), models });
      return models;
    }

    function syncProvider(provider) {
      const models = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
      renderModelOptions(models, cfg.model);
      inpEndpoint.style.display = provider === 'openai' ? 'block' : 'none';
    }

    let modelReqId = 0;

    async function autoPopulateModels() {
      const reqId = ++modelReqId;
      const provider = selProvider.value;
      const fallback = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
      const apiKey = inpKey.value.trim();
      const endpoint = inpEndpointUrl.value.trim();
      const preferred = selModel.value || cfg.model;
      syncProvider(provider);
      if (!apiKey) { modelStatus.textContent = 'Enter API key to auto-load available models.'; return; }
      modelStatus.textContent = 'Loading models from provider…';
      try {
        const models = await discoverModels(provider, apiKey, endpoint);
        if (reqId !== modelReqId) return;
        if (models.length === 0) throw new Error('No models returned');
        renderModelOptions(models, preferred);
        modelStatus.textContent = `Loaded ${models.length} models from provider.`;
      } catch (e) {
        if (reqId !== modelReqId) return;
        renderModelOptions(fallback, preferred);
        modelStatus.textContent = `Could not auto-load models (${e?.message || 'unknown error'}). Using defaults.`;
      }
    }

    let autoPopulateTimer = null;
    function scheduleAutoPopulate() {
      if (autoPopulateTimer !== null) clearTimeout(autoPopulateTimer);
      autoPopulateTimer = setTimeout(() => {
        autoPopulateTimer = null;
        autoPopulateModels();
      }, 350);
    }

    syncProvider(selProvider.value);
    autoPopulateModels();
    selProvider.addEventListener('change', autoPopulateModels);
    inpKey.addEventListener('input', scheduleAutoPopulate);
    inpKey.addEventListener('change', autoPopulateModels);
    inpEndpointUrl.addEventListener('input', scheduleAutoPopulate);
    inpEndpointUrl.addEventListener('change', autoPopulateModels);

    document.getElementById('byoai-btn-save').addEventListener('click', () => {
      const provider    = selProvider.value;
      const apiKey      = inpKey.value.trim();
      const customModel = inpModelCust.value.trim();
      const model       = customModel || selModel.value;
      const endpoint    = inpEndpointUrl.value.trim();

      if (!apiKey) { alert('Please enter an API key.'); return; }
      if (!model)  { alert('Please select or enter a model ID.'); return; }

      saveConfig({
        provider,
        apiKey,
        model,
        ...(provider === 'openai' && endpoint ? { endpoint } : {}),
      });

      state.settingsOpen = false;
      state.history = [];
      renderChat();
      loadContextAndGreet();
    });

    document.getElementById('byoai-btn-clear').addEventListener('click', () => {
      if (!confirm('Clear your saved API key and settings?')) return;
      localStorage.removeItem(CONFIG_KEY);
      renderSettings();
    });
  }

  // ── Chat view ─────────────────────────────────────────────────────────────

  function renderChat() {
    const body = document.getElementById('byoai-body');
    body.innerHTML = '';

    for (const msg of state.history) {
      if (msg.role !== 'system') appendBubble(msg.role, msg.content, false);
    }
    renderQuickPrompts();

    body.scrollTop = body.scrollHeight;
    document.getElementById('byoai-footer').style.display = 'flex';
    updateSendState();
  }

  function renderQuickPrompts() {
    if (state.history.some(m => m.role === 'user')) return;
    const body = document.getElementById('byoai-body');
    if (!body) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;`;
    for (const { label, prompt } of QUICK_PROMPTS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'byoai-btn';
      btn.setAttribute('aria-label', prompt);
      btn.style.cssText = `${btnCSS}background:rgba(255,255,255,0.03);color:${C.text};padding:8px 12px;text-align:left;border-radius:8px;font-weight:500;font-size:13px;`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        const input = document.getElementById('byoai-input');
        if (!input) return;
        input.value = prompt;
        autoResizeInput();
        updateSendState();
        input.focus();
      });
      wrap.appendChild(btn);
    }
    body.appendChild(wrap);
  }

  function appendBubble(role, content, autoScroll = true) {
    const body  = document.getElementById('byoai-body');
    if (!body) return;
    const isAI  = role === 'assistant';

    const header = document.createElement('div');
    header.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:3px;`;

    const label = document.createElement('div');
    label.style.cssText = `font-size:10px;color:${C.muted};`;
    label.textContent = isAI ? '🤝 AI Facilitator' : '👤 You';
    header.appendChild(label);

    if (isAI) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.setAttribute('aria-label', 'Copy response');
      copyBtn.style.cssText = `${btnCSS}padding:2px 6px;font-size:10px;background:${C.bgLL};color:${C.muted};border:1px solid ${C.border};`;
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(content);
          copyBtn.textContent = 'Copied';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        } catch {
          copyBtn.textContent = 'Unavailable';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        }
      });
      header.appendChild(copyBtn);
    }

    const bubble = document.createElement('div');
    bubble.className = 'byoai-msg';
    bubble.style.cssText = `
      padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.55;
      background:${isAI ? C.aiBg : C.userBg};border:1px solid ${C.border};
      word-wrap:break-word;max-width:100%;${isAI ? 'white-space:pre-wrap;' : ''}
    `;
    bubble.textContent = content;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${isAI?'flex-start':'flex-end'};`;
    wrapper.appendChild(header);
    wrapper.appendChild(bubble);

    body.appendChild(wrapper);
    if (autoScroll) body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const body = document.getElementById('byoai-body');
    if (!body) return;
    const el = document.createElement('div');
    el.id = 'byoai-typing';
    el.className = 'byoai-msg';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = `font-size:13px;color:${C.muted};padding:8px 12px;display:flex;align-items:center;gap:6px;`;
    el.innerHTML = `AI Facilitator is thinking <div class="byoai-typing-dot" style="width:6px;height:6px;border-radius:50%;background:${C.muted};"></div><div class="byoai-typing-dot" style="width:6px;height:6px;border-radius:50%;background:${C.muted};animation-delay:0.2s"></div><div class="byoai-typing-dot" style="width:6px;height:6px;border-radius:50%;background:${C.muted};animation-delay:0.4s"></div>`;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('byoai-typing')?.remove();
  }

  // ── Context loading ───────────────────────────────────────────────────────

  async function loadContextAndGreet() {
    const cfg = loadConfig();
    if (!cfg) { state.settingsOpen = true; renderSettings(); return; }

    const route    = detectRoute();
    const matterId = detectMatterId();

    try {
      state.ctx = await gatherContext(matterId);
    } catch {
      state.ctx = null;
    }

    const sysPrompt = buildSystemPrompt(state.ctx, route);
    state.history = [{ role: 'system', content: sysPrompt }];

    renderChat();
    showTyping();

    const matterContext = state.ctx?.matter
      ? ` for "${state.ctx.matter.title}" (${state.ctx.matter.type || 'unknown'})`
      : '';
    const seed = [
      { role: 'system', content: sysPrompt },
      {
        role: 'user',
        content: `I'm on the "${route}" screen${matterContext}. Give 2-3 specific, actionable facilitation suggestions for right now. Plain text only, no formatting.`,
      },
    ];

    try {
      const reply = await callAI(cfg, seed);
      hideTyping();
      state.history.push({ role: 'assistant', content: reply });
      appendBubble('assistant', reply);
    } catch (e) {
      hideTyping();
      appendBubble('assistant', `⚠ Could not reach AI: ${e.message}\n\nCheck your API key and network connection in Settings (⚙).`);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────

  async function sendMessage() {
    if (state.busy) return;
    const cfg = loadConfig();
    if (!cfg) { state.settingsOpen = true; renderSettings(); return; }

    const input = document.getElementById('byoai-input');
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';
    sessionStorage.removeItem(currentDraftKey());
    autoResizeInput();
    state.history.push({ role: 'user', content: text });
    appendBubble('user', text);
    updateSendState();

    state.busy = true;
    const sendBtn = document.getElementById('byoai-btn-send');
    if (sendBtn) sendBtn.disabled = true;
    showTyping();

    try {
      // Keep system prompt + last 20 messages to avoid context-window overflow
      const msgs = state.history.length > 21
        ? [state.history[0], ...state.history.slice(-20)]
        : state.history;
      const reply = await callAI(cfg, msgs);
      state.history.push({ role: 'assistant', content: reply });
      hideTyping();
      appendBubble('assistant', reply);
    } catch (e) {
      state.history.pop(); // remove the unresponded user turn to keep history alternating
      hideTyping();
      appendBubble('assistant', `⚠ Error: ${e.message}`);
    } finally {
      state.busy = false;
      if (sendBtn) sendBtn.disabled = false;
      updateSendState();
    }
  }

  function autoResizeInput() {
    const input = document.getElementById('byoai-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }

  function updateSendState() {
    const input = document.getElementById('byoai-input');
    const sendBtn = document.getElementById('byoai-btn-send');
    if (!input || !sendBtn) return;
    const disabled = state.busy || input.value.trim().length === 0;
    sendBtn.disabled = disabled;
    sendBtn.style.opacity = disabled ? '0.55' : '1';
    sendBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  // ── Toggle button ─────────────────────────────────────────────────────────

  function buildToggle() {
    const btn = document.createElement('button');
    btn.id = 'byoai-toggle';
    btn.setAttribute('aria-label', 'Open AI Facilitator');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'byoai-panel');
    btn.setAttribute('title', 'AI Facilitator');
    btn.style.cssText = `
      position:fixed;bottom:calc(22px + env(safe-area-inset-bottom,0px));right:calc(22px + env(safe-area-inset-right,0px));z-index:99998;
      width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);cursor:pointer;
      background:linear-gradient(135deg,#4f8ef7 0%,#7b5ea7 100%);
      color:#fff;font-size:24px;
      box-shadow:0 8px 24px rgba(79,142,247,0.35);backdrop-filter:blur(8px);
      touch-action:manipulation;display:flex;align-items:center;justify-content:center;
      ${reducedMotion ? '' : 'transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),box-shadow 0.3s ease;'}
    `;
    btn.textContent = '🤝';
    if (!reducedMotion) {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = '0 6px 22px rgba(79,142,247,0.65)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 16px rgba(79,142,247,0.45)';
      });
    }
    btn.addEventListener('click', togglePanel);
    return btn;
  }

  // ── State & panel lifecycle ───────────────────────────────────────────────

  const state = {
    backdropEl:   null,
    panelEl:      null,
    open:         false,
    settingsOpen: false,
    history:      [],  // { role, content }[]
    ctx:          null,
    busy:         false,
  };

  function closePanel() {
    state.open = false;
    state.panelEl.style.transform = 'translateX(100%)';
    state.panelEl.setAttribute('aria-hidden', 'true');
    if (state.backdropEl) {
      state.backdropEl.style.opacity = '0';
      state.backdropEl.style.pointerEvents = 'none';
      state.backdropEl.setAttribute('aria-hidden', 'true');
    }
    const toggleBtn = document.getElementById('byoai-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Open AI Facilitator');
      toggleBtn.focus();
    }
  }

  function trapFocus(e) {
    if (!state.open || !state.panelEl || e.key !== 'Tab') return;
    const focusable = state.panelEl.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function togglePanel() {
    if (!state.panelEl) initPanel();

    state.open = !state.open;
    state.panelEl.style.transform = state.open ? 'translateX(0)' : 'translateX(100%)';
    state.panelEl.setAttribute('aria-hidden', state.open ? 'false' : 'true');
    if (state.backdropEl) {
      state.backdropEl.style.opacity = state.open ? '1' : '0';
      state.backdropEl.style.pointerEvents = state.open ? 'auto' : 'none';
      state.backdropEl.setAttribute('aria-hidden', state.open ? 'false' : 'true');
    }

    const toggleBtn = document.getElementById('byoai-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', state.open ? 'true' : 'false');
      toggleBtn.setAttribute('aria-label', state.open ? 'Close AI Facilitator' : 'Open AI Facilitator');
    }

    if (state.open) {
      if (state.history.length === 0 && !state.settingsOpen) {
        if (!loadConfig()) { state.settingsOpen = true; renderSettings(); }
        else loadContextAndGreet();
      }
      requestAnimationFrame(() => {
        const target = state.settingsOpen
          ? document.getElementById('byoai-sel-provider')
          : document.getElementById('byoai-input');
        target?.focus();
      });
    } else {
      toggleBtn?.focus();
    }
  }

  function initPanel() {
    state.backdropEl = buildBackdrop();
    document.body.appendChild(state.backdropEl);
    state.panelEl = buildPanel();
    document.body.appendChild(state.panelEl);

    document.getElementById('byoai-btn-close').addEventListener('click', () => {
      closePanel();
    });

    document.getElementById('byoai-btn-settings').addEventListener('click', () => {
      state.settingsOpen = !state.settingsOpen;
      if (state.settingsOpen) {
        renderSettings();
      } else {
        if (state.history.length === 0) loadContextAndGreet();
        else renderChat();
      }
    });

    document.getElementById('byoai-btn-send').addEventListener('click', sendMessage);

    const input = document.getElementById('byoai-input');
    const draft = sessionStorage.getItem(currentDraftKey());
    if (draft) input.value = draft;
    autoResizeInput();
    updateSendState();
    input.addEventListener('input', () => {
      sessionStorage.setItem(currentDraftKey(), input.value);
      autoResizeInput();
      updateSendState();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    document.getElementById('byoai-btn-refresh').addEventListener('click', () => {
      state.history = [];
      loadContextAndGreet();
    });
    document.getElementById('byoai-btn-clear-chat').addEventListener('click', () => {
      if (!confirm('Clear this chat history?')) return;
      state.history = state.history.filter(m => m.role === 'system');
      renderChat();
      const inputEl = document.getElementById('byoai-input');
      inputEl?.focus();
    });
  }

  // ── Keyboard: Escape closes panel ────────────────────────────────────────

  document.addEventListener('keydown', e => {
    trapFocus(e);
    if (e.key === 'Escape' && state.open) {
      e.preventDefault();
      closePanel();
    }
  });

  // ── SPA route watcher ─────────────────────────────────────────────────────

  window.addEventListener('hashchange', () => {
    if (state.open && !state.settingsOpen) {
      state.history = [];
      loadContextAndGreet();
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  function boot() {
    document.body.appendChild(buildToggle());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
