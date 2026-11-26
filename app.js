(function () {
  "use strict";

  const STORAGE_KEY = "pokeca_binder_clean_v20";
  const GEMINI_KEY_STORAGE = "pokeca_gemini_api_key";
  const GEMINI_MODEL_STORAGE = "pokeca_gemini_model";
  const LAST_BACKUP_STORAGE = "pokeca_last_backup_at";
  const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
  const DB_NAME = "PokecaPhotoDB";
  const DB_STORE = "photos";

  const POKEMON_TYPES = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "ドラゴン", "無色"];
  const TRAINER_TYPES = ["グッズ", "ポケモンのどうぐ", "サポート", "スタジアム", "エネルギー"];
  const TYPE_OPTIONS = [...POKEMON_TYPES, ...TRAINER_TYPES];
  const RARITY_OPTIONS = ["C", "U", "R", "RR", "RRR", "AR", "MA", "SR", "SAR", "UR", "MUR", "FUR", "30th", "ACE", "PROMO", "-"];
  const DEFAULT_REGULATIONS = ["J", "I", "H", "G", "F", "E以前"];

  const STATUS_PILL_OPTIONS = [
    { id: "OWNED", icon: "✅", label: "所持済み" },
    { id: "UNOWNED_REG", icon: "🌑", label: "未所持（0枚）" },
    { id: "EMPTY_SLOT", icon: "⬜", label: "未登録（空枠のみ）" },
    { id: "WISH", icon: "★", label: "欲しいカード" },
    { id: "SECRET", icon: "✨", label: "シークレット枠" }
  ];

  const TYPE_META = {
    "草": { icon: "🌿", border: "#22c55e", tint: "#f0fdf4" },
    "炎": { icon: "🔥", border: "#ef4444", tint: "#fef2f2" },
    "水": { icon: "💧", border: "#3b82f6", tint: "#eff6ff" },
    "雷": { icon: "⚡", border: "#eab308", tint: "#fefce8" },
    "超": { icon: "🔮", border: "#a855f7", tint: "#faf5ff" },
    "闘": { icon: "✊", border: "#d97706", tint: "#fffbeb" },
    "悪": { icon: "🌑", border: "#334155", tint: "#f1f5f9" },
    "鋼": { icon: "⚙️", border: "#64748b", tint: "#f8fafc" },
    "ドラゴン": { icon: "🐉", border: "#ca8a04", tint: "#fefce8" },
    "無色": { icon: "⭐", border: "#94a3b8", tint: "#f8fafc" },
    "グッズ": { icon: "🎒", border: "#0ea5e9", tint: "#f0f9ff" },
    "ポケモンのどうぐ": { icon: "🛠️", border: "#8b5cf6", tint: "#f5f3ff" },
    "サポート": { icon: "🧑", border: "#f97316", tint: "#fff7ed" },
    "スタジアム": { icon: "🏟️", border: "#10b981", tint: "#ecfdf5" },
    "エネルギー": { icon: "🔋", border: "#14b8a6", tint: "#f0fdfa" }
  };

  const PACK_THEMES = {
    purple: "linear-gradient(135deg, #4f46e5 0%, #9333ea 55%, #db2777 100%)",
    emerald: "linear-gradient(135deg, #059669 0%, #10b981 60%, #0d9488 100%)",
    blue: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0284c7 100%)",
    sunset: "linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)",
    crimson: "linear-gradient(135deg, #be123c 0%, #ef4444 100%)",
    gold: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)"
  };

  const SECRET_RARITIES = new Set(["AR", "MA", "SR", "SAR", "UR", "MUR", "FUR", "30th", "SSR", "CSR", "CHR"]);

  /* ================= 診断エラー表示 & 安全ヘルパー ================= */
  const missingIds = [];
  function showDiagError(msg) {
    let bar = document.getElementById("pokecaDiagBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "pokecaDiagBar";
      bar.style.cssText = "position:fixed;top:8px;left:8px;right:8px;z-index:9999;background:#b91c1c;color:#fff;padding:10px 12px;border-radius:12px;font-size:12px;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,0.35);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;";
      document.body.appendChild(bar);
    }
    bar.innerHTML = `<div style="word-break:break-all;">⚠️ エラー検出: ${escapeHtml(msg)}</div><button type="button" style="color:#fff;font-weight:900;font-size:14px;padding:0 4px;" onclick="this.parentElement.remove()">✕</button>`;
  }

  window.addEventListener("error", (e) => {
    showDiagError((e && e.message) ? `${e.message} (line ${e.lineno || "?"})` : "スクリプトエラー");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    showDiagError(r && r.message ? r.message : String(r || "非同期エラー"));
  });

  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn, opts) {
    const el = $(id);
    if (el) el.addEventListener(ev, fn, opts);
    else missingIds.push(id);
  }

  /* iOS Safariでdisplay:noneのfile inputが無反応になるのを防ぐ */
  function patchFileInputsForIOS() {
    ["cameraInput", "albumInput", "batchAlbumInput", "jsonImportInput"].forEach((id) => {
      const inp = $(id);
      if (!inp) return;
      inp.style.display = "block";
      inp.style.position = "fixed";
      inp.style.left = "-9999px";
      inp.style.top = "0";
      inp.style.width = "1px";
      inp.style.height = "1px";
      inp.style.opacity = "0";
      inp.style.pointerEvents = "none";
    });
  }

  function createEmptyNinePacks() {
    const specs = [
      { id: "pack_m1s", name: "メガシンフォニア", code: "M1S", releaseDate: "2025-08-01", defaultReg: "I", regularTotal: 63, total: 92, theme: "purple" },
      { id: "pack_m1l", name: "メガブレイブ", code: "M1L", releaseDate: "2025-08-01", defaultReg: "I", regularTotal: 63, total: 92, theme: "crimson" },
      { id: "pack_m2", name: "インフェルノX", code: "M2", releaseDate: "2025-09-26", defaultReg: "I", regularTotal: 80, total: 116, theme: "crimson" },
      { id: "pack_m2a", name: "MEGAドリームex", code: "M2a", releaseDate: "2025-11-28", defaultReg: "I", regularTotal: 193, total: 250, theme: "sunset" },
      { id: "pack_m3", name: "ムニキスゼロ", code: "M3", releaseDate: "2026-01-23", defaultReg: "J", regularTotal: 80, total: 117, theme: "emerald" },
      { id: "pack_m4", name: "ニンジャスピナー", code: "M4", releaseDate: "2026-03-13", defaultReg: "J", regularTotal: 83, total: 120, theme: "blue" },
      { id: "pack_m5", name: "アビスアイ", code: "M5", releaseDate: "2026-05-22", defaultReg: "J", regularTotal: 81, total: 119, theme: "blue" },
      { id: "pack_m6", name: "ストームエメラルダ", code: "M6", releaseDate: "2026-07-31", defaultReg: "J", regularTotal: 76, total: 113, theme: "emerald" },
      { id: "pack_m6a", name: "30th CELEBRATION", code: "M6a", releaseDate: "2026-09-16", defaultReg: "J", regularTotal: 103, total: 165, theme: "gold" }
    ];
    return specs.map((s) => ({ ...s, collapsed: false, cards: {} }));
  }

  let state = { viewMode: "grid", packSort: "manual", deckSort: "manual", regulations: [...DEFAULT_REGULATIONS], packs: [], decks: [] };
  const photoCache = new Map();
  let dbInstance = null;

  let filterState = { query: "", types: new Set(), trainers: new Set(), regulations: new Set(), statuses: new Set() };
  let viewingTarget = null, tempPhotoDataUrl = null, tempHasPhoto = false, isNavigatingViewer = false, sheetProgress = 0;
  let viewerZoomScale = 1, viewerPanX = 0, viewerPanY = 0;

  let isPickingForDeck = false, editingDeckId = null, tempDeckCards = [], activeDetailDeckId = null;
  let cropImg = null, cropScale = 1, cropOffsetX = 0, cropOffsetY = 0, cropRotation = 0, isDraggingCrop = false, dragStartX = 0, dragStartY = 0;
  let batchPackId = null, batchItems = [], editingPackId = null, confirmCallback = null;
  let deckZoomCards = [], deckZoomIdx = 0, dzScale = 1, dzPanX = 0, dzPanY = 0;
  let drawTestDeckPool = [], drawTestDrawnCount = 0;
  let ocrWorkerPromise = null;

  /* ================= Gemini API & バックアップ日時 ================= */
  function getGeminiApiKey() { try { return (localStorage.getItem(GEMINI_KEY_STORAGE) || "").trim(); } catch (_) { return ""; } }
  function getGeminiModel() { try { return localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL; } catch (_) { return DEFAULT_GEMINI_MODEL; } }
  function recordBackupTimestamp() {
    try {
      const now = new Date();
      const str = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      localStorage.setItem(LAST_BACKUP_STORAGE, str);
      refreshBackupBadge();
    } catch (_) {}
  }
  function refreshBackupBadge() {
    const badge = $("lastBackupDateBadge");
    if (!badge) return;
    try {
      const val = localStorage.getItem(LAST_BACKUP_STORAGE);
      badge.textContent = val ? `最終: ${val}` : "未実施";
    } catch (_) {}
  }

  function refreshGeminiUiStatus() {
    const key = getGeminiApiKey(), model = getGeminiModel();
    const badge = $("aiModeStatusBadge"), keyInp = $("geminiApiKeyInput"), modSel = $("geminiModelSelect"), aiBtn = $("viewerAiReadBtn");
    if (keyInp && document.activeElement !== keyInp) keyInp.value = key;
    if (modSel) modSel.value = model;
    if (badge) {
      if (key) { badge.className = "ai-mode-badge is-gemini"; badge.textContent = `✨ Gemini AI有効 (${model})`; }
      else { badge.className = "ai-mode-badge is-offline"; badge.textContent = "オフライン解析（API未設定）"; }
    }
    if (aiBtn) aiBtn.textContent = key ? "✨ Gemini AI" : "✨ AI入力";
    refreshBackupBadge();
  }

  function getAllRegulations() {
    const list = Array.isArray(state.regulations) && state.regulations.length > 0 ? state.regulations : [...DEFAULT_REGULATIONS];
    return [...list, "-"];
  }

  function showLoadingModal(title, sub, pct) {
    const el = $("loadingOverlay");
    if (!el) return;
    if ($("loadingTitleText")) $("loadingTitleText").textContent = title || "読み込み中...";
    if ($("loadingSubText")) $("loadingSubText").textContent = sub || "";
    if ($("loadingBarFill")) $("loadingBarFill").style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
    el.classList.add("is-open");
  }
  function hideLoadingModal() { if ($("loadingOverlay")) $("loadingOverlay").classList.remove("is-open"); }

  /* ================= IndexedDB & Storage ================= */
  function initDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
        };
        req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  }
  function getPhotoKey(packId, slotNum) { return `${packId}__${slotNum}`; }
  function savePhotoToDB(key, dataUrl) {
    photoCache.set(key, dataUrl);
    return new Promise((resolve) => {
      if (!dbInstance) return resolve();
      try {
        const tx = dbInstance.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(dataUrl, key);
        tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
      } catch (_) { resolve(); }
    });
  }
  function deletePhotoFromDB(key) {
    photoCache.delete(key);
    return new Promise((resolve) => {
      if (!dbInstance) return resolve();
      try {
        const tx = dbInstance.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(key);
        tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
      } catch (_) { resolve(); }
    });
  }
  function loadAllPhotosFromDB() {
    return new Promise((resolve) => {
      if (!dbInstance) return resolve();
      try {
        const tx = dbInstance.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) { photoCache.set(cursor.key, cursor.value); cursor.continue(); }
          else resolve();
        };
        req.onerror = () => resolve();
      } catch (_) { resolve(); }
    });
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }
  function loadState() {
    try {
      const keys = [STORAGE_KEY, "pokeca_binder_clean_v19", "pokeca_binder_clean_v18", "pokeca_binder_clean_v17", "pokeca_binder_clean_v16", "pokeca_binder_clean_v15", "pokeca_binder_clean_v14", "pokeca_binder_clean_v13", "pokeca_binder_clean_v12", "pokeca_binder_clean_v11", "pokeca_binder_clean_v10", "pokeca_binder_clean_v9", "pokeca_binder_clean_v8"];
      let raw = null;
      for (const k of keys) { raw = localStorage.getItem(k); if (raw) break; }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.packs)) {
          const regs = Array.isArray(parsed.regulations) && parsed.regulations.length > 0 ? parsed.regulations : [...DEFAULT_REGULATIONS];
          parsed.packs.forEach((p) => {
            if (!p.cards || typeof p.cards !== "object") p.cards = {};
            if (!p.defaultReg) p.defaultReg = (p.releaseDate && p.releaseDate >= "2026-01-01") ? "J" : "I";
            if (!regs.includes(p.defaultReg) && p.defaultReg !== "-") regs.unshift(p.defaultReg);
          });
          const decks = Array.isArray(parsed.decks) ? parsed.decks.map((d) => ({ ...d, cards: Array.isArray(d.cards) ? d.cards : [] })) : [];
          state = {
            viewMode: parsed.viewMode || "grid",
            packSort: parsed.packSort || "manual",
            deckSort: parsed.deckSort || "manual",
            regulations: regs,
            packs: parsed.packs,
            decks
          };
          syncAllDecksInUseCounts();
          return;
        }
      }
    } catch (_) {}
    state = { viewMode: "grid", packSort: "manual", deckSort: "manual", regulations: [...DEFAULT_REGULATIONS], packs: createEmptyNinePacks(), decks: [] };
    saveState();
  }

  function updateHostBannerOffset() {
    let maxH = 0;
    const vh = window.innerHeight;
    document.querySelectorAll("body > div, body > aside, body > iframe").forEach((el) => {
      if (el.id || el.className) return;
      const st = window.getComputedStyle(el);
      if (st.position === "fixed" && st.display !== "none") {
        const r = el.getBoundingClientRect();
        if (r.height > 10 && r.height < 140 && r.bottom >= vh - 8) maxH = Math.max(maxH, Math.ceil(r.height));
      }
    });
    if (maxH === 0 && /tiiny\.(site|host)/i.test(window.location.hostname)) maxH = 52;
    document.documentElement.style.setProperty("--host-bottom-offset", `${maxH}px`);
  }

  function todayIsoDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* ================= デッキ使用中枚数の図鑑同期 ================= */
  function normalizeCardKey(str) {
    return String(str || "").replace(/[０-９Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, "").toLowerCase();
  }
  function getOrderedDecks() {
    const list = [...(state.decks || [])];
    if (state.deckSort === "newest") list.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || "") || (b.createdAt || 0) - (a.createdAt || 0));
    else if (state.deckSort === "oldest") list.sort((a, b) => (a.createdDate || "").localeCompare(b.createdDate || "") || (a.createdAt || 0) - (b.createdAt || 0));
    return list;
  }
  function resolvePackByAnyIdOrCode(rawId) {
    if (!rawId) return null;
    const key = normalizeCardKey(rawId);
    return state.packs.find((p) =>
      String(p.id) === String(rawId) ||
      normalizeCardKey(p.id) === key ||
      normalizeCardKey(`pack_${p.code}`) === key ||
      normalizeCardKey(p.code) === key ||
      normalizeCardKey(p.name) === key
    ) || null;
  }

  function syncAllDecksInUseCounts() {
    const usageBySlotKey = new Map();
    const deckNamesBySlotKey = new Map();

    (state.decks || []).forEach((deck) => {
      (deck.cards || []).forEach((dc) => {
        const cnt = Number(dc.count) || 0;
        if (cnt <= 0) return;

        let matchedPack = dc.packId ? resolvePackByAnyIdOrCode(dc.packId) : null;
        let targetSlotNum = (dc.slotNum !== null && dc.slotNum !== undefined && dc.slotNum !== "") ? Number(dc.slotNum) : null;

        if (!matchedPack || !targetSlotNum || isNaN(targetSlotNum) || targetSlotNum < 1) {
          const found = findCardInBinder({ name: dc.name });
          if (found) { matchedPack = resolvePackByAnyIdOrCode(found.packId); targetSlotNum = Number(found.slotNum); }
        }

        if (matchedPack && targetSlotNum >= 1 && targetSlotNum <= matchedPack.total) {
          dc.packId = matchedPack.id;
          dc.slotNum = targetSlotNum;
          if (!matchedPack.cards || typeof matchedPack.cards !== "object") matchedPack.cards = {};

          if (!matchedPack.cards[targetSlotNum]) {
            matchedPack.cards[targetSlotNum] = {
              name: (dc.name && !dc.name.includes("#") && !dc.name.includes("＃")) ? dc.name : "",
              type: "草", rarity: "C", regulation: matchedPack.defaultReg || "I",
              qty: 0, inUse: 0, manualInUseOffset: 0, usedInDecks: [], memo: "",
              hasPhoto: false, wished: false, isSecret: targetSlotNum > (matchedPack.regularTotal || matchedPack.total)
            };
          }

          const sKey = `${matchedPack.id}__${targetSlotNum}`;
          usageBySlotKey.set(sKey, (usageBySlotKey.get(sKey) || 0) + cnt);
          const list = deckNamesBySlotKey.get(sKey) || [];
          list.push(`${deck.name}(${cnt}枚)`);
          deckNamesBySlotKey.set(sKey, list);
        }
      });
    });

    state.packs.forEach((pack) => {
      if (!pack.cards || typeof pack.cards !== "object") pack.cards = {};
      Object.keys(pack.cards).forEach((sStr) => {
        const card = pack.cards[sStr];
        if (!card) return;
        const slotNum = Number(sStr);
        const sKey = `${pack.id}__${slotNum}`;
        const autoUsed = usageBySlotKey.get(sKey) || 0;
        const manualExtra = Number(card.manualInUseOffset) || 0;
        card.inUse = Math.max(0, autoUsed + manualExtra);
        card.usedInDecks = deckNamesBySlotKey.get(sKey) || [];

        const pUrl = photoCache.get(getPhotoKey(pack.id, slotNum)) || "";
        if ((Number(card.qty) || 0) === 0 && card.inUse === 0 && !pUrl && !(card.name && card.name.trim()) && !card.wished) {
          delete pack.cards[sStr];
        }
      });
    });
  }

  function computeSequentialDeckAllocations() {
    const ordered = getOrderedDecks();
    const remainingBySlot = new Map();
    const remainingByName = new Map();

    state.packs.forEach((p) => {
      Object.entries(p.cards || {}).forEach(([sStr, c]) => {
        if (!c) return;
        const q = Number(c.qty) || 0;
        const manualLock = Math.max(0, Number(c.manualInUseOffset) || 0);
        const poolQty = Math.max(0, q - manualLock);
        remainingBySlot.set(`${p.id}__${Number(sStr)}`, poolQty);
        if (c.name) {
          const nKey = normalizeCardKey(c.name);
          if (nKey) remainingByName.set(nKey, (remainingByName.get(nKey) || 0) + poolQty);
        }
      });
    });

    const resultMap = new Map();
    ordered.forEach((deck) => {
      let totalCount = 0, shortCount = 0;
      const items = [];

      (deck.cards || []).forEach((dc) => {
        const need = Number(dc.count) || 0;
        totalCount += need;
        const info = findCardInBinder(dc);
        const nKey = normalizeCardKey(dc.name);

        let availForThisDeck = 0;
        if (info && info.packId && info.slotNum) {
          const sKey = `${info.packId}__${info.slotNum}`;
          availForThisDeck = remainingBySlot.get(sKey) || 0;
          const consume = Math.min(availForThisDeck, need);
          remainingBySlot.set(sKey, availForThisDeck - consume);
          if (nKey && remainingByName.has(nKey)) remainingByName.set(nKey, Math.max(0, remainingByName.get(nKey) - consume));
        } else if (nKey && remainingByName.has(nKey)) {
          availForThisDeck = remainingByName.get(nKey) || 0;
          const consume = Math.min(availForThisDeck, need);
          remainingByName.set(nKey, availForThisDeck - consume);
        }

        const short = Math.max(0, need - availForThisDeck);
        shortCount += short;
        items.push({
          name: dc.name, count: need, have: availForThisDeck, short,
          photoUrl: info ? info.photoUrl : "",
          type: info ? info.type : "草",
          rarity: info ? info.rarity : "C"
        });
      });

      resultMap.set(deck.id, { totalCount, shortCount, items });
    });
    return resultMap;
  }

  /* ================= Gemini AI 全体スキャン + オフラインフォールバック ================= */
  async function analyzeCardWithGemini(dataUrl, packDefaultReg = "I") {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const base64 = String(dataUrl || "").split(",")[1];
    if (!base64) return null;

    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const allowedRegs = getAllRegulations().join(" / ");
    const prompt = `あなたは日本語版ポケモンカードゲームの鑑定・データ入力の専門家です。
添付されたポケモンカードの画像全体を精細に読み取り、以下のJSON形式のみを出力してください。余計な説明文やMarkdown記号は含めないでください。

{
  "cardNumber": 12,
  "name": "正確な日本語のカード名（例：メガサーナイトex、なかよしポフィン。進化マーク『たね』『1進化』やHP数値は含めない）",
  "type": "次のいずれか1つを厳密に選択: 草, 炎, 水, 雷, 超, 闘, 悪, 鋼, ドラゴン, 無色, グッズ, ポケモンのどうぐ, サポート, スタジアム, エネルギー",
  "rarity": "カード左下のレアリティ記号を次の中から厳密に1つ選択: C, U, R, RR, RRR, AR, MA, SR, SAR, UR, MUR, FUR, 30th, ACE, PROMO, -",
  "regulation": "カード左下の枠囲みレギュレーション記号を次の中から1つ選択: ${allowedRegs}（不明な場合は ${packDefaultReg}）"
}
※ cardNumber はカード左下の「012/063」の分子（左側）を半角整数で出力してください。読み取れない場合は null にしてください。`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson.error && errJson.error.message) ? errJson.error.message : `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
        ? data.candidates[0].content.parts.map((p) => p.text || "").join("") : "";
      if (!text) throw new Error("空の応答が返されました");

      const cleanJson = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleanJson);

      const validType = TYPE_OPTIONS.includes(parsed.type) ? parsed.type : "";
      const rarUpper = String(parsed.rarity || "").trim();
      const validRarity = RARITY_OPTIONS.includes(rarUpper)
        ? rarUpper
        : (RARITY_OPTIONS.includes(rarUpper.toUpperCase()) ? rarUpper.toUpperCase() : "");
      const regRaw = String(parsed.regulation || "").trim();
      const allRegs = getAllRegulations();
      const validReg = allRegs.includes(regRaw)
        ? regRaw
        : (allRegs.includes(regRaw.toUpperCase()) ? regRaw.toUpperCase() : packDefaultReg);

      const numVal = Number(parsed.cardNumber);
      const validNum = (!isNaN(numVal) && numVal >= 1 && numVal <= 500) ? Math.floor(numVal) : null;

      return {
        cardNumber: validNum,
        name: String(parsed.name || "").trim(),
        type: validType,
        rarity: validRarity,
        regulation: validReg,
        engine: "gemini",
        model
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return { h, s, v };
  }

  function detectTypeByCanvasColor(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const regions = [
      { x: Math.round(w * 0.86), y: Math.round(h * 0.04), w: Math.round(w * 0.07), h: Math.round(h * 0.05), weight: 2.5 },
      { x: Math.round(w * 0.03), y: Math.round(h * 0.20), w: Math.round(w * 0.04), h: Math.round(h * 0.55), weight: 1.0 },
      { x: Math.round(w * 0.92), y: Math.round(h * 0.20), w: Math.round(w * 0.04), h: Math.round(h * 0.55), weight: 1.0 }
    ];
    const scores = { "草": 0, "炎": 0, "水": 0, "雷": 0, "超": 0, "闘": 0, "悪": 0, "鋼": 0, "ドラゴン": 0, "無色": 0 };

    regions.forEach((reg) => {
      const d = ctx.getImageData(reg.x, reg.y, Math.max(4, reg.w), Math.max(4, reg.h)).data;
      for (let i = 0; i < d.length; i += 16) {
        const { h: hue, s, v } = rgbToHsv(d[i], d[i + 1], d[i + 2]);
        const wt = reg.weight;
        if (v < 0.34 && s < 0.45) scores["悪"] += wt * 0.9;
        else if (s < 0.18 && v >= 0.76) scores["無色"] += wt * 0.8;
        else if (s < 0.22 && v >= 0.42 && v < 0.76) scores["鋼"] += wt * 0.85;
        else if (hue >= 75 && hue < 155 && s >= 0.25) scores["草"] += wt * 1.25;
        else if ((hue >= 345 || hue < 18) && s >= 0.32) scores["炎"] += wt * 1.25;
        else if (hue >= 18 && hue < 38 && s >= 0.32) scores["闘"] += wt * 1.2;
        else if (hue >= 38 && hue < 64 && s >= 0.35) {
          if (v < 0.68) scores["ドラゴン"] += wt * 1.15;
          else scores["雷"] += wt * 1.25;
        } else if (hue >= 180 && hue < 235 && s >= 0.28) {
          if (v < 0.44) scores["悪"] += wt * 1.0;
          else scores["水"] += wt * 1.25;
        } else if (hue >= 255 && hue < 335 && s >= 0.25) scores["超"] += wt * 1.25;
      }
    });
    let best = "草", bestSc = -1;
    for (const [k, sc] of Object.entries(scores)) { if (sc > bestSc) { bestSc = sc; best = k; } }
    return best;
  }

  function createOtsuPaddedCrop(srcCanvas, rx, ry, rw, rh, scaleFactor) {
    const sx = Math.round(srcCanvas.width * rx), sy = Math.round(srcCanvas.height * ry);
    const sw = Math.round(srcCanvas.width * rw), sh = Math.round(srcCanvas.height * rh);
    const pad = 16, iw = Math.round(sw * scaleFactor), ih = Math.round(sh * scaleFactor);
    const out = document.createElement("canvas");
    out.width = iw + pad * 2; out.height = ih + pad * 2;
    const ctx = out.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, pad, pad, iw, ih);

    const imgData = ctx.getImageData(pad, pad, iw, ih);
    const d = imgData.data, total = iw * ih, grays = new Uint8Array(total), hist = new Uint32Array(256);
    let sumLum = 0;
    for (let p = 0; p < total; p++) {
      const i = p * 4, g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      grays[p] = g; hist[g]++; sumLum += g;
    }
    let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (wB === 0) continue;
      const wF = total - wB; if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sumLum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; threshold = t; }
    }
    const isDark = (sumLum / total) < 112;
    for (let p = 0; p < total; p++) {
      const i = p * 4, ink = isDark ? grays[p] > threshold : grays[p] < threshold, val = ink ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = val;
    }
    ctx.putImageData(imgData, pad, pad);
    return out;
  }

  function getOcrWorker() {
    if (ocrWorkerPromise) return ocrWorkerPromise;
    ocrWorkerPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ocrWorkerPromise = null; reject(new Error("timeout")); }, 15000);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.async = true;
      s.onload = async () => {
        try {
          if (!window.Tesseract) throw new Error("no tesseract");
          const w = await window.Tesseract.createWorker("jpn+eng", 1, { logger: () => {} });
          clearTimeout(timer); resolve(w);
        } catch (e) { clearTimeout(timer); ocrWorkerPromise = null; reject(e); }
      };
      s.onerror = () => { clearTimeout(timer); ocrWorkerPromise = null; reject(new Error("load error")); };
      document.head.appendChild(s);
    });
    return ocrWorkerPromise;
  }

  async function analyzeCardOffline(cardCanvas, slotNum, regTotal, packDefaultReg = "I") {
    const colorType = detectTypeByCanvasColor(cardCanvas);
    const fallbackRarity = slotNum > regTotal ? "AR" : "C";
    try {
      const worker = await getOcrWorker();
      const nameCrop = createOtsuPaddedCrop(cardCanvas, 0.20, 0.03, 0.46, 0.072, 2.2);
      const labelCrop = createOtsuPaddedCrop(cardCanvas, 0.04, 0.025, 0.28, 0.055, 2.0);
      const rarityCrop = createOtsuPaddedCrop(cardCanvas, 0.03, 0.88, 0.44, 0.095, 2.4);

      const [nameRes, labelRes, rarityRes] = await Promise.all([
        worker.recognize(nameCrop),
        worker.recognize(labelCrop),
        worker.recognize(rarityCrop)
      ]);

      const rawName = (nameRes.data.text || "")
        .replace(/^(たね|1進化|2進化|V進化|グッズ|サポート|スタジアム|ポケモンのどうぐ)/, "")
        .replace(/HP\d+.*$/i, "")
        .replace(/[|｜\[\]【】「」『』<>＜＞_＿=＝~〜^＾*＊\\\/]+/g, "")
        .replace(/\s+/g, "").trim();
      const rawLabel = (labelRes.data.text || "").replace(/\s+/g, "").trim();
      const rawRarity = (rarityRes.data.text || "").toUpperCase().replace(/\s+/g, " ").trim();

      let detectedType = colorType;
      if (/ポケモンのどうぐ|どうぐ/.test(rawLabel)) detectedType = "ポケモンのどうぐ";
      else if (/サポート/.test(rawLabel)) detectedType = "サポート";
      else if (/スタジアム/.test(rawLabel)) detectedType = "スタジアム";
      else if (/グッズ/.test(rawLabel)) detectedType = "グッズ";
      else if (/エネルギー/.test(rawName)) detectedType = "エネルギー";

      let detectedNum = null;
      const numMatch = rawRarity.match(/(\d{1,3})\s*[\/／]\s*\d{2,3}/);
      if (numMatch) {
        const parsedN = Number(numMatch[1]);
        if (parsedN >= 1 && parsedN <= 500) detectedNum = parsedN;
      }

      const validRars = ["MUR", "FUR", "SAR", "SSR", "RRR", "CSR", "CHR", "ACE", "PROMO", "MA", "UR", "SR", "AR", "RR", "R", "U", "C"];
      let detectedRarity = "";
      const afterNum = rawRarity.match(/\d{2,3}\s*[\/／]\s*\d{2,3}\s*([A-Z]{1,5})/);
      if (afterNum && validRars.includes(afterNum[1])) detectedRarity = afterNum[1];
      else {
        const tokens = rawRarity.split(/[^A-Z0-9]+/).filter(Boolean);
        for (const rCode of validRars) { if (tokens.includes(rCode)) { detectedRarity = rCode; break; } }
      }

      return { cardNumber: detectedNum, name: rawName, type: detectedType, rarity: detectedRarity || fallbackRarity, regulation: packDefaultReg || "I", engine: "offline" };
    } catch (_) {
      return { cardNumber: null, name: "", type: colorType, rarity: fallbackRarity, regulation: packDefaultReg || "I", engine: "offline-color" };
    }
  }

  async function analyzeCardSmart(cardCanvas, slotNum, regTotal, packDefaultReg = "I") {
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      try {
        const hiResDataUrl = cardCanvas.toDataURL("image/jpeg", 0.90);
        const gRes = await analyzeCardWithGemini(hiResDataUrl, packDefaultReg);
        if (gRes) {
          const fallbackType = detectTypeByCanvasColor(cardCanvas);
          const effSlot = gRes.cardNumber || slotNum;
          const fallbackRar = effSlot > regTotal ? "AR" : "C";
          return {
            cardNumber: gRes.cardNumber,
            name: gRes.name || "",
            type: gRes.type || fallbackType,
            rarity: gRes.rarity || fallbackRar,
            regulation: gRes.regulation || packDefaultReg || "I",
            engine: "gemini",
            model: gRes.model
          };
        }
      } catch (err) {
        const offlineRes = await analyzeCardOffline(cardCanvas, slotNum, regTotal, packDefaultReg);
        return { ...offlineRes, fallbackReason: err && err.message ? err.message : "API通信エラー" };
      }
    }
    return await analyzeCardOffline(cardCanvas, slotNum, regTotal, packDefaultReg);
  }

  function downscaleCanvasToSaveUrl(srcCanvas) {
    const out = document.createElement("canvas");
    out.width = 420; out.height = 586;
    out.getContext("2d").drawImage(srcCanvas, 0, 0, 420, 586);
    return out.toDataURL("image/jpeg", 0.85);
  }

  /* ================= パック一括レギュ適用 & UI補助 ================= */
  function applyPackRegulationBulk(packId, newReg) {
    const pack = state.packs.find((p) => p.id === packId);
    if (!pack) return;
    pack.defaultReg = newReg;
    Object.values(pack.cards || {}).forEach((card) => { if (card) card.regulation = newReg; });
    saveState();
  }

  function refreshRegulationSelectOptions() {
    const allRegs = getAllRegulations();
    const optsHtml = allRegs.map((rg) => `<option value="${escapeHtml(rg)}">${rg === "-" ? "なし" : escapeHtml(rg)}</option>`).join("");
    ["editRegulationSelect", "packDefaultRegSelect"].forEach((id) => {
      const sel = $(id);
      if (sel) {
        const prev = sel.value;
        sel.innerHTML = optsHtml;
        if (allRegs.includes(prev)) sel.value = prev;
      }
    });
  }

  function renderRegManagerModal() {
    const container = $("regListContainer");
    if (!container) return;
    container.innerHTML = "";
    (state.regulations || []).forEach((rg) => {
      const isDefault = DEFAULT_REGULATIONS.includes(rg);
      const chip = document.createElement("div");
      chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border:1px solid var(--border-light);border-radius:9999px;padding:5px 12px;font-weight:800;font-size:12.5px;";
      chip.innerHTML = `<span>🏷️ ${escapeHtml(rg)}</span>${!isDefault ? `<button type="button" class="rm-reg" style="color:var(--accent-red);font-weight:900;font-size:12px;">✕</button>` : ""}`;
      if (!isDefault) {
        chip.querySelector(".rm-reg").addEventListener("click", () => {
          state.regulations = state.regulations.filter((x) => x !== rg);
          filterState.regulations.delete(rg);
          saveState(); refreshRegulationSelectOptions(); rebuildPocketRegPills(); renderRegManagerModal(); renderAll();
        });
      }
      container.appendChild(chip);
    });
  }

  function askConfirm(message, onOk) {
    if ($("confirmMessageText")) $("confirmMessageText").textContent = message;
    confirmCallback = onOk;
    if ($("confirmModal")) $("confirmModal").classList.add("is-open");
  }
  function formatSlotNum(n) { return String(n).padStart(3, "0"); }
  function getSortedPacks() {
    const list = [...state.packs];
    if (state.packSort === "newest") list.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
    else if (state.packSort === "oldest") list.sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""));
    return list;
  }
  function hasAnyFilterActive() {
    return filterState.query !== "" || filterState.types.size > 0 || filterState.trainers.size > 0 || filterState.regulations.size > 0 || filterState.statuses.size > 0;
  }

  function renderAll() {
    syncAllDecksInUseCounts();
    refreshGeminiUiStatus();
    renderTopStats();
    renderBinder();
    renderGalleryTab();
    renderDecksTab();
    if (isPickingForDeck) renderDeckPickTray();
    if (activeDetailDeckId && $("pocketDeckSheet") && $("pocketDeckSheet").classList.contains("is-open")) {
      openDeckDetailModal(activeDetailDeckId);
    }
  }

  function renderTopStats() {
    let totalQty = 0, ownedKinds = 0;
    state.packs.forEach((p) => {
      Object.values(p.cards || {}).forEach((c) => {
        const q = Number(c.qty) || 0;
        if (q > 0) { totalQty += q; ownedKinds++; }
      });
    });
    if ($("totalCardsText")) $("totalCardsText").textContent = `${totalQty.toLocaleString()}枚`;
    if ($("totalKindsText")) $("totalKindsText").textContent = `(${ownedKinds}種)`;

    if ($("viewModeSwitch")) $("viewModeSwitch").classList.toggle("is-grid", state.viewMode === "grid");
    if ($("viewModeLabel")) $("viewModeLabel").textContent = state.viewMode === "grid" ? "5列図鑑" : "リスト";
    if ($("wishFilterQuickBtn")) $("wishFilterQuickBtn").classList.toggle("is-wish-active", filterState.statuses.has("WISH"));

    const activeFilter = hasAnyFilterActive();
    if ($("openSearchSheetBtn")) $("openSearchSheetBtn").classList.toggle("is-active", activeFilter);
    if ($("openGallerySearchBtn")) $("openGallerySearchBtn").classList.toggle("is-active", activeFilter);

    const anyOpen = state.packs.some((p) => !p.collapsed);
    if ($("toggleAllPacksBtn")) $("toggleAllPacksBtn").textContent = anyOpen ? "📁 全閉" : "📂 全開";
  }

  function slotMatchesFilter(pack, slotNum, card, extraQuery = "") {
    const qText = (extraQuery || filterState.query || "").trim().toLowerCase();
    const hasTypeFilter = filterState.types.size > 0 || filterState.trainers.size > 0;
    const hasRegFilter = filterState.regulations.size > 0;
    const hasStatusFilter = filterState.statuses.size > 0;
    if (!qText && !hasTypeFilter && !hasRegFilter && !hasStatusFilter) return true;

    const q = card ? Number(card.qty) || 0 : 0;
    const photoUrl = photoCache.get(getPhotoKey(pack.id, slotNum)) || "";
    const hasName = Boolean(card && card.name && card.name.trim() !== "");
    const isReg = q > 0 || Boolean(photoUrl) || hasName;
    const isEmptySlot = !isReg;
    const regTotal = pack.regularTotal || pack.total;
    const isSecret = Boolean((card && (card.isSecret || SECRET_RARITIES.has(card.rarity))) || slotNum > regTotal);
    const effReg = (card && card.regulation) ? card.regulation : (pack.defaultReg || "I");

    if (hasStatusFilter) {
      let statusOk = false;
      if (filterState.statuses.has("OWNED") && q > 0) statusOk = true;
      if (filterState.statuses.has("UNOWNED_REG") && (q === 0 && isReg)) statusOk = true;
      if (filterState.statuses.has("EMPTY_SLOT") && isEmptySlot) statusOk = true;
      if (filterState.statuses.has("WISH") && Boolean(card && card.wished)) statusOk = true;
      if (filterState.statuses.has("SECRET") && isSecret) statusOk = true;
      if (!statusOk) return false;
    }
    if (hasTypeFilter) {
      if (!card) return false;
      if (!filterState.types.has(card.type) && !filterState.trainers.has(card.type)) return false;
    }
    if (hasRegFilter && !filterState.regulations.has(effReg)) return false;
    if (qText) {
      const hay = [pack.name, pack.code, formatSlotNum(slotNum), card ? card.name : "", card ? card.memo : "", card ? card.rarity : "", effReg].join(" ").toLowerCase();
      if (!hay.includes(qText)) return false;
    }
    return true;
  }

  function getDeckSlotCount(packId, slotNum) {
    const item = tempDeckCards.find((c) => String(c.packId) === String(packId) && Number(c.slotNum) === Number(slotNum));
    return item ? item.count : 0;
  }

  function toggleDeckPickSlot(packId, slotNum) {
    const pack = state.packs.find((p) => p.id === packId);
    const card = pack ? (pack.cards[slotNum] || pack.cards[String(slotNum)]) : null;
    const labelName = (card && card.name && card.name.trim()) ? card.name.trim() : `${pack ? pack.name : ""} #${formatSlotNum(slotNum)}`;
    const idx = tempDeckCards.findIndex((c) => String(c.packId) === String(packId) && Number(c.slotNum) === Number(slotNum));
    if (idx >= 0) {
      if (tempDeckCards[idx].count >= 4) tempDeckCards.splice(idx, 1);
      else tempDeckCards[idx].count += 1;
    } else {
      tempDeckCards.push({ name: labelName, count: 1, packId, slotNum: Number(slotNum) });
    }
    renderDeckPickTray();
    renderBinder();
  }

  function triggerBatchPicker(packId, startNum) {
    batchPackId = packId;
    if ($("batchStartNumInput")) $("batchStartNumInput").value = startNum || 1;
    const inp = $("batchAlbumInput");
    if (!inp) return showDiagError("batchAlbumInput が見つかりません");
    inp.value = "";
    inp.click();
  }

  function renderBinder() {
    syncAllDecksInUseCounts();
    const container = $("packsContainer");
    if (!container) return;
    container.innerHTML = "";
    const sortedPacks = getSortedPacks();
    const isFiltering = hasAnyFilterActive();
    const allRegs = getAllRegulations();

    sortedPacks.forEach((pack, pIdx) => {
      const cardsMap = pack.cards || {};
      const regTotal = pack.regularTotal || pack.total;
      const packReg = pack.defaultReg || "I";
      let ownedReg = 0, ownedSec = 0;
      const secTotal = Math.max(0, pack.total - regTotal);

      for (let s = 1; s <= pack.total; s++) {
        const c = cardsMap[s] || cardsMap[String(s)];
        if (c && (Number(c.qty) || 0) > 0) {
          if (s <= regTotal) ownedReg++;
          else ownedSec++;
        }
      }

      const visibleSlots = [];
      for (let s = 1; s <= pack.total; s++) {
        if (slotMatchesFilter(pack, s, cardsMap[s] || cardsMap[String(s)] || null)) visibleSlots.push(s);
      }
      if (isFiltering && visibleSlots.length === 0) return;

      const section = document.createElement("section");
      section.className = `pack-section${pack.collapsed && !isFiltering ? " is-collapsed" : ""}`;
      const grad = PACK_THEMES[pack.theme] || PACK_THEMES.purple;
      const regSelectOpts = allRegs.map((rg) => `<option value="${escapeHtml(rg)}" ${packReg === rg ? "selected" : ""}>レギュ ${rg === "-" ? "なし" : escapeHtml(rg)}</option>`).join("");

      const header = document.createElement("div");
      header.className = "pack-header-card";
      header.innerHTML = `
        <div class="pack-header-top">
          <div class="pack-btn-group">
            <button class="mini-round-btn up-btn" type="button" ${pIdx === 0 ? "disabled" : ""}>↑</button>
            <button class="mini-round-btn dn-btn" type="button" ${pIdx === sortedPacks.length - 1 ? "disabled" : ""}>↓</button>
            <button class="pack-batch-btn" type="button">📷 一括</button>
            <select class="pack-reg-select" title="パック全体のレギュレーション一括設定">${regSelectOpts}</select>
          </div>
          <div class="pack-btn-group">
            <button class="mini-round-btn cfg-btn" type="button">⚙️</button>
            <button class="mini-round-btn pack-toggle-btn" type="button">⌃</button>
          </div>
        </div>
        <div class="pack-logo-badge" style="background:${grad};">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(pack.name)}</span>
          ${pack.code ? `<span class="pack-code-tag">${escapeHtml(pack.code)}</span>` : ""}
        </div>
        <div class="pack-progress-row">
          <div class="pack-progress-pill">◆ 通常 ${ownedReg} / ${regTotal}</div>
          ${secTotal > 0 ? `<div class="pack-secret-pill">✨ SEC ${ownedSec} / ${secTotal}</div>` : ""}
        </div>
      `;

      header.querySelector(".up-btn").addEventListener("click", () => movePack(pack.id, -1));
      header.querySelector(".dn-btn").addEventListener("click", () => movePack(pack.id, 1));
      header.querySelector(".pack-batch-btn").addEventListener("click", () => triggerBatchPicker(pack.id, 1));
      header.querySelector(".pack-reg-select").addEventListener("change", (e) => {
        applyPackRegulationBulk(pack.id, e.target.value);
        renderAll();
        showToast(`「${pack.name}」のレギュレーションを「${e.target.value}」に一括設定しました`);
      });
      header.querySelector(".cfg-btn").addEventListener("click", () => openPackModal(pack.id));
      header.querySelector(".pack-toggle-btn").addEventListener("click", () => {
        pack.collapsed = !pack.collapsed; saveState(); renderTopStats(); renderBinder();
      });
      section.appendChild(header);

      const wrap = document.createElement("div");
      wrap.className = "pack-grid-wrap";

      if (state.viewMode === "grid") {
        const grid = document.createElement("div");
        grid.className = "binder-grid";

        visibleSlots.forEach((slotNum) => {
          const card = cardsMap[slotNum] || cardsMap[String(slotNum)] || null;
          const qty = card ? Number(card.qty) || 0 : 0;
          const inUse = card ? Number(card.inUse) || 0 : 0;
          const photoUrl = photoCache.get(getPhotoKey(pack.id, slotNum)) || "";
          const hasPhoto = Boolean(photoUrl);
          const hasName = Boolean(card && card.name && card.name.trim() !== "");
          const isUnownedReg = qty === 0 && (hasPhoto || hasName);
          const isSec = Boolean((card && (card.isSecret || SECRET_RARITIES.has(card.rarity))) || slotNum > regTotal);
          const deckCnt = isPickingForDeck ? getDeckSlotCount(pack.id, slotNum) : 0;
          const cReg = (card && card.regulation) ? card.regulation : packReg;
          const hasReg = Boolean(cReg && cReg !== "-");

          const slotEl = document.createElement("div");
          const secHtml = isSec ? `<span class="slot-secret-star">${escapeHtml((card && card.rarity) || "SEC")}</span>` : "";
          const regHtml = hasReg ? `<span class="slot-reg-badge">${escapeHtml(cReg)}</span>` : "";
          const wishHtml = (card && card.wished) ? `<span class="slot-wish-star">★</span>` : "";
          const deckHtml = deckCnt > 0 ? `<span class="slot-deck-badge">デッキ×${deckCnt}</span>` : "";
          const inUseHtml = (!isPickingForDeck && inUse > 0) ? `<span class="slot-inuse-badge${hasReg ? "" : " at-bottom"}">使用${inUse}</span>` : "";

          if (qty > 0) {
            const meta = TYPE_META[card.type] || TYPE_META["無色"];
            slotEl.className = `card-slot is-owned${hasPhoto ? " has-photo" : ""}${isSec ? " is-secret-slot" : ""}`;
            slotEl.style.setProperty("--slot-border-color", meta.border);
            slotEl.style.setProperty("--slot-bg-tint", meta.tint);
            slotEl.innerHTML = hasPhoto
              ? `<img class="slot-photo-img" src="${photoUrl}" loading="lazy" />${secHtml}${regHtml}${wishHtml}${deckHtml}${inUseHtml}<span class="slot-photo-qty-pill">×${qty}</span>`
              : `${secHtml}${regHtml}${wishHtml}${deckHtml}${inUseHtml}<div class="mini-card-inner"><span class="mini-card-name">${escapeHtml(card.name || formatSlotNum(slotNum))}</span><div class="mini-card-icon">${meta.icon}</div><div class="mini-card-bottom"><span class="mini-card-qty">×${qty}</span></div></div>`;
          } else if (isUnownedReg) {
            const meta = TYPE_META[card.type] || TYPE_META["無色"];
            slotEl.className = `card-slot is-unowned-registered${hasPhoto ? " has-photo" : ""}`;
            slotEl.style.setProperty("--slot-bg-tint", meta.tint);
            slotEl.innerHTML = hasPhoto
              ? `<img class="slot-photo-img" src="${photoUrl}" loading="lazy" /><div class="slot-dim-overlay"></div>${secHtml}${regHtml}${wishHtml}${deckHtml}${inUseHtml}<span class="slot-unowned-badge">0枚</span>`
              : `${secHtml}${regHtml}${wishHtml}${deckHtml}${inUseHtml}<div class="mini-card-inner"><span class="mini-card-name">${escapeHtml(card.name)}</span><div class="mini-card-icon">${meta.icon}</div><div class="mini-card-bottom"></div></div><div class="slot-dim-overlay"></div><span class="slot-unowned-badge">0枚</span>`;
          } else {
            const emptyInUseHtml = (!isPickingForDeck && inUse > 0) ? `<span class="slot-inuse-badge at-bottom">使用${inUse}</span>` : "";
            slotEl.className = `card-slot is-empty${inUse > 0 ? " has-inuse" : ""}`;
            slotEl.innerHTML = `${deckHtml}${emptyInUseHtml}<span class="slot-empty-num">${formatSlotNum(slotNum)}</span>`;
          }

          slotEl.addEventListener("click", () => {
            if (isPickingForDeck) toggleDeckPickSlot(pack.id, slotNum);
            else openDetailViewer(pack.id, slotNum);
          });
          grid.appendChild(slotEl);
        });
        wrap.appendChild(grid);
      } else {
        const listDiv = document.createElement("div");
        listDiv.className = "list-view-container";
        visibleSlots.forEach((slotNum) => {
          const card = cardsMap[slotNum] || cardsMap[String(slotNum)] || { name: "", type: "草", rarity: "C", regulation: packReg, qty: 0, inUse: 0 };
          const qty = Number(card.qty) || 0, inUse = Number(card.inUse) || 0, cReg = card.regulation || packReg;
          const meta = TYPE_META[card.type] || TYPE_META["無色"];
          const photoUrl = photoCache.get(getPhotoKey(pack.id, slotNum)) || "";
          const row = document.createElement("div");
          row.className = "list-card-row";
          row.innerHTML = `
            <div class="list-thumb">${photoUrl ? `<img src="${photoUrl}" />` : `<span>${meta.icon}</span>`}</div>
            <div class="list-info">
              <div style="font-weight:800;font-size:13px;">#${formatSlotNum(slotNum)} ${escapeHtml(card.name || "未登録")}</div>
              <div style="font-size:11px;color:var(--text-secondary);">${meta.icon} ${escapeHtml(card.type || "草")} ${card.rarity && card.rarity !== "-" ? `・${escapeHtml(card.rarity)}` : ""} ${cReg && cReg !== "-" ? `・レギュ${escapeHtml(cReg)}` : ""} ・使用中 ${inUse}枚</div>
            </div>
            <div class="list-stepper">
              <button class="mini-step-btn minus" type="button">−</button>
              <span style="font-weight:900;min-width:20px;text-align:center;">${qty}</span>
              <button class="mini-step-btn plus" type="button">＋</button>
            </div>
          `;
          row.querySelector(".list-thumb").addEventListener("click", () => openDetailViewer(pack.id, slotNum));
          row.querySelector(".list-info").addEventListener("click", () => openDetailViewer(pack.id, slotNum));
          row.querySelector(".minus").addEventListener("click", () => { if (qty > 0) { card.qty = qty - 1; pack.cards[slotNum] = card; saveState(); renderAll(); } });
          row.querySelector(".plus").addEventListener("click", () => { card.qty = qty + 1; pack.cards[slotNum] = card; saveState(); renderAll(); });
          listDiv.appendChild(row);
        });
        wrap.appendChild(listDiv);
      }

      section.appendChild(wrap);
      container.appendChild(section);
    });
  }

  function movePack(packId, delta) {
    if (state.packSort !== "manual") {
      state.packs = getSortedPacks();
      state.packSort = "manual";
      if ($("packSortSelect")) $("packSortSelect").value = "manual";
    }
    const i = state.packs.findIndex((p) => p.id === packId), t = i + delta;
    if (i < 0 || t < 0 || t >= state.packs.length) return;
    const [m] = state.packs.splice(i, 1);
    state.packs.splice(t, 0, m);
    saveState(); renderBinder();
  }

  /* ================= 絵のみ一覧タブ ================= */
  function renderGalleryTab() {
    const container = $("galleryGridContainer"), packSel = $("galleryPackFilter");
    if (!container || !packSel) return;
    const prevVal = packSel.value || "ALL";
    packSel.innerHTML = `<option value="ALL">すべてのパック</option>` + state.packs.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
    packSel.value = prevVal;

    const cols = Number($("galleryColsSelect") ? $("galleryColsSelect").value : 5) || 5;
    const photoOnly = Boolean($("galleryPhotoOnlyChk") && $("galleryPhotoOnlyChk").checked);
    const quickQ = $("galleryQuickSearchInput") ? $("galleryQuickSearchInput").value.trim() : "";
    const items = [];

    getSortedPacks().forEach((p) => {
      if (packSel.value !== "ALL" && p.id !== packSel.value) return;
      for (let s = 1; s <= p.total; s++) {
        const c = p.cards[s];
        if (!c || (Number(c.qty) || 0) <= 0) continue;
        if (!slotMatchesFilter(p, s, c, quickQ)) continue;
        const pUrl = photoCache.get(getPhotoKey(p.id, s)) || "";
        if (photoOnly && !pUrl) continue;
        items.push({ packId: p.id, slotNum: s, card: c, photoUrl: pUrl });
      }
    });

    if (items.length === 0) {
      container.innerHTML = `<div class="panel-card" style="text-align:center;color:var(--text-secondary);">条件に一致する所持カードがありません。</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:6px;`;
    items.forEach((it) => {
      const meta = TYPE_META[it.card.type] || TYPE_META["無色"];
      const el = document.createElement("div");
      el.className = `card-slot is-owned${it.photoUrl ? " has-photo" : ""}`;
      el.style.setProperty("--slot-border-color", meta.border);
      el.style.setProperty("--slot-bg-tint", meta.tint);
      el.innerHTML = it.photoUrl
        ? `<img class="slot-photo-img" src="${it.photoUrl}" loading="lazy" />`
        : `<div class="mini-card-inner"><span class="mini-card-name">${escapeHtml(it.card.name || formatSlotNum(it.slotNum))}</span><div class="mini-card-icon">${meta.icon}</div><div class="mini-card-bottom"></div></div>`;
      el.addEventListener("click", () => openDetailViewer(it.packId, it.slotNum));
      grid.appendChild(el);
    });
    container.innerHTML = "";
    container.appendChild(grid);
  }

  /* ================= 大型カード詳細ビューア（2本指ピンチズーム対応） ================= */
  function resetViewerZoom() {
    viewerZoomScale = 1; viewerPanX = 0; viewerPanY = 0;
    const cardBox = document.querySelector("#viewerSlideCurr .viewer-showcase-card");
    if (cardBox) cardBox.style.transform = "translate3d(0px, 0px, 0) scale(1)";
    if ($("viewerZoomResetBtn")) $("viewerZoomResetBtn").style.display = "none";
  }

  function applyViewerZoom() {
    const cardBox = document.querySelector("#viewerSlideCurr .viewer-showcase-card");
    if (cardBox) cardBox.style.transform = `translate3d(${viewerPanX}px, ${viewerPanY}px, 0) scale(${viewerZoomScale})`;
    const btn = $("viewerZoomResetBtn");
    if (btn) {
      btn.style.display = viewerZoomScale > 1.02 ? "inline-flex" : "none";
      btn.textContent = `${viewerZoomScale.toFixed(1)}x`;
    }
  }

  function setSheetProgress(val, animate = true) {
    sheetProgress = Math.max(0, Math.min(1, val));
    const overlay = $("detailViewerOverlay"), stage = $("viewerCardStage"), sheet = $("viewerBottomSheet");
    if (!overlay || !stage || !sheet) return;
    stage.classList.toggle("is-dragging-sheet", !animate);
    sheet.classList.toggle("is-dragging-sheet", !animate);
    overlay.style.setProperty("--sheet-progress", sheetProgress.toFixed(3));
    if ($("sheetHintText")) {
      $("sheetHintText").textContent = sheetProgress > 0.5
        ? "▼ 下にスライドしてカードを大きく表示（2本指で拡大可）"
        : "▲ 上にスライドして詳細・写真・一括登録・AI入力を編集";
    }
  }

  function renderShowcaseCardHtml(pack, slotNum) {
    if (!pack || slotNum < 1 || slotNum > pack.total) return `<div class="viewer-showcase-card" style="opacity:0;"></div>`;
    const card = pack.cards[slotNum] || null;
    const qty = card ? Number(card.qty) || 0 : 0;
    const photoUrl = photoCache.get(getPhotoKey(pack.id, slotNum)) || "";
    const type = card && card.type ? card.type : "草";
    const meta = TYPE_META[type] || TYPE_META["草"];
    const name = (card && card.name) ? card.name : `#${formatSlotNum(slotNum)}`;
    const isDimmed = qty === 0 && (Boolean(photoUrl) || Boolean(card && card.name));

    if (photoUrl) return `<div class="viewer-showcase-card${isDimmed ? " is-dimmed" : ""}"><img src="${photoUrl}" alt="${escapeHtml(name)}" /></div>`;
    return `
      <div class="viewer-showcase-card${isDimmed ? " is-dimmed" : ""}">
        <div class="showcase-fallback" style="background:${meta.tint};">
          <div style="font-weight:900;font-size:14px;">${escapeHtml(name)}</div>
          <div style="font-size:44px;text-align:center;margin:auto 0;">${meta.icon}</div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:11.5px;">
            <span>${escapeHtml(pack.code || "")} #${formatSlotNum(slotNum)}</span>
            <span>${qty}枚</span>
          </div>
        </div>
      </div>
    `;
  }

  function resetCarouselTrack(animate) {
    const track = $("viewerCarouselTrack");
    if (!track) return;
    track.style.transition = animate ? "transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    track.style.transform = "translate3d(-33.333333%, 0, 0)";
  }

  function openDetailViewer(packId, slotNum, preserveSheetState = false) {
    const pack = state.packs.find((p) => p.id === packId);
    if (!pack) return;
    const exactSlot = Math.max(1, Math.min(pack.total, Number(slotNum)));
    viewingTarget = { packId: pack.id, slotNum: exactSlot };

    refreshRegulationSelectOptions();
    refreshGeminiUiStatus();
    resetViewerZoom();

    const existing = pack.cards[exactSlot] || null;
    const photoUrl = photoCache.get(getPhotoKey(pack.id, exactSlot)) || null;
    tempPhotoDataUrl = photoUrl;
    tempHasPhoto = Boolean(photoUrl);

    if ($("viewerHeaderLabel")) $("viewerHeaderLabel").textContent = `${pack.name} #${formatSlotNum(exactSlot)}`;
    const wishBtn = $("viewerWishToggleBtn");
    const isWished = Boolean(existing && existing.wished);
    if (wishBtn) {
      wishBtn.classList.toggle("is-wished", isWished);
      wishBtn.textContent = isWished ? "★ 欲しい登録済" : "☆ 欲しい";
    }

    if ($("viewerSlidePrev")) $("viewerSlidePrev").innerHTML = renderShowcaseCardHtml(pack, exactSlot - 1);
    if ($("viewerSlideCurr")) $("viewerSlideCurr").innerHTML = renderShowcaseCardHtml(pack, exactSlot);
    if ($("viewerSlideNext")) $("viewerSlideNext").innerHTML = renderShowcaseCardHtml(pack, exactSlot + 1);
    resetCarouselTrack(false);

    if ($("editQtyValue")) $("editQtyValue").textContent = existing ? Number(existing.qty) || 0 : 0;
    if ($("editInUseValue")) $("editInUseValue").textContent = existing ? Number(existing.inUse) || 0 : 0;
    if ($("editNameInput")) $("editNameInput").value = existing ? existing.name || "" : "";
    if ($("editTypeSelect")) $("editTypeSelect").value = existing && existing.type ? existing.type : "草";
    if ($("editRaritySelect")) $("editRaritySelect").value = existing && existing.rarity ? existing.rarity : "C";
    if ($("editRegulationSelect")) $("editRegulationSelect").value = (existing && existing.regulation) ? existing.regulation : (pack.defaultReg || "I");
    if ($("editMemoInput")) $("editMemoInput").value = existing ? existing.memo || "" : "";
    if ($("removePhotoBtn")) $("removePhotoBtn").style.display = tempHasPhoto ? "inline-flex" : "none";
    if ($("ocrStatusBox")) $("ocrStatusBox").style.display = "none";

    const usedList = (existing && Array.isArray(existing.usedInDecks) && existing.usedInDecks.length > 0)
      ? `使用中: ${existing.usedInDecks.join(" / ")}`
      : "デッキ保存時に自動加算・手動調整も可";
    if ($("sheetDeckListHint")) $("sheetDeckListHint").textContent = usedList;

    syncViewerSheetSummary();
    if (!preserveSheetState) setSheetProgress(0, false);
    if ($("detailViewerOverlay")) $("detailViewerOverlay").classList.add("is-open");
    requestAnimationFrame(() => resetCarouselTrack(false));
  }

  function syncViewerSheetSummary() {
    if (!viewingTarget) return;
    const qty = Number($("editQtyValue") ? $("editQtyValue").textContent : 0) || 0;
    const inUse = Number($("editInUseValue") ? $("editInUseValue").textContent : 0) || 0;
    const avail = Math.max(0, qty - inUse);
    const name = ($("editNameInput") ? $("editNameInput").value.trim() : "") || `#${formatSlotNum(viewingTarget.slotNum)} 未登録`;
    if ($("sheetCardTitleDisplay")) $("sheetCardTitleDisplay").textContent = name;
    if ($("sheetAvailDisplay")) {
      $("sheetAvailDisplay").textContent = qty === 0
        ? `未所持（0枚・暗転表示） / 使用中: ${inUse}枚`
        : `所持: ${qty}枚 ／ 使用中: ${inUse}枚 ／ 空き: ${avail}枚`;
    }
  }

  async function persistCurrentViewerSlot(closeAfter) {
    if (!viewingTarget) return;
    const { packId, slotNum } = viewingTarget;
    const pack = state.packs.find((p) => p.id === packId);
    if (!pack) return;

    const prevCard = pack.cards[slotNum] || {};
    const qty = Number($("editQtyValue") ? $("editQtyValue").textContent : 0) || 0;
    const desiredInUse = Math.max(0, Number($("editInUseValue") ? $("editInUseValue").textContent : 0) || 0);
    const prevAutoInUse = Math.max(0, (Number(prevCard.inUse) || 0) - (Number(prevCard.manualInUseOffset) || 0));
    const manualInUseOffset = desiredInUse - prevAutoInUse;

    const name = $("editNameInput") ? $("editNameInput").value.trim() : "";
    const type = $("editTypeSelect") ? $("editTypeSelect").value : "草";
    const rarity = $("editRaritySelect") ? $("editRaritySelect").value : "C";
    const regulation = $("editRegulationSelect") ? $("editRegulationSelect").value : (pack.defaultReg || "I");
    const memo = $("editMemoInput") ? $("editMemoInput").value.trim() : "";
    const photoKey = getPhotoKey(packId, slotNum);
    const regTotal = pack.regularTotal || pack.total;

    const keep = qty > 0 || desiredInUse > 0 || tempHasPhoto || name !== "" || Boolean(prevCard.wished);
    if (!keep) {
      delete pack.cards[slotNum];
      await deletePhotoFromDB(photoKey);
    } else {
      if (tempHasPhoto && tempPhotoDataUrl) await savePhotoToDB(photoKey, tempPhotoDataUrl);
      else await deletePhotoFromDB(photoKey);

      pack.cards[slotNum] = {
        name, type, rarity, regulation, qty,
        inUse: desiredInUse, manualInUseOffset,
        usedInDecks: prevCard.usedInDecks || [],
        memo, hasPhoto: Boolean(tempHasPhoto && tempPhotoDataUrl),
        wished: Boolean(prevCard.wished),
        isSecret: SECRET_RARITIES.has(rarity) || slotNum > regTotal
      };
    }
    syncAllDecksInUseCounts();
    saveState();
    if (closeAfter) {
      if ($("detailViewerOverlay")) $("detailViewerOverlay").classList.remove("is-open");
      viewingTarget = null;
      renderAll();
    }
  }

  async function slideViewerTo(delta) {
    if (!viewingTarget || isNavigatingViewer) return;
    const pack = state.packs.find((p) => p.id === viewingTarget.packId);
    if (!pack) return;
    const nextSlot = viewingTarget.slotNum + delta;
    if (nextSlot < 1 || nextSlot > pack.total) { resetCarouselTrack(true); return; }
    isNavigatingViewer = true;
    const track = $("viewerCarouselTrack");
    if (track) {
      track.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
      track.style.transform = delta > 0 ? "translate3d(-66.666666%, 0, 0)" : "translate3d(0%, 0, 0)";
    }
    await persistCurrentViewerSlot(false);
    setTimeout(() => { openDetailViewer(pack.id, nextSlot, true); renderAll(); isNavigatingViewer = false; }, 210);
  }

  /* ================= 63:88 クロッパー & AI解析 ================= */
  function openCropperWithFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        cropImg = img; cropRotation = 0; cropOffsetX = 0; cropOffsetY = 0;
        const c = $("cropperCanvas");
        cropScale = Math.max(c.width / img.width, c.height / img.height);
        const zr = $("cropZoomRange");
        if (zr) { zr.min = (cropScale * 0.6).toFixed(2); zr.max = (cropScale * 3.5).toFixed(2); zr.value = cropScale.toFixed(2); }
        drawCropper();
        if ($("cropperModal")) $("cropperModal").classList.add("is-open");
      };
      img.onerror = () => showToast("画像の読み込みに失敗しました");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function drawCropper() {
    if (!cropImg || !$("cropperCanvas")) return;
    const c = $("cropperCanvas");
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2 + cropOffsetX, c.height / 2 + cropOffsetY);
    ctx.rotate((cropRotation * Math.PI) / 180);
    ctx.scale(cropScale, cropScale);
    ctx.drawImage(cropImg, -cropImg.width / 2, -cropImg.height / 2);
    ctx.restore();
  }

  async function runAiAnalysisOnCanvasOrDataUrl(sourceCanvas, fallbackDataUrl) {
    const box = $("ocrStatusBox");
    const hasKey = Boolean(getGeminiApiKey());
    if (box) {
      box.style.display = "block";
      box.style.background = hasKey ? "#f5f3ff" : "#f0fdf4";
      box.style.borderColor = hasKey ? "#c4b5fd" : "#bbf7d0";
      box.textContent = hasKey
        ? `✨ Gemini AI (${getGeminiModel()}) で画像全体をスキャン中...`
        : "🔍 オフライン解析でカード情報を読取中...";
    }

    const processCanvas = async (canvas) => {
      const pack = viewingTarget ? state.packs.find((p) => p.id === viewingTarget.packId) : null;
      const regTotal = pack ? (pack.regularTotal || pack.total) : 80;
      const packDefaultReg = pack ? (pack.defaultReg || "I") : "I";
      const slotNum = viewingTarget ? viewingTarget.slotNum : 1;

      const analyzed = await analyzeCardSmart(canvas, slotNum, regTotal, packDefaultReg);
      if (analyzed.name && $("editNameInput")) $("editNameInput").value = analyzed.name;
      if (analyzed.type && $("editTypeSelect")) $("editTypeSelect").value = analyzed.type;
      if (analyzed.rarity && $("editRaritySelect")) $("editRaritySelect").value = analyzed.rarity;
      if (analyzed.regulation && $("editRegulationSelect")) $("editRegulationSelect").value = analyzed.regulation;
      syncViewerSheetSummary();

      if (box) {
        const summary = [
          analyzed.cardNumber ? `#${formatSlotNum(analyzed.cardNumber)}` : "",
          analyzed.name ? `「${analyzed.name}」` : "",
          analyzed.type, analyzed.rarity, `レギュ${analyzed.regulation}`
        ].filter(Boolean).join(" / ");
        if (analyzed.engine === "gemini") {
          box.style.background = "#f5f3ff"; box.style.borderColor = "#c4b5fd";
          box.textContent = `✨ Gemini全体スキャン完了: ${summary}`;
        } else if (analyzed.fallbackReason) {
          box.style.background = "#fffbeb"; box.style.borderColor = "#fde68a";
          box.textContent = `⚠️ Geminiエラー(${analyzed.fallbackReason})→オフライン解析: ${summary}`;
        } else {
          box.style.background = "#f0fdf4"; box.style.borderColor = "#bbf7d0";
          box.textContent = `🔍 オフライン読取完了: ${summary}`;
        }
      }
    };

    if (sourceCanvas) {
      await processCanvas(sourceCanvas);
    } else if (fallbackDataUrl) {
      const img = new Image();
      img.onload = async () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 420; c.height = img.naturalHeight || 586;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        await processCanvas(c);
      };
      img.src = fallbackDataUrl;
    } else {
      if (box) box.style.display = "none";
      showToast("先にカードを撮影または選択してください");
    }
  }

  /* ================= 複数写真一括登録 ================= */
  function resolveBatchItemTargetSlot(it, idx) {
    const modeSel = $("batchAssignModeSelect");
    const mode = modeSel ? modeSel.value : "seq";
    const startNum = Math.max(1, Number($("batchStartNumInput") ? $("batchStartNumInput").value : 1) || 1);
    if (mode === "auto" && it.manualSlotNum) return it.manualSlotNum;
    if (mode === "auto" && it.detectedNumber) return it.detectedNumber;
    return startNum + idx;
  }

  async function handleBatchFilesSelected(fileList) {
    const files = Array.from(fileList || []).sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));
    if (files.length === 0) return;

    if (viewingTarget) {
      if ($("detailViewerOverlay")) $("detailViewerOverlay").classList.remove("is-open");
      viewingTarget = null;
    }

    const pack = state.packs.find((p) => p.id === batchPackId);
    const regTotal = pack ? (pack.regularTotal || pack.total) : 80;
    const packDefaultReg = pack ? (pack.defaultReg || "I") : "I";
    const startNum = Math.max(1, Number($("batchStartNumInput") ? $("batchStartNumInput").value : 1) || 1);
    const defaultQty = Number($("batchDefaultQtySelect") ? $("batchDefaultQtySelect").value : 1);
    const useGemini = Boolean(getGeminiApiKey());

    if ($("batchAssignModeSelect")) $("batchAssignModeSelect").value = useGemini ? "auto" : "seq";

    batchItems = [];
    const totalFiles = files.length;
    const titleLabel = useGemini ? "✨ Gemini AIで画像全体を解析中..." : "📷 オフラインで画像を解析中...";
    showLoadingModal(titleLabel, `0 / ${totalFiles} 枚処理中`, 5);
    await new Promise((r) => setTimeout(r, 30));

    try {
      for (let idx = 0; idx < totalFiles; idx++) {
        const f = files[idx], fallbackSlot = startNum + idx;
        const pct = Math.round(((idx + 0.5) / totalFiles) * 100);
        showLoadingModal(titleLabel, `${idx + 1} / ${totalFiles} 枚目を読み取り中...`, pct);

        const itemData = await new Promise((res) => {
          const r = new FileReader();
          r.onerror = () => res(null);
          r.onload = (ev) => {
            const img = new Image();
            img.onerror = () => res(null);
            img.onload = async () => {
              try {
                const hiC = document.createElement("canvas");
                hiC.width = 720; hiC.height = 1006;
                const sc = Math.max(720 / img.width, 1006 / img.height);
                hiC.getContext("2d").drawImage(img, (720 - img.width * sc) / 2, (1006 - img.height * sc) / 2, img.width * sc, img.height * sc);

                const analyzed = await analyzeCardSmart(hiC, fallbackSlot, regTotal, packDefaultReg);
                res({
                  dataUrl: downscaleCanvasToSaveUrl(hiC),
                  detectedNumber: analyzed.cardNumber,
                  manualSlotNum: null,
                  name: analyzed.name,
                  type: analyzed.type,
                  rarity: analyzed.rarity,
                  regulation: analyzed.regulation || packDefaultReg,
                  qty: isNaN(defaultQty) ? 1 : defaultQty,
                  engine: analyzed.engine
                });
              } catch (_) {
                res(null);
              }
            };
            img.src = ev.target.result;
          };
          r.readAsDataURL(f);
        });
        if (itemData) batchItems.push(itemData);
        if (useGemini && idx < totalFiles - 1) await new Promise((r) => setTimeout(r, 250));
      }
      showLoadingModal("✨ 確認画面を準備中...", `${totalFiles} / ${totalFiles} 枚完了`, 100);
      await new Promise((r) => setTimeout(r, 120));
    } finally {
      hideLoadingModal();
    }

    if (batchItems.length === 0) return showToast("画像を読み込めませんでした");
    renderBatchModalList();
    if ($("batchPhotoModal")) $("batchPhotoModal").classList.add("is-open");
  }

  function renderBatchModalList() {
    const list = $("batchItemsList");
    if (!list) return;
    const allRegs = getAllRegulations();
    const pack = state.packs.find((p) => p.id === batchPackId);

    list.innerHTML = batchItems.map((it, idx) => {
      const targetSlot = resolveBatchItemTargetSlot(it, idx);
      const existingCard = pack && pack.cards ? (pack.cards[targetSlot] || pack.cards[String(targetSlot)]) : null;
      const existingQty = existingCard ? Number(existingCard.qty) || 0 : 0;

      const typeOptsHtml = TYPE_OPTIONS.map((t) => `<option value="${t}" ${it.type === t ? "selected" : ""}>${TYPE_META[t].icon} ${t}</option>`).join("");
      const rarOptsHtml = RARITY_OPTIONS.map((r) => `<option value="${r}" ${it.rarity === r ? "selected" : ""}>${r}</option>`).join("");
      const regOptsHtml = allRegs.map((rg) => `<option value="${escapeHtml(rg)}" ${(it.regulation || "I") === rg ? "selected" : ""}>レギュ${rg === "-" ? "なし" : escapeHtml(rg)}</option>`).join("");
      const engBadge = it.engine === "gemini" ? `<span style="font-size:9px;color:#6d28d9;background:#ede9fe;padding:1px 5px;border-radius:9999px;font-weight:800;">✨AI</span>` : "";
      const existBadge = existingQty > 0 ? `<span style="font-size:9px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:9999px;font-weight:800;">既存${existingQty}枚</span>` : "";

      return `
        <div style="display:flex;align-items:flex-start;gap:8px;background:#f8fafc;padding:8px;border-radius:12px;border:1px solid var(--border-light);">
          <img src="${it.dataUrl}" style="width:44px;aspect-ratio:63/88;object-fit:cover;border-radius:5px;flex-shrink:0;" />
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-weight:900;font-size:11.5px;">#</span>
                <input type="number" class="form-control b-slot" data-idx="${idx}" value="${targetSlot}" min="1" max="${pack ? pack.total : 500}" style="width:52px;padding:2px 4px;font-size:11.5px;font-weight:900;text-align:center;" />
                ${engBadge}${existBadge}
              </div>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-size:10.5px;font-weight:700;color:var(--text-secondary);">枚数</span>
                <input type="number" class="form-control b-qty" data-idx="${idx}" value="${it.qty}" min="0" style="width:46px;padding:2px 4px;font-size:12px;text-align:center;" />
              </div>
            </div>
            <input type="text" class="form-control b-name" data-idx="${idx}" value="${escapeHtml(it.name)}" placeholder="カード名" style="padding:4px 8px;font-size:12px;" />
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
              <select class="form-control b-type" data-idx="${idx}" style="padding:4px 4px;font-size:11px;">${typeOptsHtml}</select>
              <select class="form-control b-rar" data-idx="${idx}" style="padding:4px 4px;font-size:11px;">${rarOptsHtml}</select>
              <select class="form-control b-reg" data-idx="${idx}" style="padding:4px 4px;font-size:11px;">${regOptsHtml}</select>
            </div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".b-slot").forEach((inp) => inp.addEventListener("input", (e) => {
      batchItems[Number(e.target.dataset.idx)].manualSlotNum = Math.max(1, Number(e.target.value) || 1);
    }));
    list.querySelectorAll(".b-name").forEach((inp) => inp.addEventListener("input", (e) => { batchItems[Number(e.target.dataset.idx)].name = e.target.value; }));
    list.querySelectorAll(".b-qty").forEach((inp) => inp.addEventListener("input", (e) => { batchItems[Number(e.target.dataset.idx)].qty = Math.max(0, Number(e.target.value) || 0); }));
    list.querySelectorAll(".b-type").forEach((sel) => sel.addEventListener("change", (e) => { batchItems[Number(e.target.dataset.idx)].type = e.target.value; }));
    list.querySelectorAll(".b-rar").forEach((sel) => sel.addEventListener("change", (e) => { batchItems[Number(e.target.dataset.idx)].rarity = e.target.value; }));
    list.querySelectorAll(".b-reg").forEach((sel) => sel.addEventListener("change", (e) => { batchItems[Number(e.target.dataset.idx)].regulation = e.target.value; }));
  }

  /* ================= デッキ管理・カテゴリ内訳・公式順整列・ルール検証 ================= */
  function findCardInBinder(item) {
    if (!item) return null;
    if (item.packId && item.slotNum) {
      const p = resolvePackByAnyIdOrCode(item.packId);
      if (p) {
        const c = p.cards[item.slotNum] || p.cards[String(item.slotNum)] || {};
        return {
          packId: p.id, slotNum: Number(item.slotNum), name: c.name || item.name, type: c.type || "草",
          rarity: c.rarity || "C", qty: Number(c.qty) || 0, inUse: Number(c.inUse) || 0,
          avail: Math.max(0, (Number(c.qty) || 0) - (Number(c.inUse) || 0)),
          photoUrl: photoCache.get(getPhotoKey(p.id, Number(item.slotNum))) || ""
        };
      }
    }
    const slotRefMatch = String(item.name || "").trim().match(/^(.+?)\s*[#＃](\d{1,3})$/);
    if (slotRefMatch) {
      const sNum = Number(slotRefMatch[2]), matchedPack = resolvePackByAnyIdOrCode(slotRefMatch[1]);
      if (matchedPack && sNum >= 1 && sNum <= matchedPack.total) {
        const c = matchedPack.cards[sNum] || matchedPack.cards[String(sNum)] || {};
        return {
          packId: matchedPack.id, slotNum: sNum, name: c.name || item.name, type: c.type || "草",
          rarity: c.rarity || "C", qty: Number(c.qty) || 0, inUse: Number(c.inUse) || 0,
          avail: Math.max(0, (Number(c.qty) || 0) - (Number(c.inUse) || 0)),
          photoUrl: photoCache.get(getPhotoKey(matchedPack.id, sNum)) || ""
        };
      }
    }
    const rawTarget = normalizeCardKey(item.name);
    const cleanTarget = normalizeCardKey(String(item.name || "").replace(/[（(][^）)]*[）)]/g, ""));
    if (!rawTarget && !cleanTarget) return null;

    let totalQty = 0, totalInUse = 0, bestPhoto = "", bestType = "草", bestRarity = "C", foundPackId = null, foundSlot = null;
    state.packs.forEach((p) => {
      Object.entries(p.cards || {}).forEach(([sStr, c]) => {
        if (!c || !c.name) return;
        const cKey = normalizeCardKey(c.name);
        if (cKey === rawTarget || (cleanTarget && cKey === cleanTarget)) {
          const q = Number(c.qty) || 0;
          totalQty += q; totalInUse += Number(c.inUse) || 0;
          const pUrl = photoCache.get(getPhotoKey(p.id, Number(sStr))) || "";
          if (!bestPhoto && pUrl) bestPhoto = pUrl;
          bestType = c.type || bestType;
          bestRarity = c.rarity || bestRarity;
          if (foundPackId === null) { foundPackId = p.id; foundSlot = Number(sStr); }
        }
      });
    });
    if (foundPackId === null) return null;
    return { packId: foundPackId, slotNum: foundSlot, name: item.name, type: bestType, rarity: bestRarity, qty: totalQty, inUse: totalInUse, avail: Math.max(0, totalQty - totalInUse), photoUrl: bestPhoto };
  }

  function analyzeDeckStatsAndRules(cardsArray) {
    const counts = { poke: 0, goods: 0, tool: 0, support: 0, stadium: 0, energy: 0 };
    const nameCounts = new Map();
    let aceSpecCount = 0;
    const warnings = [];

    (cardsArray || []).forEach((dc) => {
      const cnt = Number(dc.count) || 0;
      if (cnt <= 0) return;
      const info = findCardInBinder(dc);
      const t = info ? info.type : "草";
      const rar = info ? info.rarity : "C";

      if (t === "グッズ") counts.goods += cnt;
      else if (t === "ポケモンのどうぐ") counts.tool += cnt;
      else if (t === "サポート") counts.support += cnt;
      else if (t === "スタジアム") counts.stadium += cnt;
      else if (t === "エネルギー" || /エネルギー/.test(dc.name || "")) counts.energy += cnt;
      else counts.poke += cnt;

      if (rar === "ACE") aceSpecCount += cnt;

      const nm = String(dc.name || "").trim();
      const isBasicEnergy = /^基本.+エネルギー$/.test(normalizeCardKey(nm));
      if (!isBasicEnergy && nm !== "") {
        const nKey = normalizeCardKey(nm);
        const prev = nameCounts.get(nKey);
        nameCounts.set(nKey, { label: nm, total: (prev ? prev.total : 0) + cnt });
      }
    });

    nameCounts.forEach((v) => {
      if (v.total > 4) warnings.push(`⚠️ 「${v.label}」が合計${v.total}枚（4枚上限超過）`);
    });
    if (aceSpecCount > 1) warnings.push(`⚠️ ACE SPECが合計${aceSpecCount}枚（デッキに1枚まで）`);

    return { counts, warnings };
  }

  function getDeckCategoryOrder(dc) {
    const info = findCardInBinder(dc);
    const t = info ? info.type : (/エネルギー/.test(dc.name || "") ? "エネルギー" : "草");
    if (POKEMON_TYPES.includes(t)) return 1;
    if (t === "グッズ") return 2;
    if (t === "ポケモンのどうぐ") return 3;
    if (t === "サポート") return 4;
    if (t === "スタジアム") return 5;
    if (t === "エネルギー") return 6;
    return 7;
  }

  function renderDeckPickTray() {
    const sum = tempDeckCards.reduce((a, c) => a + c.count, 0);
    if ($("deckTrayTitle")) $("deckTrayTitle").textContent = `🃏 選択中: ${sum} / 60枚（下の図鑑をタップで追加）`;
    const strip = $("deckTrayStrip");
    if (!strip) return;
    if (tempDeckCards.length === 0) {
      strip.innerHTML = `<span style="font-size:12px;color:var(--text-secondary);">図鑑のカード枠をタップするとここに並びます</span>`;
      return;
    }
    strip.innerHTML = tempDeckCards.map((c, idx) => {
      const info = findCardInBinder(c), pUrl = info ? info.photoUrl : "", meta = TYPE_META[info ? info.type : "草"] || TYPE_META["草"];
      return `
        <div class="tray-card-item">
          <div class="tray-thumb" style="border-color:${meta.border};">${pUrl ? `<img src="${pUrl}" />` : `<span>${meta.icon}</span>`}</div>
          <div class="tray-step-row">
            <button class="tray-mini-btn minus" data-idx="${idx}" type="button">−</button>
            <span class="tray-cnt">${c.count}</span>
            <button class="tray-mini-btn plus" data-idx="${idx}" type="button">＋</button>
          </div>
        </div>
      `;
    }).join("");
    strip.querySelectorAll(".minus").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.idx);
      if (tempDeckCards[i].count <= 1) tempDeckCards.splice(i, 1); else tempDeckCards[i].count -= 1;
      renderDeckPickTray(); renderBinder();
    }));
    strip.querySelectorAll(".plus").forEach((b) => b.addEventListener("click", () => {
      tempDeckCards[Number(b.dataset.idx)].count += 1; renderDeckPickTray(); renderBinder();
    }));
  }

  function renderDecksTab() {
    const container = $("decksListContainer");
    if (!container) return;
    const basis = $("deckCheckBasisSelect") ? $("deckCheckBasisSelect").value : "available";
    const list = getOrderedDecks(), seqAlloc = computeSequentialDeckAllocations();

    if (list.length === 0) {
      container.innerHTML = `<div class="panel-card" style="text-align:center;color:var(--text-secondary);">デッキがまだありません。「＋ デッキを追加」から作成できます。</div>`;
      return;
    }
    container.innerHTML = "";
    list.forEach((deck, idx) => {
      const deckCards = Array.isArray(deck.cards) ? deck.cards : [];
      const alloc = seqAlloc.get(deck.id) || { totalCount: 0, shortCount: 0, items: [] };
      let totalCnt = alloc.totalCount, shortCnt = 0;
      if (basis === "available") shortCnt = alloc.shortCount;
      else deckCards.forEach((dc) => { const info = findCardInBinder(dc), have = info ? info.qty : 0; if (have < dc.count) shortCnt += dc.count - have; });

      const { counts, warnings } = analyzeDeckStatsAndRules(deckCards);
      const dateLabel = deck.createdDate || (deck.createdAt ? new Date(deck.createdAt).toISOString().slice(0, 10) : "");
      const card = document.createElement("div");
      card.className = "panel-card";
      const thumbs = deckCards.slice(0, 12).map((dc) => {
        const info = findCardInBinder(dc), pUrl = info ? info.photoUrl : "";
        return `<div style="width:36px;aspect-ratio:63/88;border-radius:5px;background:#f1f5f9;border:1px solid var(--border-light);flex-shrink:0;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">
          ${pUrl ? `<img src="${pUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `<span>${escapeHtml(String(dc.name || "").slice(0, 2))}</span>`}
          <span style="position:absolute;right:1px;bottom:1px;background:rgba(15,23,42,0.82);color:#fff;font-size:8.5px;padding:0 3px;border-radius:9999px;">×${dc.count}</span>
        </div>`;
      }).join("");

      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:4px;min-width:0;">
            <button class="mini-round-btn d-up" type="button" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button class="mini-round-btn d-dn" type="button" ${idx === list.length - 1 ? "disabled" : ""}>↓</button>
            <strong style="font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(deck.name)}</strong>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <span class="badge-chip">${totalCnt}/60枚</span>
            <span class="badge-chip" style="background:${shortCnt === 0 ? "var(--accent-green-soft)" : "var(--accent-red-soft)"};color:${shortCnt === 0 ? "var(--accent-green-dark)" : "var(--accent-red)"};">${shortCnt === 0 ? "OK" : `不足${shortCnt}`}</span>
          </div>
        </div>
        <div style="font-size:10.5px;color:var(--text-secondary);margin-bottom:4px;padding-left:2px;">
          ${dateLabel ? `📅 ${escapeHtml(dateLabel)} ／ ` : ""}ポケ${counts.poke}・グ${counts.goods}・道${counts.tool}・サ${counts.support}・ス${counts.stadium}・エ${counts.energy}
        </div>
        ${warnings.length > 0 ? `<div style="font-size:10.5px;color:#b91c1c;font-weight:800;margin-bottom:4px;">${escapeHtml(warnings.join(" / "))}</div>` : ""}
        <div style="display:flex;gap:4px;overflow-x:auto;padding:4px 0 8px;">${thumbs}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn-pill-secondary d-det" type="button" style="flex:1;justify-content:center;">🖼️ 詳細・試引</button>
          <button class="btn-pill-secondary d-dup" type="button">📋 複製</button>
          <button class="btn-pill-secondary d-edt" type="button">✏️ 編集</button>
        </div>
      `;
      card.querySelector(".d-up").addEventListener("click", () => {
        const realIdx = state.decks.findIndex((d) => d.id === deck.id);
        if (realIdx > 0) { const [m] = state.decks.splice(realIdx, 1); state.decks.splice(realIdx - 1, 0, m); state.deckSort = "manual"; saveState(); renderDecksTab(); }
      });
      card.querySelector(".d-dn").addEventListener("click", () => {
        const realIdx = state.decks.findIndex((d) => d.id === deck.id);
        if (realIdx < state.decks.length - 1) { const [m] = state.decks.splice(realIdx, 1); state.decks.splice(realIdx + 1, 0, m); state.deckSort = "manual"; saveState(); renderDecksTab(); }
      });
      card.querySelector(".d-det").addEventListener("click", () => openDeckDetailModal(deck.id));
      card.querySelector(".d-dup").addEventListener("click", () => {
        state.decks.push({ id: "deck_" + Date.now(), name: `${deck.name} (コピー)`, createdDate: todayIsoDate(), createdAt: Date.now(), cards: deckCards.map((c) => ({ ...c })) });
        saveState(); renderAll(); showToast("デッキを複製し、使用中枚数を更新しました");
      });
      card.querySelector(".d-edt").addEventListener("click", () => openDeckModal(deck.id));
      container.appendChild(card);
    });
  }

  function openDeckModal(deckId = null) {
    editingDeckId = deckId;
    const delBtn = $("deleteDeckBtn");
    if (deckId) {
      const d = state.decks.find((x) => x.id === deckId);
      if (!d) return;
      if ($("deckModalTitle")) $("deckModalTitle").textContent = "✏️ デッキを編集";
      if ($("deckNameInput")) $("deckNameInput").value = d.name || "";
      if ($("deckCreatedDateInput")) $("deckCreatedDateInput").value = d.createdDate || todayIsoDate();
      tempDeckCards = (d.cards || []).map((c) => ({ ...c }));
      if (delBtn) delBtn.style.display = "inline-block";
    } else {
      if ($("deckModalTitle")) $("deckModalTitle").textContent = "＋ 新しいデッキ";
      if ($("deckNameInput")) $("deckNameInput").value = "";
      if ($("deckCreatedDateInput")) $("deckCreatedDateInput").value = todayIsoDate();
      tempDeckCards = [];
      if (delBtn) delBtn.style.display = "none";
    }
    renderDeckCardsEditor();
    if ($("deckModal")) $("deckModal").classList.add("is-open");
  }

  function updateDeckEditorStats() {
    const sum = tempDeckCards.reduce((a, x) => a + (Number(x.count) || 0), 0);
    if ($("deckTotalBadge")) $("deckTotalBadge").textContent = sum;

    const { counts, warnings } = analyzeDeckStatsAndRules(tempDeckCards);
    if ($("deckEditorBreakdownBar")) {
      $("deckEditorBreakdownBar").innerHTML = `
        <span class="deck-bd-chip">👾 ポケ ${counts.poke}</span>
        <span class="deck-bd-chip">🎒 グッズ ${counts.goods}</span>
        <span class="deck-bd-chip">🛠️ どうぐ ${counts.tool}</span>
        <span class="deck-bd-chip">🧑 サポ ${counts.support}</span>
        <span class="deck-bd-chip">🏟️ スタ ${counts.stadium}</span>
        <span class="deck-bd-chip">🔋 エネ ${counts.energy}</span>
      `;
    }
    const warnBox = $("deckRuleWarningBox");
    if (warnBox) {
      if (warnings.length > 0) {
        warnBox.style.display = "block";
        warnBox.innerHTML = warnings.map((w) => `<div>${escapeHtml(w)}</div>`).join("");
      } else {
        warnBox.style.display = "none";
      }
    }
  }

  function renderDeckCardsEditor() {
    const list = $("deckCardsEditorList");
    if (!list) return;
    list.innerHTML = tempDeckCards.map((c, idx) => {
      const info = findCardInBinder(c);
      if (info && !c.packId) { c.packId = info.packId; c.slotNum = info.slotNum; }
      const pUrl = info ? info.photoUrl : "";
      return `
        <div style="display:flex;align-items:center;gap:4px;background:#f8fafc;padding:5px 6px;border-radius:9px;border:1px solid var(--border-light);">
          <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
            <button type="button" class="mini-round-btn dk-up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""} style="width:20px;height:18px;font-size:10px;">↑</button>
            <button type="button" class="mini-round-btn dk-dn" data-idx="${idx}" ${idx === tempDeckCards.length - 1 ? "disabled" : ""} style="width:20px;height:18px;font-size:10px;">↓</button>
          </div>
          <div style="width:26px;aspect-ratio:63/88;border-radius:3px;overflow:hidden;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;">
            ${pUrl ? `<img src="${pUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `🃏`}
          </div>
          <input type="text" class="form-control dk-nm" data-idx="${idx}" value="${escapeHtml(c.name)}" style="padding:5px 7px;font-size:12px;" />
          <input type="number" class="form-control dk-ct" data-idx="${idx}" value="${c.count}" min="1" max="60" style="width:48px;padding:5px 2px;text-align:center;font-size:12px;" />
          <button type="button" class="modal-close-x dk-rm" data-idx="${idx}" style="width:22px;height:22px;font-size:10px;flex-shrink:0;">✕</button>
        </div>
      `;
    }).join("");
    updateDeckEditorStats();

    list.querySelectorAll(".dk-up").forEach((btn) => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      if (i > 0) { const [m] = tempDeckCards.splice(i, 1); tempDeckCards.splice(i - 1, 0, m); renderDeckCardsEditor(); }
    }));
    list.querySelectorAll(".dk-dn").forEach((btn) => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      if (i < tempDeckCards.length - 1) { const [m] = tempDeckCards.splice(i, 1); tempDeckCards.splice(i + 1, 0, m); renderDeckCardsEditor(); }
    }));
    list.querySelectorAll(".dk-nm").forEach((inp) => inp.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      tempDeckCards[idx].name = e.target.value;
      const linked = findCardInBinder({ name: e.target.value });
      if (linked) { tempDeckCards[idx].packId = linked.packId; tempDeckCards[idx].slotNum = linked.slotNum; }
      else { tempDeckCards[idx].packId = null; tempDeckCards[idx].slotNum = null; }
      updateDeckEditorStats();
    }));
    list.querySelectorAll(".dk-ct").forEach((inp) => inp.addEventListener("input", (e) => {
      tempDeckCards[Number(e.target.dataset.idx)].count = Math.max(1, Number(e.target.value) || 1);
      updateDeckEditorStats();
    }));
    list.querySelectorAll(".dk-rm").forEach((btn) => btn.addEventListener("click", () => {
      tempDeckCards.splice(Number(btn.dataset.idx), 1); renderDeckCardsEditor();
    }));
  }

  function parseRecipeAndLinkBinder(raw) {
    String(raw || "").split(/\r?\n/).forEach((line) => {
      const clean = line.trim(); if (!clean) return;
      let count = 1, name = clean;
      const m1 = clean.match(/^(\d+)\s*[枚xX×]?\s+(.+)$/), m2 = clean.match(/^(.+?)\s*[xX×]?\s*(\d+)\s*枚?$/);
      if (m1) { count = Number(m1[1]) || 1; name = m1[2].trim(); }
      else if (m2) { name = m2[1].trim(); count = Number(m2[2]) || 1; }
      if (!name) return;

      const linked = findCardInBinder({ name });
      const ex = tempDeckCards.find((c) => {
        if (linked && c.packId && String(linked.packId) === String(c.packId) && Number(linked.slotNum) === Number(c.slotNum)) return true;
        return normalizeCardKey(c.name) === normalizeCardKey(name);
      });
      if (ex) { ex.count += count; if (!ex.packId && linked) { ex.packId = linked.packId; ex.slotNum = linked.slotNum; } }
      else tempDeckCards.push({ name, count, packId: linked ? linked.packId : null, slotNum: linked ? linked.slotNum : null });
    });
  }

  /* ================= ポケポケ風・デッキ詳細シート ================= */
  function openDeckDetailModal(deckId) {
    const deck = state.decks.find((d) => d.id === deckId);
    if (!deck) return;
    activeDetailDeckId = deckId;
    const basis = $("deckCheckBasisSelect") ? $("deckCheckBasisSelect").value : "available";
    const deckCards = Array.isArray(deck.cards) ? deck.cards : [];

    if ($("pdsDeckTitleBar")) $("pdsDeckTitleBar").textContent = deck.name;
    if ($("pdsDateChip")) $("pdsDateChip").textContent = deck.createdDate ? `📅 ${deck.createdDate}` : "";

    const seqAlloc = computeSequentialDeckAllocations();
    const alloc = seqAlloc.get(deck.id);
    const missingLines = [];

    if (basis === "available" && alloc) {
      deckZoomCards = alloc.items.map((it) => { if (it.short > 0) missingLines.push(`${it.short} ${it.name}`); return it; });
    } else {
      deckZoomCards = deckCards.map((dc) => {
        const info = findCardInBinder(dc), have = info ? info.qty : 0, short = Math.max(0, dc.count - have);
        if (short > 0) missingLines.push(`${short} ${dc.name}`);
        return { name: dc.name, count: dc.count, short, have, photoUrl: info ? info.photoUrl : "", type: info ? info.type : "草", rarity: info ? info.rarity : "C" };
      });
    }

    const totalDeckCards = deckZoomCards.reduce((sum, c) => sum + c.count, 0);
    if ($("pdsCountPill")) $("pdsCountPill").textContent = `🃏 ${totalDeckCards}/60`;

    const firstWithPhoto = deckZoomCards.find((c) => c.photoUrl);
    const boxEl = $("pdsDeckBoxArt");
    if (boxEl) {
      if (firstWithPhoto) boxEl.innerHTML = `<img src="${firstWithPhoto.photoUrl}" alt="" />`;
      else if (deckZoomCards.length > 0) boxEl.innerHTML = `<span style="font-size:26px;">${(TYPE_META[deckZoomCards[0].type] || TYPE_META["草"]).icon}</span>`;
      else boxEl.innerHTML = `🃏`;
    }

    const expandedTiles = [];
    deckZoomCards.forEach((c, groupIdx) => {
      const cnt = Math.max(1, Number(c.count) || 1);
      for (let copyNo = 0; copyNo < cnt; copyNo++) expandedTiles.push({ ...c, groupIdx, isShortCopy: copyNo >= (cnt - c.short) });
    });

    const gridHtml = expandedTiles.map((tile) => {
      const meta = TYPE_META[tile.type] || TYPE_META["草"];
      return `
        <div class="pds-card-tile${tile.isShortCopy ? " is-short" : ""}" data-gidx="${tile.groupIdx}">
          ${tile.photoUrl
            ? `<img src="${tile.photoUrl}" alt="${escapeHtml(tile.name)}" loading="lazy" />`
            : `<div class="pds-card-fallback" style="background:${meta.tint};">
                 <div style="font-weight:900;font-size:10px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(tile.name)}</div>
                 <div style="font-size:26px;margin:auto 0;">${meta.icon}</div>
                 <div style="font-size:9px;font-weight:800;color:#475569;">${escapeHtml(tile.type)}</div>
               </div>`}
          ${tile.isShortCopy ? `<span class="pds-short-tag">不足</span>` : ""}
        </div>
      `;
    }).join("");

    const { counts } = analyzeDeckStatsAndRules(deckCards);
    const allCardsText = deckZoomCards.map((c) => `${c.count} ${c.name}`).join("\n");
    const body = $("pdsScrollBody");
    if (body) {
      body.innerHTML = `
        <div class="deck-breakdown-bar" style="justify-content:center;">
          <span class="deck-bd-chip">👾 ポケ ${counts.poke}</span>
          <span class="deck-bd-chip">🎒 グッズ ${counts.goods}</span>
          <span class="deck-bd-chip">🛠️ どうぐ ${counts.tool}</span>
          <span class="deck-bd-chip">🧑 サポ ${counts.support}</span>
          <span class="deck-bd-chip">🏟️ スタ ${counts.stadium}</span>
          <span class="deck-bd-chip">🔋 エネ ${counts.energy}</span>
        </div>
        <div class="pds-card-grid-3">${gridHtml}</div>
        <div style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:11px;margin-bottom:10px;box-shadow:var(--shadow-card);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:900;">📝 デッキ中身（文字リスト・計${totalDeckCards}枚）</span>
            <button id="copyAllDeckTextBtn" class="btn-pill-secondary" type="button" style="padding:3px 10px;font-size:11px;">📋 全文コピー</button>
          </div>
          <pre style="margin:0;font-family:inherit;font-size:12px;line-height:1.55;white-space:pre-wrap;max-height:140px;overflow-y:auto;color:var(--text-primary);">${escapeHtml(allCardsText || "カードが登録されていません")}</pre>
        </div>
        <button id="copyMissingBtn" class="btn-save-solid" type="button">📋 不足リストをコピー (${missingLines.length}種)</button>
      `;

      body.querySelectorAll(".pds-card-tile").forEach((el) => el.addEventListener("click", () => openDeckZoomAt(Number(el.dataset.gidx))));
      const copyAll = body.querySelector("#copyAllDeckTextBtn");
      if (copyAll) copyAll.addEventListener("click", () => { if (navigator.clipboard) navigator.clipboard.writeText(allCardsText).then(() => showToast("デッキの文字リストをコピーしました")); });
      const copyMiss = body.querySelector("#copyMissingBtn");
      if (copyMiss) copyMiss.addEventListener("click", () => {
        const txt = missingLines.length > 0 ? missingLines.join("\n") : "不足カードはありません！";
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => showToast("不足リストをコピーしました"));
      });
    }
    if ($("pocketDeckSheet")) $("pocketDeckSheet").classList.add("is-open");
  }

  /* ================= 初手7枚ドローテスト ================= */
  function startDrawTestForDeck(deckId) {
    const deck = state.decks.find((d) => d.id === deckId);
    if (!deck) return;
    const pool = [];
    (deck.cards || []).forEach((dc) => {
      const info = findCardInBinder(dc);
      const cnt = Math.max(0, Number(dc.count) || 0);
      for (let i = 0; i < cnt; i++) {
        pool.push({
          name: dc.name,
          type: info ? info.type : (/エネルギー/.test(dc.name || "") ? "エネルギー" : "草"),
          photoUrl: info ? info.photoUrl : ""
        });
      }
    });
    if (pool.length === 0) return showToast("デッキにカードが入っていません");

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    drawTestDeckPool = pool;
    drawTestDrawnCount = Math.min(7, pool.length);
    renderDrawTestHand();
    if ($("drawTestModal")) $("drawTestModal").classList.add("is-open");
  }

  function renderDrawTestHand() {
    const hand = drawTestDeckPool.slice(0, drawTestDrawnCount);
    const hasPokemon = hand.some((c) => POKEMON_TYPES.includes(c.type));
    const banner = $("drawTestStatusBanner");
    if (banner) {
      if (hasPokemon) {
        banner.style.background = "var(--accent-green-soft)";
        banner.style.color = "var(--accent-green-dark)";
        banner.textContent = `✅ ポケモンあり（現在 ${hand.length}枚 ／ 山札残り ${Math.max(0, drawTestDeckPool.length - hand.length)}枚）`;
      } else {
        banner.style.background = "var(--accent-red-soft)";
        banner.style.color = "var(--accent-red)";
        banner.textContent = `⚠️ ポケモンなし・マリガン対象（現在 ${hand.length}枚）`;
      }
    }

    const grid = $("drawTestHandGrid");
    if (!grid) return;
    grid.innerHTML = hand.map((c) => {
      const meta = TYPE_META[c.type] || TYPE_META["草"];
      return `
        <div style="aspect-ratio:63/88;border-radius:7px;overflow:hidden;border:2px solid ${meta.border};background:${meta.tint};display:flex;flex-direction:column;justify-content:space-between;padding:4px;text-align:center;position:relative;">
          ${c.photoUrl
            ? `<img src="${c.photoUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />`
            : `<div style="font-size:8.5px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.name)}</div>
               <div style="font-size:18px;margin:auto 0;">${meta.icon}</div>
               <div style="font-size:8px;font-weight:800;color:#475569;">${escapeHtml(c.type)}</div>`}
        </div>
      `;
    }).join("");
  }

  /* ================= デッキ拡大＆ピンチズーム ================= */
  function renderDeckZoomCard(item) {
    if (!item) return `<div class="deck-zoom-card-box" style="opacity:0;"></div>`;
    const meta = TYPE_META[item.type] || TYPE_META["草"];
    if (item.photoUrl) return `<div class="deck-zoom-card-box"><img src="${item.photoUrl}" /></div>`;
    return `
      <div class="deck-zoom-card-box" style="background:${meta.tint};padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-weight:900;font-size:16px;">${escapeHtml(item.name)}</div>
        <div style="font-size:52px;text-align:center;margin:auto 0;">${meta.icon}</div>
        <div style="font-weight:800;font-size:13px;text-align:right;">必要 ${item.count}枚</div>
      </div>
    `;
  }
  function openDeckZoomAt(idx) {
    if (deckZoomCards.length === 0) return;
    deckZoomIdx = Math.max(0, Math.min(deckZoomCards.length - 1, idx));
    dzScale = 1; dzPanX = 0; dzPanY = 0;
    if ($("deckZoomLabel")) $("deckZoomLabel").textContent = `${deckZoomCards[deckZoomIdx].name} (${deckZoomIdx + 1}/${deckZoomCards.length})`;
    if ($("dzSlidePrev")) $("dzSlidePrev").innerHTML = renderDeckZoomCard(deckZoomCards[deckZoomIdx - 1] || null);
    if ($("dzSlideCurr")) $("dzSlideCurr").innerHTML = renderDeckZoomCard(deckZoomCards[deckZoomIdx]);
    if ($("dzSlideNext")) $("dzSlideNext").innerHTML = renderDeckZoomCard(deckZoomCards[deckZoomIdx + 1] || null);
    const tr = $("deckZoomTrack");
    if (tr) { tr.style.transition = "none"; tr.style.transform = "translate3d(-33.333333%, 0, 0)"; }
    if ($("deckZoomOverlay")) $("deckZoomOverlay").classList.add("is-open");
  }
  function applyDeckZoomTransform() {
    const box = document.querySelector("#dzSlideCurr .deck-zoom-card-box");
    if (box) box.style.transform = `translate3d(${dzPanX}px, ${dzPanY}px, 0) scale(${dzScale})`;
    if ($("resetDeckZoomBtn")) $("resetDeckZoomBtn").textContent = `${dzScale.toFixed(1)}x`;
  }

  /* ================= パック設定・検索シート ================= */
  function openPackModal(packId = null) {
    refreshRegulationSelectOptions();
    editingPackId = packId;
    const delBtn = $("deletePackBtn");
    if (packId) {
      const p = state.packs.find((x) => x.id === packId);
      if (!p) return;
      if ($("packModalTitle")) $("packModalTitle").textContent = "⚙️ パック編集";
      if ($("packNameInput")) $("packNameInput").value = p.name;
      if ($("packCodeInput")) $("packCodeInput").value = p.code || "";
      if ($("packReleaseDateInput")) $("packReleaseDateInput").value = p.releaseDate || "2026-09-16";
      if ($("packDefaultRegSelect")) $("packDefaultRegSelect").value = p.defaultReg || "I";
      if ($("packRegularTotalInput")) $("packRegularTotalInput").value = p.regularTotal || p.total;
      if ($("packTotalInput")) $("packTotalInput").value = p.total;
      if (delBtn) delBtn.style.display = "inline-block";
    } else {
      if ($("packModalTitle")) $("packModalTitle").textContent = "＋ 新しいパック";
      if ($("packNameInput")) $("packNameInput").value = "";
      if ($("packCodeInput")) $("packCodeInput").value = "";
      if ($("packDefaultRegSelect")) $("packDefaultRegSelect").value = (state.regulations && state.regulations[0]) || "J";
      if ($("packRegularTotalInput")) $("packRegularTotalInput").value = 63;
      if ($("packTotalInput")) $("packTotalInput").value = 92;
      if (delBtn) delBtn.style.display = "none";
    }
    if ($("packModal")) $("packModal").classList.add("is-open");
  }

  function rebuildPocketRegPills() {
    const regGrid = $("pocketRegGrid");
    if (!regGrid) return;
    regGrid.innerHTML = "";
    (state.regulations || DEFAULT_REGULATIONS).forEach((rg) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "pocket-choice-pill"; btn.dataset.val = rg;
      btn.innerHTML = `<span>🏷️</span><span>レギュ ${escapeHtml(rg)}</span>`;
      btn.addEventListener("click", () => {
        if (filterState.regulations.has(rg)) filterState.regulations.delete(rg); else filterState.regulations.add(rg);
        syncPocketSearchSheetUI();
      });
      regGrid.appendChild(btn);
    });
  }

  function initPocketSearchPills() {
    const typeGrid = $("pocketTypeGrid"), trainerGrid = $("pocketTrainerGrid"), statusGrid = $("pocketStatusGrid");
    if (typeGrid) {
      POKEMON_TYPES.forEach((t) => {
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "pocket-choice-pill"; btn.dataset.val = t;
        btn.innerHTML = `<span>${TYPE_META[t].icon}</span><span>${t}</span>`;
        btn.addEventListener("click", () => { if (filterState.types.has(t)) filterState.types.delete(t); else filterState.types.add(t); syncPocketSearchSheetUI(); });
        typeGrid.appendChild(btn);
      });
    }
    if (trainerGrid) {
      TRAINER_TYPES.forEach((t) => {
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "pocket-choice-pill"; btn.dataset.val = t;
        btn.innerHTML = `<span>${TYPE_META[t].icon}</span><span>${t}</span>`;
        btn.addEventListener("click", () => { if (filterState.trainers.has(t)) filterState.trainers.delete(t); else filterState.trainers.add(t); syncPocketSearchSheetUI(); });
        trainerGrid.appendChild(btn);
      });
    }
    rebuildPocketRegPills();
    if (statusGrid) {
      STATUS_PILL_OPTIONS.forEach((st) => {
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "pocket-choice-pill"; btn.dataset.val = st.id;
        btn.innerHTML = `<span>${st.icon}</span><span>${st.label}</span>`;
        btn.addEventListener("click", () => { if (filterState.statuses.has(st.id)) filterState.statuses.delete(st.id); else filterState.statuses.add(st.id); syncPocketSearchSheetUI(); });
        statusGrid.appendChild(btn);
      });
    }
  }

  function syncPocketSearchSheetUI() {
    document.querySelectorAll("#pocketTypeGrid .pocket-choice-pill").forEach((b) => b.classList.toggle("is-selected", filterState.types.has(b.dataset.val)));
    document.querySelectorAll("#pocketTrainerGrid .pocket-choice-pill").forEach((b) => b.classList.toggle("is-selected", filterState.trainers.has(b.dataset.val)));
    document.querySelectorAll("#pocketRegGrid .pocket-choice-pill").forEach((b) => b.classList.toggle("is-selected", filterState.regulations.has(b.dataset.val)));
    document.querySelectorAll("#pocketStatusGrid .pocket-choice-pill").forEach((b) => b.classList.toggle("is-selected", filterState.statuses.has(b.dataset.val)));
    if ($("pocketTypeCountBadge")) $("pocketTypeCountBadge").textContent = filterState.types.size === 0 ? "すべて" : `${filterState.types.size}件選択`;
    if ($("pocketTrainerCountBadge")) $("pocketTrainerCountBadge").textContent = filterState.trainers.size === 0 ? "すべて" : `${filterState.trainers.size}件選択`;
    if ($("pocketRegCountBadge")) $("pocketRegCountBadge").textContent = filterState.regulations.size === 0 ? "すべて" : `${filterState.regulations.size}件選択`;
    if ($("pocketStatusCountBadge")) $("pocketStatusCountBadge").textContent = filterState.statuses.size === 0 ? "すべて" : `${filterState.statuses.size}件選択`;
  }

  function escapeHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  let toastTimer = null;
  function showToast(msg) {
    const el = $("toastBanner");
    if (!el) return;
    el.textContent = msg; el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
  }

  /* ================= イベント結線（全Nullガード付き） ================= */
  function bindEvents() {
    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll(".nav-tab-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.querySelectorAll(".tab-view").forEach((v) => v.classList.remove("is-active"));
        if ($(`view-${tab}`)) $(`view-${tab}`).classList.add("is-active");
        if (tab === "binder") renderBinder();
        if (tab === "gallery") renderGalleryTab();
        if (tab === "decks") renderDecksTab();
        if (tab === "backup") refreshGeminiUiStatus();
      });
    });

    // Gemini API 設定
    on("toggleApiKeyVisBtn", "click", () => { const inp = $("geminiApiKeyInput"); if (inp) inp.type = inp.type === "password" ? "text" : "password"; });
    on("saveGeminiSettingsBtn", "click", () => {
      const key = $("geminiApiKeyInput") ? $("geminiApiKeyInput").value.trim() : "";
      const model = $("geminiModelSelect") ? $("geminiModelSelect").value : DEFAULT_GEMINI_MODEL;
      try {
        if (key) localStorage.setItem(GEMINI_KEY_STORAGE, key);
        else localStorage.removeItem(GEMINI_KEY_STORAGE);
        localStorage.setItem(GEMINI_MODEL_STORAGE, model);
      } catch (_) {}
      refreshGeminiUiStatus();
      showToast(key ? `Gemini AI (${model}) を有効にしました` : "オフライン解析モードに設定しました");
    });
    on("clearGeminiApiBtn", "click", () => {
      try { localStorage.removeItem(GEMINI_KEY_STORAGE); } catch (_) {}
      if ($("geminiApiKeyInput")) $("geminiApiKeyInput").value = "";
      if ($("geminiTestResultBox")) $("geminiTestResultBox").style.display = "none";
      refreshGeminiUiStatus();
      showToast("APIキーを解除しました");
    });
    on("testGeminiApiBtn", "click", async () => {
      const key = $("geminiApiKeyInput") ? $("geminiApiKeyInput").value.trim() : "";
      const model = $("geminiModelSelect") ? $("geminiModelSelect").value : DEFAULT_GEMINI_MODEL;
      const resBox = $("geminiTestResultBox");
      if (!resBox) return;
      if (!key) {
        resBox.style.display = "block"; resBox.style.background = "#fee2e2"; resBox.style.color = "#b91c1c";
        resBox.textContent = "APIキーを入力してからテストしてください。";
        return;
      }
      resBox.style.display = "block"; resBox.style.background = "#f1f5f9"; resBox.style.color = "#334155";
      resBox.textContent = `📡 ${model} へ接続テスト中...`;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "OKとだけ返してください" }] }] })
        });
        if (!r.ok) {
          const ej = await r.json().catch(() => ({}));
          throw new Error((ej.error && ej.error.message) || `HTTP ${r.status}`);
        }
        localStorage.setItem(GEMINI_KEY_STORAGE, key);
        localStorage.setItem(GEMINI_MODEL_STORAGE, model);
        refreshGeminiUiStatus();
        resBox.style.background = "#d1fae5"; resBox.style.color = "#065f46";
        resBox.textContent = `✅ 接続成功！${model} で画像全体スキャンが利用可能です。`;
      } catch (err) {
        resBox.style.background = "#fee2e2"; resBox.style.color = "#b91c1c";
        resBox.textContent = `❌ 接続失敗: ${err.message}`;
      }
    });
    on("viewerAiSettingsLink", "click", async () => {
      await persistCurrentViewerSlot(true);
      const tabBtn = document.querySelector('[data-tab="backup"]');
      if (tabBtn) tabBtn.click();
    });

    // 図鑑・検索・レギュ管理
    on("viewModeSwitch", "click", () => { state.viewMode = state.viewMode === "grid" ? "list" : "grid"; saveState(); renderTopStats(); renderBinder(); });
    on("wishFilterQuickBtn", "click", () => {
      if (filterState.statuses.has("WISH")) filterState.statuses.delete("WISH"); else filterState.statuses.add("WISH");
      renderTopStats(); renderBinder(); renderGalleryTab();
    });
    on("packSortSelect", "change", (e) => { state.packSort = e.target.value; saveState(); renderBinder(); });
    on("toggleAllPacksBtn", "click", () => {
      const nextCollapsed = state.packs.some((p) => !p.collapsed);
      state.packs.forEach((p) => { p.collapsed = nextCollapsed; });
      saveState(); renderTopStats(); renderBinder();
      showToast(nextCollapsed ? "すべてのパックを閉じました" : "すべてのパックを開きました");
    });

    on("openRegManagerBtn", "click", () => { renderRegManagerModal(); if ($("regManagerModal")) $("regManagerModal").classList.add("is-open"); });
    on("closeRegManagerBtn", "click", () => { if ($("regManagerModal")) $("regManagerModal").classList.remove("is-open"); });
    on("addNewRegBtn", "click", () => {
      const raw = $("newRegNameInput") ? $("newRegNameInput").value.trim().toUpperCase() : "";
      if (!raw) return showToast("レギュレーション記号を入力してください");
      if (state.regulations.includes(raw)) return showToast(`「${raw}」は既に登録されています`);
      state.regulations.unshift(raw);
      if ($("newRegNameInput")) $("newRegNameInput").value = "";
      saveState(); refreshRegulationSelectOptions(); rebuildPocketRegPills(); renderRegManagerModal(); renderAll();
      showToast(`レギュレーション「${raw}」を追加しました`);
    });

    refreshRegulationSelectOptions();
    initPocketSearchPills();

    const openSearchModal = () => {
      if ($("pocketSearchInput")) $("pocketSearchInput").value = filterState.query;
      syncPocketSearchSheetUI();
      if ($("pocketSearchOverlay")) $("pocketSearchOverlay").classList.add("is-open");
    };
    on("openSearchSheetBtn", "click", openSearchModal);
    on("openGallerySearchBtn", "click", openSearchModal);
    on("pocketSearchOkBtn", "click", () => {
      filterState.query = $("pocketSearchInput") ? $("pocketSearchInput").value.trim() : "";
      if ($("pocketSearchOverlay")) $("pocketSearchOverlay").classList.remove("is-open");
      renderTopStats(); renderBinder(); renderGalleryTab();
    });
    on("pocketSearchCloseBtn", "click", () => { if ($("pocketSearchOverlay")) $("pocketSearchOverlay").classList.remove("is-open"); });
    on("pocketSearchClearBtn", "click", () => {
      filterState = { query: "", types: new Set(), trainers: new Set(), regulations: new Set(), statuses: new Set() };
      if ($("pocketSearchInput")) $("pocketSearchInput").value = "";
      if ($("galleryQuickSearchInput")) $("galleryQuickSearchInput").value = "";
      syncPocketSearchSheetUI(); renderTopStats(); renderBinder(); renderGalleryTab();
    });

    on("galleryQuickSearchInput", "input", renderGalleryTab);
    on("galleryColsSelect", "change", renderGalleryTab);
    on("galleryPackFilter", "change", renderGalleryTab);
    on("galleryPhotoOnlyChk", "change", renderGalleryTab);

    // 詳細ビューア・2本指ピンチズーム＋1本指スワイプ
    const stage = $("viewerCardStage");
    if (stage) {
      let touchStartX = 0, touchDeltaX = 0, swiping = false;
      let vPinchStartDist = 0, vPinchStartScale = 1, vPanStartX = 0, vPanStartY = 0, vPanning = false, lastTapTime = 0;

      stage.addEventListener("touchstart", (e) => {
        if (isNavigatingViewer) return;
        if (e.touches.length === 2) {
          swiping = false; vPanning = false;
          vPinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          vPinchStartScale = viewerZoomScale;
        } else if (e.touches.length === 1) {
          const now = Date.now();
          if (now - lastTapTime < 260 && viewerZoomScale > 1.05) { resetViewerZoom(); lastTapTime = 0; return; }
          lastTapTime = now;
          if (viewerZoomScale > 1.05) {
            vPanning = true;
            vPanStartX = e.touches[0].clientX - viewerPanX;
            vPanStartY = e.touches[0].clientY - viewerPanY;
          } else {
            touchStartX = e.touches[0].clientX; touchDeltaX = 0; swiping = true;
            if ($("viewerCarouselTrack")) $("viewerCarouselTrack").style.transition = "none";
          }
        }
      }, { passive: true });

      stage.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && vPinchStartDist > 0) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          viewerZoomScale = Math.max(1, Math.min(4, vPinchStartScale * (dist / vPinchStartDist)));
          if (viewerZoomScale <= 1.02) { viewerPanX = 0; viewerPanY = 0; }
          applyViewerZoom();
        } else if (vPanning && e.touches.length === 1) {
          viewerPanX = e.touches[0].clientX - vPanStartX;
          viewerPanY = e.touches[0].clientY - vPanStartY;
          applyViewerZoom();
        } else if (swiping && e.touches.length === 1) {
          touchDeltaX = e.touches[0].clientX - touchStartX;
          if ($("viewerCarouselTrack")) $("viewerCarouselTrack").style.transform = `translate3d(calc(-33.333333% + ${touchDeltaX}px), 0, 0)`;
        }
      }, { passive: true });

      stage.addEventListener("touchend", () => {
        vPinchStartDist = 0; vPanning = false;
        if (!swiping) return; swiping = false;
        if (touchDeltaX < -50) slideViewerTo(1); else if (touchDeltaX > 50) slideViewerTo(-1); else resetCarouselTrack(true);
      });
    }
    on("viewerZoomResetBtn", "click", resetViewerZoom);

    // 下部スライドシートの上下ドラッグ＆左右スワイプ
    const dragHandle = $("sheetDragHandle"), scrollBody = $("sheetScrollBody");
    if (dragHandle && scrollBody) {
      let sheetStartY = 0, sheetStartX = 0, sheetStartProg = 0, isDraggingSheet = false, sheetMoved = false, sheetGestureAxis = null;
      const onSheetTouchStart = (cx, cy) => { sheetStartX = cx; sheetStartY = cy; sheetStartProg = sheetProgress; isDraggingSheet = true; sheetMoved = false; sheetGestureAxis = null; };
      const onSheetTouchMove = (cx, cy, e) => {
        if (!isDraggingSheet) return;
        const dx = cx - sheetStartX, dy = sheetStartY - cy;
        if (!sheetGestureAxis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) sheetGestureAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (sheetGestureAxis === "x") {
          sheetMoved = true;
          if ($("viewerCarouselTrack")) { $("viewerCarouselTrack").style.transition = "none"; $("viewerCarouselTrack").style.transform = `translate3d(calc(-33.333333% + ${dx}px), 0, 0)`; }
        } else if (sheetGestureAxis === "y") {
          sheetMoved = true; if (e && e.cancelable) e.preventDefault();
          setSheetProgress(sheetStartProg + (dy / Math.max(140, window.innerHeight * 0.42)), false);
        }
      };
      const onSheetTouchEnd = (cx) => {
        if (!isDraggingSheet) return; isDraggingSheet = false;
        if (sheetGestureAxis === "x") {
          const dx = (typeof cx === "number" ? cx : sheetStartX) - sheetStartX;
          if (dx < -55) slideViewerTo(1); else if (dx > 55) slideViewerTo(-1); else resetCarouselTrack(true);
        } else if (!sheetMoved) setSheetProgress(sheetProgress > 0.5 ? 0 : 1, true);
        else setSheetProgress(sheetProgress >= 0.35 ? 1 : 0, true);
      };
      dragHandle.addEventListener("touchstart", (e) => { if (e.touches.length === 1) onSheetTouchStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      dragHandle.addEventListener("touchmove", (e) => { if (isDraggingSheet && e.touches.length === 1) onSheetTouchMove(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
      dragHandle.addEventListener("touchend", (e) => onSheetTouchEnd(e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : sheetStartX));
      dragHandle.addEventListener("mousedown", (e) => {
        onSheetTouchStart(e.clientX, e.clientY);
        const mm = (ev) => onSheetTouchMove(ev.clientX, ev.clientY, null);
        const mu = (ev) => { onSheetTouchEnd(ev.clientX); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
        window.addEventListener("mousemove", mm); window.addEventListener("mouseup", mu);
      });

      let bodyTouchY = 0, bodyTouchX = 0, bodySwipingCard = false;
      scrollBody.addEventListener("touchstart", (e) => { if (e.touches.length === 1) { bodyTouchY = e.touches[0].clientY; bodyTouchX = e.touches[0].clientX; bodySwipingCard = false; } }, { passive: true });
      scrollBody.addEventListener("touchmove", (e) => {
        if (e.touches.length !== 1) return;
        const dy = bodyTouchY - e.touches[0].clientY, dx = e.touches[0].clientX - bodyTouchX;
        if (!bodySwipingCard && Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.4) bodySwipingCard = true;
        if (bodySwipingCard) {
          if ($("viewerCarouselTrack")) { $("viewerCarouselTrack").style.transition = "none"; $("viewerCarouselTrack").style.transform = `translate3d(calc(-33.333333% + ${dx}px), 0, 0)`; }
          return;
        }
        if (sheetProgress < 0.98 && dy > 6) setSheetProgress(1, true);
        else if (sheetProgress > 0.98 && scrollBody.scrollTop <= 0 && dy < -35) setSheetProgress(0, true);
      }, { passive: true });
      scrollBody.addEventListener("touchend", (e) => {
        if (!bodySwipingCard) return; bodySwipingCard = false;
        const dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : bodyTouchX) - bodyTouchX;
        if (dx < -60) slideViewerTo(1); else if (dx > 60) slideViewerTo(-1); else resetCarouselTrack(true);
      });
    }

    on("viewerPrevBtn", "click", () => slideViewerTo(-1));
    on("viewerNextBtn", "click", () => slideViewerTo(1));
    on("closeDetailViewerBtn", "click", () => persistCurrentViewerSlot(true));
    on("saveSlotBtn", "click", () => { persistCurrentViewerSlot(true); showToast("保存しました"); });

    on("viewerWishToggleBtn", "click", () => {
      if (!viewingTarget) return;
      const pack = state.packs.find((p) => p.id === viewingTarget.packId); if (!pack) return;
      const c = pack.cards[viewingTarget.slotNum] || { name: "", type: "草", rarity: "C", regulation: pack.defaultReg || "I", qty: 0, inUse: 0 };
      c.wished = !c.wished; pack.cards[viewingTarget.slotNum] = c; saveState();
      const wishBtn = $("viewerWishToggleBtn");
      if (wishBtn) { wishBtn.classList.toggle("is-wished", c.wished); wishBtn.textContent = c.wished ? "★ 欲しい登録済" : "☆ 欲しい"; }
      renderBinder();
    });

    on("qtyMinusBtn", "click", () => { const el = $("editQtyValue"); if (el) { el.textContent = Math.max(0, (Number(el.textContent) || 0) - 1); syncViewerSheetSummary(); } });
    on("qtyPlusBtn", "click", () => { const el = $("editQtyValue"); if (el) { el.textContent = (Number(el.textContent) || 0) + 1; syncViewerSheetSummary(); } });
    on("inUseMinusBtn", "click", () => { const el = $("editInUseValue"); if (el) { el.textContent = Math.max(0, (Number(el.textContent) || 0) - 1); syncViewerSheetSummary(); } });
    on("inUsePlusBtn", "click", () => { const el = $("editInUseValue"); if (el) { el.textContent = (Number(el.textContent) || 0) + 1; syncViewerSheetSummary(); } });
    on("editNameInput", "input", syncViewerSheetSummary);

    on("clearSlotBtn", "click", () => {
      askConfirm("このカードの登録内容と写真を削除して空枠に戻しますか？", async () => {
        if (!viewingTarget) return;
        const pack = state.packs.find((p) => p.id === viewingTarget.packId);
        if (pack) delete pack.cards[viewingTarget.slotNum];
        await deletePhotoFromDB(getPhotoKey(viewingTarget.packId, viewingTarget.slotNum));
        saveState(); if ($("detailViewerOverlay")) $("detailViewerOverlay").classList.remove("is-open");
        viewingTarget = null; renderAll(); showToast("空枠に戻しました");
      });
    });
    on("removePhotoBtn", "click", () => {
      askConfirm("登録されている写真を削除しますか？", () => {
        tempPhotoDataUrl = null; tempHasPhoto = false;
        if ($("removePhotoBtn")) $("removePhotoBtn").style.display = "none";
        if (viewingTarget && $("viewerSlideCurr")) {
          const pack = state.packs.find((p) => p.id === viewingTarget.packId);
          $("viewerSlideCurr").innerHTML = renderShowcaseCardHtml(pack, viewingTarget.slotNum);
        }
      });
    });

    // 撮影・選択・一括登録・AI入力・クロッパー
    on("takePhotoBtn", "click", () => { const i = $("cameraInput"); if (i) { i.value = ""; i.click(); } });
    on("pickPhotoBtn", "click", () => { const i = $("albumInput"); if (i) { i.value = ""; i.click(); } });
    on("viewerBatchPickBtn", "click", () => {
      if (!viewingTarget) return;
      const pid = viewingTarget.packId, snum = viewingTarget.slotNum;
      triggerBatchPicker(pid, snum);
      persistCurrentViewerSlot(false);
    });
    on("viewerAiReadBtn", "click", () => runAiAnalysisOnCanvasOrDataUrl(null, tempPhotoDataUrl));
    on("cameraInput", "change", (e) => { if (e.target.files && e.target.files[0]) openCropperWithFile(e.target.files[0]); });
    on("albumInput", "change", (e) => { if (e.target.files && e.target.files[0]) openCropperWithFile(e.target.files[0]); });

    const cStage = $("cropperStage");
    if (cStage) {
      cStage.addEventListener("pointerdown", (e) => { isDraggingCrop = true; dragStartX = e.clientX - cropOffsetX; dragStartY = e.clientY - cropOffsetY; cStage.setPointerCapture(e.pointerId); });
      cStage.addEventListener("pointermove", (e) => { if (!isDraggingCrop) return; cropOffsetX = e.clientX - dragStartX; cropOffsetY = e.clientY - dragStartY; drawCropper(); });
      cStage.addEventListener("pointerup", () => { isDraggingCrop = false; });
    }
    on("cropZoomRange", "input", (e) => { cropScale = Number(e.target.value) || 1; drawCropper(); });
    on("cropRotateBtn", "click", () => { cropRotation = (cropRotation + 90) % 360; drawCropper(); });
    on("closeCropperBtn", "click", () => { if ($("cropperModal")) $("cropperModal").classList.remove("is-open"); });
    on("confirmCropBtn", "click", async () => {
      const hiResCanvas = $("cropperCanvas");
      if (!hiResCanvas) return;
      tempPhotoDataUrl = downscaleCanvasToSaveUrl(hiResCanvas);
      tempHasPhoto = true;
      if ($("removePhotoBtn")) $("removePhotoBtn").style.display = "inline-flex";
      if ($("cropperModal")) $("cropperModal").classList.remove("is-open");
      if ($("viewerSlideCurr")) $("viewerSlideCurr").innerHTML = `<div class="viewer-showcase-card"><img src="${tempPhotoDataUrl}" /></div>`;
      await runAiAnalysisOnCanvasOrDataUrl(hiResCanvas, tempPhotoDataUrl);
    });

    // 一括登録モーダル操作
    on("batchAlbumInput", "change", (e) => handleBatchFilesSelected(e.target.files));
    on("batchAssignModeSelect", "change", renderBatchModalList);
    on("batchStartNumInput", "input", renderBatchModalList);
    on("batchDefaultQtySelect", "change", (e) => { const v = Number(e.target.value); batchItems.forEach((it) => { it.qty = isNaN(v) ? 1 : v; }); renderBatchModalList(); });
    on("batchReverseBtn", "click", () => { batchItems.reverse(); renderBatchModalList(); });
    on("closeBatchModalBtn", "click", () => { if ($("batchPhotoModal")) $("batchPhotoModal").classList.remove("is-open"); });

    on("saveBatchBtn", "click", async () => {
      const pack = state.packs.find((p) => p.id === batchPackId); if (!pack) return;
      const conflictMode = $("batchConflictModeSelect") ? $("batchConflictModeSelect").value : "add";
      const regTotal = pack.regularTotal || pack.total;
      let savedCount = 0;

      for (let i = 0; i < batchItems.length; i++) {
        const it = batchItems[i];
        const slot = resolveBatchItemTargetSlot(it, i);
        if (slot < 1 || slot > pack.total) continue;

        const existing = pack.cards[slot] || pack.cards[String(slot)] || null;
        const existingPhoto = photoCache.get(getPhotoKey(pack.id, slot)) || "";
        const hasExistingData = Boolean(existing && ((Number(existing.qty) || 0) > 0 || existingPhoto || (existing.name && existing.name.trim())));

        if (hasExistingData && conflictMode === "skip") continue;

        if (hasExistingData && conflictMode === "add") {
          const addQty = Number(it.qty) || 0;
          existing.qty = (Number(existing.qty) || 0) + addQty;
          if (!existing.name && it.name.trim()) existing.name = it.name.trim();
          if (!existingPhoto && it.dataUrl) {
            await savePhotoToDB(getPhotoKey(pack.id, slot), it.dataUrl);
            existing.hasPhoto = true;
          }
          pack.cards[slot] = existing;
        } else {
          await savePhotoToDB(getPhotoKey(pack.id, slot), it.dataUrl);
          pack.cards[slot] = {
            name: it.name.trim(), type: it.type || "草", rarity: it.rarity || "C",
            regulation: it.regulation || pack.defaultReg || "I", qty: it.qty,
            inUse: existing ? Number(existing.inUse) || 0 : 0,
            manualInUseOffset: existing ? Number(existing.manualInUseOffset) || 0 : 0,
            usedInDecks: existing ? existing.usedInDecks || [] : [],
            memo: existing ? existing.memo || "" : "",
            wished: existing ? Boolean(existing.wished) : false,
            hasPhoto: true,
            isSecret: SECRET_RARITIES.has(it.rarity) || slot > regTotal
          };
        }
        savedCount++;
      }

      saveState(); if ($("batchPhotoModal")) $("batchPhotoModal").classList.remove("is-open"); renderAll();
      showToast(`${savedCount}枚のカードを一括登録しました`);
    });

    // パック追加・編集
    on("openAddPackBtn", "click", () => openPackModal(null));
    on("closePackModalBtn", "click", () => { if ($("packModal")) $("packModal").classList.remove("is-open"); });
    on("savePackBtn", "click", () => {
      const name = $("packNameInput") ? $("packNameInput").value.trim() : "";
      if (!name) return showToast("パック名を入力してください");
      const code = $("packCodeInput") ? $("packCodeInput").value.trim().toUpperCase() : "";
      const releaseDate = $("packReleaseDateInput") ? $("packReleaseDateInput").value : todayIsoDate();
      const defaultReg = $("packDefaultRegSelect") ? $("packDefaultRegSelect").value : "I";
      const regularTotal = Math.max(1, Number($("packRegularTotalInput") ? $("packRegularTotalInput").value : 63) || 63);
      const total = Math.max(regularTotal, Number($("packTotalInput") ? $("packTotalInput").value : regularTotal) || regularTotal);

      if (editingPackId) {
        const p = state.packs.find((x) => x.id === editingPackId);
        if (p) { Object.assign(p, { name, code, releaseDate, defaultReg, regularTotal, total }); applyPackRegulationBulk(p.id, defaultReg); }
      } else {
        state.packs.unshift({ id: "pack_" + Date.now(), name, code, releaseDate, defaultReg, regularTotal, total, theme: "blue", collapsed: false, cards: {} });
      }
      saveState(); if ($("packModal")) $("packModal").classList.remove("is-open"); renderAll();
      showToast(`パックを保存し、レギュレーション「${defaultReg}」を一括適用しました`);
    });
    on("deletePackBtn", "click", () => {
      askConfirm("このパックと登録カードをすべて削除しますか？", () => {
        state.packs = state.packs.filter((p) => p.id !== editingPackId);
        saveState(); if ($("packModal")) $("packModal").classList.remove("is-open"); renderAll(); showToast("パックを削除しました");
      });
    });

    // デッキ管理・公式順整列・詳細シート・初手7枚テスト
    on("openNewDeckBtn", "click", () => openDeckModal(null));
    on("deckSortSelect", "change", (e) => { state.deckSort = e.target.value; saveState(); renderDecksTab(); });
    on("deckCheckBasisSelect", "change", renderDecksTab);
    on("closeDeckModalBtn", "click", () => { if ($("deckModal")) $("deckModal").classList.remove("is-open"); });
    on("closePocketDeckSheetBtn", "click", () => { if ($("pocketDeckSheet")) $("pocketDeckSheet").classList.remove("is-open"); activeDetailDeckId = null; });
    on("pdsEditDeckBtn", "click", () => {
      if (!activeDetailDeckId) return;
      const targetId = activeDetailDeckId;
      if ($("pocketDeckSheet")) $("pocketDeckSheet").classList.remove("is-open");
      openDeckModal(targetId);
    });
    on("pdsDrawTestBtn", "click", () => { if (activeDetailDeckId) startDrawTestForDeck(activeDetailDeckId); });
    on("closeDrawTestBtn", "click", () => { if ($("drawTestModal")) $("drawTestModal").classList.remove("is-open"); });
    on("redrawSevenBtn", "click", () => { if (activeDetailDeckId) startDrawTestForDeck(activeDetailDeckId); });
    on("drawExtraOneBtn", "click", () => {
      if (drawTestDrawnCount < drawTestDeckPool.length) { drawTestDrawnCount++; renderDrawTestHand(); }
      else showToast("山札のカードをすべて引き切りました");
    });

    on("deckAutoSortBtn", "click", () => {
      tempDeckCards.sort((a, b) => getDeckCategoryOrder(a) - getDeckCategoryOrder(b));
      renderDeckCardsEditor();
      showToast("ポケモン → グッズ → どうぐ → サポート → スタジアム → エネ順に整列しました");
    });

    on("startBinderPickBtn", "click", () => {
      if ($("deckModal")) $("deckModal").classList.remove("is-open");
      isPickingForDeck = true;
      if ($("deckPickTray")) $("deckPickTray").classList.add("is-open");
      if ($("appShell")) $("appShell").classList.add("has-deck-tray");
      const tabBtn = document.querySelector('[data-tab="binder"]');
      if (tabBtn) tabBtn.click();
      renderDeckPickTray(); renderBinder();
    });
    on("finishDeckPickBtn", "click", () => {
      isPickingForDeck = false;
      if ($("deckPickTray")) $("deckPickTray").classList.remove("is-open");
      if ($("appShell")) $("appShell").classList.remove("has-deck-tray");
      const tabBtn = document.querySelector('[data-tab="decks"]');
      if (tabBtn) tabBtn.click();
      renderDeckCardsEditor();
      if ($("deckModal")) $("deckModal").classList.add("is-open");
      renderBinder();
    });
    on("deckBulkAddBtn", "click", () => {
      parseRecipeAndLinkBinder($("deckBulkPasteInput") ? $("deckBulkPasteInput").value : "");
      if ($("deckBulkPasteInput")) $("deckBulkPasteInput").value = "";
      renderDeckCardsEditor();
    });
    on("deckAddManualRowBtn", "click", () => { tempDeckCards.push({ name: "", count: 1, packId: null, slotNum: null }); renderDeckCardsEditor(); });

    on("saveDeckBtn", "click", () => {
      const name = ($("deckNameInput") ? $("deckNameInput").value.trim() : "") || "無題のデッキ";
      const createdDate = ($("deckCreatedDateInput") ? $("deckCreatedDateInput").value : "") || todayIsoDate();
      const cleaned = tempDeckCards.filter((c) => String(c.name || "").trim() !== "").map((c) => {
        if (!c.packId) { const linked = findCardInBinder(c); if (linked) { c.packId = linked.packId; c.slotNum = linked.slotNum; } }
        return c;
      });
      if (editingDeckId) {
        const d = state.decks.find((x) => x.id === editingDeckId);
        if (d) { d.name = name; d.createdDate = createdDate; d.cards = cleaned; }
      } else state.decks.push({ id: "deck_" + Date.now(), name, createdDate, createdAt: Date.now(), cards: cleaned });
      syncAllDecksInUseCounts(); saveState();
      if ($("deckModal")) $("deckModal").classList.remove("is-open");
      renderAll();
      showToast("デッキを保存し、図鑑の使用中枚数を更新しました");
    });
    on("deleteDeckBtn", "click", () => {
      askConfirm("このデッキを削除してもよろしいですか？", () => {
        state.decks = state.decks.filter((d) => d.id !== editingDeckId);
        syncAllDecksInUseCounts(); saveState();
        if ($("deckModal")) $("deckModal").classList.remove("is-open");
        renderAll();
        showToast("デッキを削除し、使用中枚数を更新しました");
      });
    });

    // デッキ詳細・拡大ピンチズーム
    const dzStage = $("deckZoomStage");
    if (dzStage) {
      let dzStartX = 0, dzDeltaX = 0, dzSwiping = false, pinchStartDist = 0, pinchStartScale = 1;
      dzStage.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) {
          dzSwiping = false;
          pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          pinchStartScale = dzScale;
        } else if (e.touches.length === 1 && dzScale <= 1.05) {
          dzStartX = e.touches[0].clientX; dzDeltaX = 0; dzSwiping = true;
          if ($("deckZoomTrack")) $("deckZoomTrack").style.transition = "none";
        }
      }, { passive: true });
      dzStage.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && pinchStartDist > 0) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          dzScale = Math.max(1, Math.min(4, pinchStartScale * (dist / pinchStartDist)));
          applyDeckZoomTransform();
        } else if (dzSwiping && e.touches.length === 1) {
          dzDeltaX = e.touches[0].clientX - dzStartX;
          if ($("deckZoomTrack")) $("deckZoomTrack").style.transform = `translate3d(calc(-33.333333% + ${dzDeltaX}px), 0, 0)`;
        }
      }, { passive: true });
      dzStage.addEventListener("touchend", () => {
        pinchStartDist = 0; if (!dzSwiping) return; dzSwiping = false;
        const tr = $("deckZoomTrack");
        if (!tr) return;
        if (dzDeltaX < -55 && deckZoomIdx < deckZoomCards.length - 1) {
          tr.style.transition = "transform 0.2s ease"; tr.style.transform = "translate3d(-66.666666%, 0, 0)";
          setTimeout(() => openDeckZoomAt(deckZoomIdx + 1), 195);
        } else if (dzDeltaX > 55 && deckZoomIdx > 0) {
          tr.style.transition = "transform 0.2s ease"; tr.style.transform = "translate3d(0%, 0, 0)";
          setTimeout(() => openDeckZoomAt(deckZoomIdx - 1), 195);
        } else {
          tr.style.transition = "transform 0.2s ease"; tr.style.transform = "translate3d(-33.333333%, 0, 0)";
        }
      });
    }
    on("closeDeckZoomBtn", "click", () => { if ($("deckZoomOverlay")) $("deckZoomOverlay").classList.remove("is-open"); });
    on("resetDeckZoomBtn", "click", () => { dzScale = 1; dzPanX = 0; dzPanY = 0; applyDeckZoomTransform(); });

    // 軽量・完全バックアップ・復元
    on("exportLightJsonBtn", "click", () => {
      const blob = new Blob([JSON.stringify({ version: 20, light: true, state, photos: {} })], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pokeca_light_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
      a.click();
      recordBackupTimestamp();
      showToast("軽量バックアップ（枚数・デッキのみ）を書き出しました");
    });

    on("exportJsonBtn", "click", () => {
      const photos = {}; photoCache.forEach((v, k) => { photos[k] = v; });
      const blob = new Blob([JSON.stringify({ version: 20, state, photos })], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pokeca_full_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
      a.click();
      recordBackupTimestamp();
      showToast("完全バックアップ（写真込み）を書き出しました");
    });

    on("importJsonBtn", "click", () => { const i = $("jsonImportInput"); if (i) { i.value = ""; i.click(); } });
    on("jsonImportInput", "change", (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (d && d.state && Array.isArray(d.state.packs)) {
            state = d.state;
            if (!Array.isArray(state.regulations) || state.regulations.length === 0) state.regulations = [...DEFAULT_REGULATIONS];
            syncAllDecksInUseCounts(); refreshRegulationSelectOptions(); rebuildPocketRegPills(); saveState();
            if (d.photos && Object.keys(d.photos).length > 0) {
              for (const [k, v] of Object.entries(d.photos)) await savePhotoToDB(k, v);
            }
            renderAll();
            showToast(d.light ? "軽量バックアップから枚数・デッキを復元しました" : "バックアップから復元しました");
          }
        } catch (_) { showToast("読み込みに失敗しました"); }
      };
      r.readAsText(f);
    });

    on("resetAllBtn", "click", () => {
      askConfirm("すべての登録データとデッキを削除して初期状態に戻しますか？", () => {
        state = { viewMode: "grid", packSort: "manual", deckSort: "manual", regulations: [...DEFAULT_REGULATIONS], packs: createEmptyNinePacks(), decks: [] };
        refreshRegulationSelectOptions(); rebuildPocketRegPills(); saveState(); renderAll();
        showToast("初期状態に戻しました");
      });
    });

    on("confirmCancelBtn", "click", () => { if ($("confirmModal")) $("confirmModal").classList.remove("is-open"); confirmCallback = null; });
    on("confirmOkBtn", "click", () => {
      if ($("confirmModal")) $("confirmModal").classList.remove("is-open");
      if (confirmCallback) confirmCallback(); confirmCallback = null;
    });

    if (missingIds.length > 0) {
      showDiagError(`index.htmlに不足IDあり(${missingIds.length}件): ${missingIds.slice(0, 5).join(", ")}`);
    }
  }

  patchFileInputsForIOS();
  loadState();
  bindEvents();
  renderAll();
  updateHostBannerOffset();
  window.addEventListener("resize", updateHostBannerOffset);
  initDB().then(() => loadAllPhotosFromDB()).then(() => renderAll());
})();
