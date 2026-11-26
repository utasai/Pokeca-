(function () {
  "use strict";

  const STATE_KEY = "pokeca_binder_clean_v20";
  const BATTLE_DATA_KEY = "pokeca_battle_cards_v1";
  const GEMINI_KEY_STORAGE = "pokeca_gemini_api_key";
  const GEMINI_MODEL_STORAGE = "pokeca_gemini_model";
  const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
  const DB_NAME = "PokecaPhotoDB";
  const DB_STORE = "photos";

  const POKEMON_TYPES = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "ドラゴン", "無色"];
  const TYPE_INFO = {
    "草": { icon: "🌿", color: "#22c55e", bg: "#dcfce7" },
    "炎": { icon: "🔥", color: "#ef4444", bg: "#fee2e2" },
    "水": { icon: "💧", color: "#3b82f6", bg: "#dbeafe" },
    "雷": { icon: "⚡", color: "#eab308", bg: "#fef9c3" },
    "超": { icon: "🔮", color: "#a855f7", bg: "#f3e8ff" },
    "闘": { icon: "✊", color: "#d97706", bg: "#fef3c7" },
    "悪": { icon: "🌑", color: "#334155", bg: "#e2e8f0" },
    "鋼": { icon: "⚙️", color: "#64748b", bg: "#f1f5f9" },
    "ドラゴン": { icon: "🐉", color: "#ca8a04", bg: "#fef9c3" },
    "無色": { icon: "⭐", color: "#94a3b8", bg: "#f1f5f9" },
    "グッズ": { icon: "🎒", color: "#0ea5e9", bg: "#e0f2fe" },
    "ポケモンのどうぐ": { icon: "🛠️", color: "#8b5cf6", bg: "#ede9fe" },
    "サポート": { icon: "🧑", color: "#f97316", bg: "#ffedd5" },
    "スタジアム": { icon: "🏟️", color: "#10b981", bg: "#d1fae5" },
    "エネルギー": { icon: "🔋", color: "#14b8a6", bg: "#ccfbf1" }
  };

  const TRAINER_EFFECT_LABELS = {
    none: "汎用 / 手動処理",
    rare_candy: "ふしぎなアメ（たね→2進化へ直接進化）",
    arven: "ペパー（山札からグッズ1枚＋どうぐ1枚）",
    recover_discard: "夜のタンカ（トラッシュからポケモン/エネ1枚手札へ）",
    super_rod: "すごいつりざお（トラッシュから計3枚まで山札へ）",
    energy_switch: "エネルギーつけかえ（場のエネ1個を別ポケモンへ）",
    energy_retrieval: "エネルギー回収（トラッシュからエネ2枚手札へ）",
    pal_pad: "ともだちてちょう（トラッシュからサポ2枚山札へ）",
    draw7_discard: "博士の研究（手札すべてトラッシュし7枚引く）",
    iono: "ナンジャモ（お互い山札下に戻しサイド枚数引く）",
    draw3: "山札から3枚引く",
    search_basic: "ネストボール（山札からたね1枚ベンチへ）",
    search_poffin: "なかよしポフィン（HP70以下のたね2枚ベンチへ）",
    search_pokemon: "ハイパーボール（手札2枚トラッシュ→ポケモン1枚）",
    energy_search: "大地の器（手札1枚トラッシュ→エネ2枚手札へ）",
    boss: "ボスの指令（相手のベンチとバトル場を入替）",
    switch: "ポケモンいれかえ（自分のバトル場とベンチを入替）",
    heal30: "きずぐすり（自分のポケモンのHPを30回復）",
    tool_hp30: "どうぐ：つけたポケモンの最大HP+30",
    tool_dmg20: "どうぐ：つけたポケモンのワザのダメージ+20"
  };

  /* ================= 60枚サンプルAIデッキ（新特殊カード入り3種） ================= */
  const SAMPLE_DECKS = [
    {
      id: "sample_fire",
      name: "🔥 炎リザードンex（AIサンプル・60枚）",
      cards: [
        { name: "ヒトカゲ", count: 4, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 70, type: "炎", weakness: "水", retreat: 1, prizeCount: 1, attacks: [{ name: "ひのこ", cost: 1, damage: 30, effect: "" }] } },
        { name: "リザード", count: 2, spec: { category: "pokemon", stage: "1進化", evolvesFrom: "ヒトカゲ", hp: 100, type: "炎", weakness: "水", retreat: 2, prizeCount: 1, attacks: [{ name: "かえん", cost: 2, damage: 70, effect: "" }] } },
        { name: "リザードンex", count: 3, spec: { category: "pokemon", stage: "2進化", evolvesFrom: "リザード", hp: 330, type: "悪", weakness: "草", retreat: 2, prizeCount: 2, attacks: [{ name: "バーニングダーク", cost: 2, damage: 180, effect: "相手がすでに取ったサイドの枚数×30追加" }] } },
        { name: "ポッポ", count: 2, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 60, type: "無色", weakness: "雷", retreat: 1, prizeCount: 1, attacks: [{ name: "かぜおこし", cost: 1, damage: 20, effect: "" }] } },
        { name: "ピジョットex", count: 2, spec: { category: "pokemon", stage: "1進化", evolvesFrom: "ポッポ", hp: 280, type: "無色", weakness: "雷", retreat: 0, prizeCount: 2, attacks: [{ name: "ふきすさぶ", cost: 2, damage: 120, effect: "" }] } },
        { name: "エンテイV", count: 3, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 230, type: "炎", weakness: "水", retreat: 2, prizeCount: 2, attacks: [{ name: "バーニングロンド", cost: 2, damage: 100, effect: "" }] } },
        { name: "ネストボール", count: 3, spec: { category: "goods", trainerEffect: "search_basic", effectText: "山札からたねポケモンを1枚ベンチに出す。" } },
        { name: "ハイパーボール", count: 3, spec: { category: "goods", trainerEffect: "search_pokemon", effectText: "手札を2枚トラッシュし、山札からポケモンを1枚手札に加える。" } },
        { name: "なかよしポフィン", count: 3, spec: { category: "goods", trainerEffect: "search_poffin", effectText: "HP70以下のたねポケモンを2枚までベンチに出す。" } },
        { name: "ふしぎなアメ", count: 3, spec: { category: "goods", trainerEffect: "rare_candy", effectText: "場のたねポケモンを、手札の2進化ポケモンへ直接進化させる。" } },
        { name: "ポケモンいれかえ", count: 2, spec: { category: "goods", trainerEffect: "switch", effectText: "バトルポケモンとベンチポケモンを入れ替える。" } },
        { name: "大地の器", count: 2, spec: { category: "goods", trainerEffect: "energy_search", effectText: "手札を1枚トラッシュし、基本エネルギーを2枚まで手札に加える。" } },
        { name: "すごいつりざお", count: 1, spec: { category: "goods", trainerEffect: "super_rod", effectText: "トラッシュからポケモンと基本エネを計3枚まで山札に戻す。" } },
        { name: "夜のタンカ", count: 1, spec: { category: "goods", trainerEffect: "recover_discard", effectText: "トラッシュからポケモンか基本エネを1枚手札に加える。" } },
        { name: "エネルギーつけかえ", count: 1, spec: { category: "goods", trainerEffect: "energy_switch", effectText: "自分の場の基本エネ1個を別の自分のポケモンへ付け替える。" } },
        { name: "勇気のおまもり", count: 1, spec: { category: "tool", trainerEffect: "tool_hp30", effectText: "つけたポケモンの最大HPを+30する。" } },
        { name: "ペパー", count: 4, spec: { category: "support", trainerEffect: "arven", effectText: "山札からグッズ1枚とポケモンのどうぐ1枚を手札に加える。" } },
        { name: "博士の研究", count: 3, spec: { category: "support", trainerEffect: "draw7_discard", effectText: "手札をすべてトラッシュし、山札を7枚引く。" } },
        { name: "ナンジャモ", count: 3, spec: { category: "support", trainerEffect: "iono", effectText: "お互い手札を山札下に戻し、自分の残りサイド枚数ぶん引く。" } },
        { name: "ボスの指令", count: 2, spec: { category: "support", trainerEffect: "boss", effectText: "相手のベンチポケモンを1匹選び、バトルポケモンと入れ替える。" } },
        { name: "基本炎エネルギー", count: 12, spec: { category: "energy", type: "炎" } }
      ]
    },
    {
      id: "sample_psychic",
      name: "🔮 超サーナイトex（AIサンプル・60枚）",
      cards: [
        { name: "ラルトス", count: 4, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 70, type: "超", weakness: "悪", retreat: 1, prizeCount: 1, attacks: [{ name: "ねんりき", cost: 1, damage: 20, effect: "" }] } },
        { name: "キルリア", count: 3, spec: { category: "pokemon", stage: "1進化", evolvesFrom: "ラルトス", hp: 90, type: "超", weakness: "悪", retreat: 1, prizeCount: 1, attacks: [{ name: "マジカルショット", cost: 2, damage: 50, effect: "" }] } },
        { name: "サーナイトex", count: 3, spec: { category: "pokemon", stage: "2進化", evolvesFrom: "キルリア", hp: 310, type: "超", weakness: "悪", retreat: 2, prizeCount: 2, attacks: [{ name: "ミラクルフォース", cost: 3, damage: 190, effect: "" }] } },
        { name: "サケブシッポ", count: 3, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 90, type: "超", weakness: "悪", retreat: 1, prizeCount: 1, attacks: [{ name: "ほえさけぶ", cost: 2, damage: 80, effect: "" }] } },
        { name: "ミュウex", count: 3, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 180, type: "超", weakness: "悪", retreat: 0, prizeCount: 2, attacks: [{ name: "ゲノムハック", cost: 3, damage: 130, effect: "" }] } },
        { name: "ネストボール", count: 3, spec: { category: "goods", trainerEffect: "search_basic", effectText: "山札からたねポケモンを1枚ベンチに出す。" } },
        { name: "ハイパーボール", count: 3, spec: { category: "goods", trainerEffect: "search_pokemon", effectText: "手札を2枚トラッシュし、山札からポケモンを1枚手札に加える。" } },
        { name: "なかよしポフィン", count: 3, spec: { category: "goods", trainerEffect: "search_poffin", effectText: "HP70以下のたねポケモンを2枚までベンチに出す。" } },
        { name: "ふしぎなアメ", count: 2, spec: { category: "goods", trainerEffect: "rare_candy", effectText: "場のたねポケモンを、手札の2進化ポケモンへ直接進化させる。" } },
        { name: "ポケモンいれかえ", count: 2, spec: { category: "goods", trainerEffect: "switch", effectText: "バトルポケモンとベンチポケモンを入れ替える。" } },
        { name: "大地の器", count: 2, spec: { category: "goods", trainerEffect: "energy_search", effectText: "手札を1枚トラッシュし、基本エネルギーを2枚まで手札に加える。" } },
        { name: "夜のタンカ", count: 2, spec: { category: "goods", trainerEffect: "recover_discard", effectText: "トラッシュからポケモンか基本エネを1枚手札に加える。" } },
        { name: "すごいつりざお", count: 1, spec: { category: "goods", trainerEffect: "super_rod", effectText: "トラッシュからポケモンと基本エネを計3枚まで山札に戻す。" } },
        { name: "エネルギーつけかえ", count: 1, spec: { category: "goods", trainerEffect: "energy_switch", effectText: "場の基本エネ1個を別の自分のポケモンへ付け替える。" } },
        { name: "勇気のおまもり", count: 2, spec: { category: "tool", trainerEffect: "tool_hp30", effectText: "つけたポケモンの最大HPを+30する。" } },
        { name: "ペパー", count: 3, spec: { category: "support", trainerEffect: "arven", effectText: "山札からグッズ1枚とポケモンのどうぐ1枚を手札に加える。" } },
        { name: "博士の研究", count: 3, spec: { category: "support", trainerEffect: "draw7_discard", effectText: "手札をすべてトラッシュし、山札を7枚引く。" } },
        { name: "ナンジャモ", count: 3, spec: { category: "support", trainerEffect: "iono", effectText: "お互い手札を山札下に戻し、残りサイド枚数ぶん引く。" } },
        { name: "ボスの指令", count: 2, spec: { category: "support", trainerEffect: "boss", effectText: "相手のベンチとバトル場を入れ替える。" } },
        { name: "基本超エネルギー", count: 12, spec: { category: "energy", type: "超" } }
      ]
    },
    {
      id: "sample_electric",
      name: "⚡ 雷ミライドン速攻（AIサンプル・60枚）",
      cards: [
        { name: "ミライドンex", count: 3, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 220, type: "雷", weakness: "闘", retreat: 1, prizeCount: 2, attacks: [{ name: "フォトンブラスター", cost: 3, damage: 220, effect: "" }] } },
        { name: "ライコウV", count: 3, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 200, type: "雷", weakness: "闘", retreat: 1, prizeCount: 2, attacks: [{ name: "ライトニングロンド", cost: 2, damage: 110, effect: "" }] } },
        { name: "テツノカイナex", count: 2, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 230, type: "雷", weakness: "闘", retreat: 4, prizeCount: 2, attacks: [{ name: "アームプレス", cost: 3, damage: 160, effect: "" }] } },
        { name: "ピカチュウ", count: 4, spec: { category: "pokemon", stage: "たね", evolvesFrom: "", hp: 70, type: "雷", weakness: "闘", retreat: 1, prizeCount: 1, attacks: [{ name: "エレキボール", cost: 1, damage: 30, effect: "" }] } },
        { name: "ライチュウ", count: 3, spec: { category: "pokemon", stage: "1進化", evolvesFrom: "ピカチュウ", hp: 120, type: "雷", weakness: "闘", retreat: 1, prizeCount: 1, attacks: [{ name: "10まんボルト", cost: 2, damage: 120, effect: "" }] } },
        { name: "ネストボール", count: 4, spec: { category: "goods", trainerEffect: "search_basic", effectText: "山札からたねポケモンを1枚ベンチに出す。" } },
        { name: "ハイパーボール", count: 3, spec: { category: "goods", trainerEffect: "search_pokemon", effectText: "手札を2枚トラッシュし、ポケモンを1枚手札へ。" } },
        { name: "ポケモンいれかえ", count: 3, spec: { category: "goods", trainerEffect: "switch", effectText: "バトル場とベンチを入れ替える。" } },
        { name: "大地の器", count: 3, spec: { category: "goods", trainerEffect: "energy_search", effectText: "手札を1枚トラッシュし、基本エネを2枚手札へ。" } },
        { name: "エネルギーつけかえ", count: 3, spec: { category: "goods", trainerEffect: "energy_switch", effectText: "場の基本エネ1個を別の自分のポケモンへ付け替える。" } },
        { name: "夜のタンカ", count: 2, spec: { category: "goods", trainerEffect: "recover_discard", effectText: "トラッシュからポケモンか基本エネを1枚手札に加える。" } },
        { name: "すごいつりざお", count: 1, spec: { category: "goods", trainerEffect: "super_rod", effectText: "トラッシュから計3枚まで山札に戻す。" } },
        { name: "まけんきハチマキ", count: 2, spec: { category: "tool", trainerEffect: "tool_dmg20", effectText: "つけたポケモンのワザのダメージ+20。" } },
        { name: "ペパー", count: 3, spec: { category: "support", trainerEffect: "arven", effectText: "山札からグッズ1枚とポケモンのどうぐ1枚を手札に加える。" } },
        { name: "博士の研究", count: 3, spec: { category: "support", trainerEffect: "draw7_discard", effectText: "手札をすべてトラッシュし、7枚引く。" } },
        { name: "ナンジャモ", count: 3, spec: { category: "support", trainerEffect: "iono", effectText: "お互い手札を戻し、残りサイド枚数ぶん引く。" } },
        { name: "ボスの指令", count: 3, spec: { category: "support", trainerEffect: "boss", effectText: "相手のベンチとバトル場を入れ替える。" } },
        { name: "基本雷エネルギー", count: 12, spec: { category: "energy", type: "雷" } }
      ]
    }
  ];

  /* ================= 状態管理 ================= */
  let battleMetaMap = {};
  const photoMap = new Map();
  let G = null;
  let uidCounter = 1;
  let aiBusy = false;
  let aiSpeedMode = "superslow"; // "superslow" | "slow" | "normal"
  let matchSessionId = 0;
  let handZoomIdx = 0;
  let cutinSkipResolver = null;

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function norm(s) {
    return String(s || "").replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, "").toLowerCase();
  }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function pace(ms) {
    if (aiSpeedMode === "superslow") return Math.round(ms * 1.7);
    if (aiSpeedMode === "slow") return Math.round(ms * 1.25);
    return Math.round(ms * 0.7);
  }
  function isSessionAlive(sid) { return Boolean(G && sid === matchSessionId); }

  function loadAppState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { packs: [], decks: [] };
  }
  function loadBattleMeta() {
    try {
      const raw = localStorage.getItem(BATTLE_DATA_KEY);
      if (raw) battleMetaMap = JSON.parse(raw) || {};
    } catch (_) { battleMetaMap = {}; }
  }
  function saveBattleMeta() {
    try { localStorage.setItem(BATTLE_DATA_KEY, JSON.stringify(battleMetaMap)); } catch (_) {}
  }
  function loadPhotosFromDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve();
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE)) return resolve();
          const tx = db.transaction(DB_STORE, "readonly");
          const cur = tx.objectStore(DB_STORE).openCursor();
          cur.onsuccess = (ev) => {
            const c = ev.target.result;
            if (c) { photoMap.set(c.key, c.value); c.continue(); }
            else resolve();
          };
          cur.onerror = () => resolve();
        };
        req.onerror = () => resolve();
      } catch (_) { resolve(); }
    });
  }
  function getApiKey() { try { return (localStorage.getItem(GEMINI_KEY_STORAGE) || "").trim(); } catch (_) { return ""; } }
  function getApiModel() { try { return localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL; } catch (_) { return DEFAULT_GEMINI_MODEL; } }

  function toast(msg) {
    const el = document.getElementById("toastBanner");
    if (el) {
      el.textContent = msg;
      el.classList.add("is-show");
      clearTimeout(toast._t);
      toast._t = setTimeout(() => el.classList.remove("is-show"), 2600);
    }
  }

  /* ================= ポケポケ風 演出ユーティリティ ================= */
  async function playCoinFlipAnimation(firstIsPlayer, sid) {
    const ov = document.getElementById("btlCoinOverlay");
    const coin = document.getElementById("btlCoin3d");
    const title = document.getElementById("btlCoinTitle");
    const sub = document.getElementById("btlCoinSub");
    if (!ov || !coin) return;

    title.textContent = "先攻・後攻を決めています...";
    sub.textContent = "表ならあなたが先攻 ／ 裏ならAIが先攻";
    coin.className = "btl-coin-3d";
    ov.classList.add("is-open");

    await wait(140);
    if (!isSessionAlive(sid)) { ov.classList.remove("is-open"); return; }

    void coin.offsetWidth;
    coin.classList.add(firstIsPlayer ? "is-spin-heads" : "is-spin-tails");

    await wait(1650);
    if (!isSessionAlive(sid)) { ov.classList.remove("is-open"); return; }

    title.textContent = firstIsPlayer ? "✨ 表！あなたが先攻！" : "🤖 裏！AIが先攻！";
    sub.textContent = firstIsPlayer
      ? "手札からたねポケモンを選んでバトル開始（先攻1ターン目はサポート・ワザ不可）"
      : "手札からたねポケモンを選んでバトル開始（後攻は1ターン目からサポート・ワザ可）";

    await wait(1500);
    ov.classList.remove("is-open");
  }

  async function playTurnTransition(endingSideKey, nextSideKey, nextTurnNum, sid) {
    const ov = document.getElementById("btlTurnBannerOverlay");
    const band = document.getElementById("btlTurnBannerBand");
    const mainTxt = document.getElementById("btlTurnBannerMain");
    const subTxt = document.getElementById("btlTurnBannerSub");
    if (!ov || !band) return;

    if (endingSideKey) {
      band.className = "btl-turn-band is-end";
      mainTxt.textContent = "TURN END";
      subTxt.textContent = endingSideKey === "player" ? "あなたの番を終了" : "AIの番が終了";
      ov.classList.add("is-open");
      await wait(pace(700));
      if (!isSessionAlive(sid)) { ov.classList.remove("is-open"); return; }
      ov.classList.remove("is-open");
      await wait(200);
      if (!isSessionAlive(sid)) return;
    }

    const isPl = nextSideKey === "player";
    band.className = `btl-turn-band ${isPl ? "is-your-turn" : "is-ai-turn"}`;
    mainTxt.textContent = isPl ? "YOUR TURN" : "AI'S TURN";
    subTxt.textContent = `TURN ${nextTurnNum} — ${isPl ? "あなたの番" : "相手の番"}`;
    ov.classList.add("is-open");
    await wait(pace(980));
    ov.classList.remove("is-open");
    await wait(180);
  }

  async function showActionCutin({ badge, title, detail, card, accent = "ai", duration = 1400 }, sid) {
    const ov = document.getElementById("btlCutinOverlay");
    const box = document.getElementById("btlCutinCard");
    if (!ov || !box) return;

    const ti = card ? (TYPE_INFO[card.type] || TYPE_INFO[card.category === "energy" ? "エネルギー" : card.category === "support" ? "サポート" : card.category === "goods" ? "グッズ" : card.category === "tool" ? "ポケモンのどうぐ" : "無色"] || TYPE_INFO["無色"]) : TYPE_INFO["無色"];
    const visualHtml = card
      ? (card.photoUrl
          ? `<img src="${card.photoUrl}" class="btl-cutin-img" alt="${esc(card.name)}" />`
          : `<div class="btl-cutin-fb" style="background:${ti.bg};border-color:${ti.color};">
               <div style="font-size:10px;font-weight:900;color:#0f172a;">${esc(card.name)}</div>
               <div style="font-size:32px;margin:auto 0;">${ti.icon}</div>
               <div style="font-size:9px;font-weight:800;color:#475569;">${card.category === "pokemon" ? `HP ${card.hp}` : esc(card.category)}</div>
             </div>`)
      : "";

    box.className = `btl-cutin-box is-${accent}`;
    box.innerHTML = `
      <div class="btl-cutin-badge">${esc(badge)}</div>
      ${visualHtml ? `<div class="btl-cutin-visual">${visualHtml}</div>` : ""}
      <div class="btl-cutin-title">${esc(title)}</div>
      ${detail ? `<div class="btl-cutin-detail">${esc(detail)}</div>` : ""}
      <div class="btl-cutin-tap-hint">タップで次へ</div>
    `;
    ov.classList.add("is-open");

    // ゆっくり表示（読み終わったらタップで即送りも可）
    const totalMs = pace(duration);
    await new Promise((resolve) => {
      const t = setTimeout(() => { cutinSkipResolver = null; resolve(); }, totalMs);
      cutinSkipResolver = () => { clearTimeout(t); cutinSkipResolver = null; resolve(); };
    });

    ov.classList.remove("is-open");
    if (!isSessionAlive(sid)) return;
    await wait(pace(280));
  }

  function flashBoardTarget(selector, className = "is-fx-pulse", ms = 1100) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), ms);
  }

  async function playDamageHitEffect(defKey, dmg, weakText, sid) {
    const sel = defKey === "ai" ? "#btlAiActive" : "#btlPlActive";
    const holder = document.querySelector(sel);
    if (holder) {
      holder.classList.remove("is-fx-shake");
      void holder.offsetWidth;
      holder.classList.add("is-fx-shake");

      const pop = document.createElement("div");
      pop.className = "btl-dmg-popup";
      pop.innerHTML = `-${dmg}${weakText ? `<div class="btl-dmg-weak">弱点×2!</div>` : ""}`;
      holder.appendChild(pop);
      setTimeout(() => {
        holder.classList.remove("is-fx-shake");
        pop.remove();
      }, 1250);
    }
    await wait(pace(950));
    if (!isSessionAlive(sid)) return;
  }

  /* ================= カード解決＆スマート初期値推定 ================= */
  function findBinderCard(appState, dc) {
    if (dc.packId && dc.slotNum) {
      const p = (appState.packs || []).find((x) => String(x.id) === String(dc.packId));
      if (p) {
        const c = (p.cards && (p.cards[dc.slotNum] || p.cards[String(dc.slotNum)])) || {};
        return { packId: p.id, slotNum: Number(dc.slotNum), name: c.name || dc.name, type: c.type || "無色", rarity: c.rarity || "C", photoKey: `${p.id}__${Number(dc.slotNum)}` };
      }
    }
    const target = norm(dc.name);
    for (const p of (appState.packs || [])) {
      for (const [sStr, c] of Object.entries(p.cards || {})) {
        if (c && c.name && norm(c.name) === target) {
          return { packId: p.id, slotNum: Number(sStr), name: c.name, type: c.type || "無色", rarity: c.rarity || "C", photoKey: `${p.id}__${Number(sStr)}` };
        }
      }
    }
    return { packId: null, slotNum: null, name: dc.name, type: /エネルギー/.test(dc.name || "") ? "エネルギー" : "無色", rarity: "C", photoKey: null };
  }

  function guessTrainerEffect(name, category) {
    const n = norm(name);
    if (category === "tool") {
      if (n.includes("おまもり") || n.includes("マント")) return "tool_hp30";
      if (n.includes("ベルト") || n.includes("ハチマキ") || n.includes("バンド")) return "tool_dmg20";
      return "tool_hp30";
    }
    if (n.includes("ふしぎなアメ")) return "rare_candy";
    if (n.includes("ペパー")) return "arven";
    if (n.includes("夜のタンカ") || n.includes("タンカ")) return "recover_discard";
    if (n.includes("すごいつりざお") || n.includes("つりざお")) return "super_rod";
    if (n.includes("エネルギーつけかえ") || n.includes("つけかえ")) return "energy_switch";
    if (n.includes("エネルギー回収")) return "energy_retrieval";
    if (n.includes("ともだちてちょう")) return "pal_pad";
    if (n.includes("博士の研究")) return "draw7_discard";
    if (n.includes("ナンジャモ")) return "iono";
    if (n.includes("ネストボール")) return "search_basic";
    if (n.includes("ポフィン")) return "search_poffin";
    if (n.includes("ハイパーボール") || n.includes("スーパーボール") || n.includes("キャプチャー")) return "search_pokemon";
    if (n.includes("大地の器") || n.includes("エネルギー転送") || n.includes("アカマツ")) return "energy_search";
    if (n.includes("ボスの指令") || n.includes("カウンターキャッチャー")) return "boss";
    if (n.includes("いれかえ") || n.includes("プライムキャッチャー")) return "switch";
    if (n.includes("きずぐすり") || n.includes("ピクニック")) return "heal30";
    if (n.includes("リーリエ") || n.includes("ネモ") || n.includes("ジャッジマン") || n.includes("アクロマ") || n.includes("ゼイユ")) return "draw3";
    return "none";
  }

  function getDefaultSpec(name, rawType) {
    const n = String(name || "");
    const t = rawType || "無色";
    if (t === "エネルギー" || /エネルギー/.test(n)) {
      let eType = "無色";
      for (const pt of POKEMON_TYPES) { if (n.includes(pt)) { eType = pt; break; } }
      return { category: "energy", type: eType, aiScanned: false };
    }
    if (t === "グッズ") return { category: "goods", type: "グッズ", trainerEffect: guessTrainerEffect(n, "goods"), effectText: "", aiScanned: false };
    if (t === "ポケモンのどうぐ") return { category: "tool", type: "ポケモンのどうぐ", trainerEffect: guessTrainerEffect(n, "tool"), effectText: "", aiScanned: false };
    if (t === "サポート") return { category: "support", type: "サポート", trainerEffect: guessTrainerEffect(n, "support"), effectText: "", aiScanned: false };
    if (t === "スタジアム") return { category: "stadium", type: "スタジアム", trainerEffect: "none", effectText: "", aiScanned: false };

    const isMega = /メガ/.test(n) && /ex/i.test(n);
    const isEx = /ex|vstar|vmax|v$/i.test(n);
    const hp = isMega ? 320 : (isEx ? 220 : 80);
    const prizeCount = isMega ? 3 : (isEx ? 2 : 1);
    const dmg = isMega ? 210 : (isEx ? 140 : 40);
    const cost = isMega ? 3 : (isEx ? 2 : 1);
    return {
      category: "pokemon",
      stage: "たね",
      evolvesFrom: "",
      hp,
      type: POKEMON_TYPES.includes(t) ? t : "無色",
      weakness: "",
      retreat: isEx ? 2 : 1,
      prizeCount,
      attacks: [{ name: "たいあたり", cost, damage: dmg, effect: "" }],
      effectText: "",
      aiScanned: false
    };
  }

  function getCardSpec(binderCard) {
    const keySlot = binderCard.photoKey;
    const keyName = `name__${norm(binderCard.name)}`;
    let spec = null;
    if (keySlot && battleMetaMap[keySlot]) spec = { ...battleMetaMap[keySlot] };
    else if (battleMetaMap[keyName]) spec = { ...battleMetaMap[keyName] };
    else spec = getDefaultSpec(binderCard.name, binderCard.type);

    // 既存データで trainerEffect が "none" のままの定番カードは名前から自動補完
    if (["goods", "support", "tool"].includes(spec.category) && (!spec.trainerEffect || spec.trainerEffect === "none")) {
      const guessed = guessTrainerEffect(binderCard.name, spec.category);
      if (guessed !== "none") spec.trainerEffect = guessed;
    }
    return spec;
  }

  function setCardSpec(binderCard, spec) {
    const clean = { ...spec };
    if (binderCard.photoKey) battleMetaMap[binderCard.photoKey] = clean;
    if (binderCard.name) battleMetaMap[`name__${norm(binderCard.name)}`] = clean;
    saveBattleMeta();
  }

  /* ================= Gemini AI 対戦データ読取 ================= */
  async function scanBattleDataWithGemini(dataUrl, fallbackName, fallbackType) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Gemini APIキーが設定されていません");
    const base64 = String(dataUrl || "").split(",")[1];
    if (!base64) throw new Error("写真データがありません");

    const model = getApiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = `日本語版ポケモンカードの画像から対戦用データを精細に読み取り、以下のJSON形式のみを出力してください（余計な文章やMarkdown不要）。

{
  "category": "pokemon | goods | tool | support | stadium | energy のいずれか1つ",
  "stage": "ポケモンの場合: たね | 1進化 | 2進化（ポケモン以外は空文字）",
  "evolvesFrom": "進化ポケモンの場合、左上に書かれた進化元のポケモン名（例：キルリア）。たね・ポケモン以外は空文字",
  "hp": 220,
  "type": "草 | 炎 | 水 | 雷 | 超 | 闘 | 悪 | 鋼 | ドラゴン | 無色 のいずれか（エネルギーの場合はそのタイプ、トレーナーズは空文字）",
  "weakness": "左下の弱点タイプ（草/炎/水/雷/超/闘/悪/鋼/ドラゴン/無色、なければ空文字）",
  "retreat": 1,
  "prizeCount": 1,
  "attacks": [
    { "name": "ワザ名", "cost": 2, "damage": 120, "effect": "短い効果説明" }
  ],
  "trainerEffect": "トレーナーズの場合、次から最も近いものを選択: none, rare_candy, arven, recover_discard, super_rod, energy_switch, energy_retrieval, pal_pad, draw7_discard, iono, draw3, search_basic, search_poffin, search_pokemon, energy_search, boss, switch, heal30, tool_hp30, tool_dmg20",
  "effectText": "トレーナーズや特性の要約（45文字以内）"
}
※ prizeCount は通常ポケモン=1、ex/V=2、メガ進化ex/VMAX=3。
※ attacks の cost は必要なエネルギーの合計個数（整数）、damage は数値部分のみ（整数、ダメージなしは0）。`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64 } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });
    if (!res.ok) {
      const ej = await res.json().catch(() => ({}));
      throw new Error((ej.error && ej.error.message) || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const parsed = JSON.parse(txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim());

    const def = getDefaultSpec(fallbackName, fallbackType);
    const cat = ["pokemon", "goods", "tool", "support", "stadium", "energy"].includes(parsed.category) ? parsed.category : def.category;
    const attacks = Array.isArray(parsed.attacks) && parsed.attacks.length > 0
      ? parsed.attacks.slice(0, 3).map((a) => ({
          name: String(a.name || "ワザ").trim(),
          cost: Math.max(0, Math.min(6, Number(a.cost) || 0)),
          damage: Math.max(0, Number(a.damage) || 0),
          effect: String(a.effect || "").trim()
        }))
      : (def.attacks || []);

    const guessedEff = guessTrainerEffect(fallbackName, cat);
    const parsedEff = TRAINER_EFFECT_LABELS[parsed.trainerEffect] ? parsed.trainerEffect : "none";

    return {
      category: cat,
      stage: ["たね", "1進化", "2進化"].includes(parsed.stage) ? parsed.stage : "たね",
      evolvesFrom: String(parsed.evolvesFrom || "").trim(),
      hp: Math.max(30, Number(parsed.hp) || def.hp || 80),
      type: POKEMON_TYPES.includes(parsed.type) ? parsed.type : def.type,
      weakness: POKEMON_TYPES.includes(parsed.weakness) ? parsed.weakness : "",
      retreat: Math.max(0, Math.min(5, Number(parsed.retreat) || 0)),
      prizeCount: [1, 2, 3].includes(Number(parsed.prizeCount)) ? Number(parsed.prizeCount) : (def.prizeCount || 1),
      attacks,
      trainerEffect: parsedEff !== "none" ? parsedEff : guessedEff,
      effectText: String(parsed.effectText || "").trim(),
      aiScanned: true
    };
  }

  /* ================= デッキ構築ヘルパー ================= */
  function getAllDeckChoices() {
    const appState = loadAppState();
    const userDecks = (appState.decks || []).map((d) => ({ id: `user:${d.id}`, label: `🃏 ${d.name}（マイデッキ）`, isUser: true, raw: d }));
    const samples = SAMPLE_DECKS.map((s) => ({ id: `sample:${s.id}`, label: s.name, isUser: false, raw: s }));
    return [...userDecks, ...samples];
  }

  function buildRuntimeDeck(choiceId) {
    const appState = loadAppState();
    const list = [];
    if (choiceId.startsWith("sample:")) {
      const sid = choiceId.slice(7);
      const sd = SAMPLE_DECKS.find((x) => x.id === sid) || SAMPLE_DECKS[0];
      sd.cards.forEach((c) => {
        for (let i = 0; i < c.count; i++) {
          list.push({
            uid: `c_${uidCounter++}`,
            name: c.name,
            photoUrl: "",
            ...JSON.parse(JSON.stringify(c.spec))
          });
        }
      });
      return { deckName: sd.name, cards: list };
    }
    const did = choiceId.slice(5);
    const ud = (appState.decks || []).find((x) => x.id === did);
    if (!ud) return null;
    (ud.cards || []).forEach((dc) => {
      const bInfo = findBinderCard(appState, dc);
      const spec = getCardSpec(bInfo);
      const photoUrl = bInfo.photoKey ? (photoMap.get(bInfo.photoKey) || "") : "";
      const cnt = Math.max(0, Number(dc.count) || 0);
      for (let i = 0; i < cnt; i++) {
        list.push({
          uid: `c_${uidCounter++}`,
          name: bInfo.name || dc.name,
          photoUrl,
          ...JSON.parse(JSON.stringify(spec))
        });
      }
    });
    return { deckName: ud.name, cards: list };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ================= 対戦エンジン（本家60枚・サイド6枚） ================= */
  function createPokemonSlot(card, turnNum) {
    return {
      card,
      damage: 0,
      energies: [],
      tool: null,
      stack: [card],
      playedTurn: turnNum
    };
  }

  function getMaxHp(slot) {
    if (!slot || !slot.card) return 0;
    const base = Number(slot.card.hp) || 80;
    const bonus = (slot.tool && slot.tool.trainerEffect === "tool_hp30") ? 30 : 0;
    return base + bonus;
  }

  function canEvolveOnto(evoCard, targetSlot, currentTurn) {
    if (!evoCard || evoCard.category !== "pokemon" || !targetSlot) return false;
    if (currentTurn <= 2) return false;
    if (targetSlot.playedTurn >= currentTurn) return false;
    const targetStage = targetSlot.card.stage || "たね";
    const evoStage = evoCard.stage || "たね";
    if (evoStage === "たね") return false;

    const from = norm(evoCard.evolvesFrom || "");
    const tName = norm(targetSlot.card.name || "");
    if (from) {
      return tName === from || tName.includes(from) || from.includes(tName);
    }
    if (evoStage === "1進化" && targetStage === "たね") return true;
    if (evoStage === "2進化" && targetStage === "1進化") return true;
    return false;
  }

  function canRareCandyEvolve(stage2Card, basicSlot, currentTurn) {
    if (!stage2Card || stage2Card.category !== "pokemon" || stage2Card.stage !== "2進化") return false;
    if (!basicSlot || (basicSlot.card.stage || "たね") !== "たね") return false;
    if (currentTurn <= 2 || basicSlot.playedTurn >= currentTurn) return false;
    return true;
  }

  // AI用：ふしぎなアメで適切な進化先ペアか判定（同タイプ・有名ライン優先）
  function isLikelyRareCandyPair(basicCard, stage2Card, side) {
    const bName = norm(basicCard.name), s2Name = norm(stage2Card.name);
    if (bName.includes("ヒトカゲ") && s2Name.includes("リザードン")) return true;
    if (bName.includes("ラルトス") && s2Name.includes("サーナイト")) return true;
    if (bName.includes("ドラメシヤ") && s2Name.includes("ドラパルト")) return true;
    if (bName.includes("セビエ") && s2Name.includes("セグレイブ")) return true;
    if (bName.includes("ポッポ") && s2Name.includes("ピジョット")) return true;
    // デッキ・トラッシュ・手札にある1進化を経由して繋がるか確認
    const s2From = norm(stage2Card.evolvesFrom || "");
    if (s2From && side) {
      const pool = [...side.deck, ...side.hand, ...side.discard];
      const mid = pool.find((c) => c.category === "pokemon" && norm(c.name) === s2From);
      if (mid && mid.evolvesFrom && norm(mid.evolvesFrom) === bName) return true;
    }
    return basicCard.type === stage2Card.type;
  }

  function drawCards(side, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (side.deck.length === 0) break;
      const c = side.deck.shift();
      side.hand.push(c);
      drawn.push(c);
    }
    return drawn;
  }

  function dealOpeningHandWithMulligan(side) {
    let mulligans = 0;
    while (mulligans < 20) {
      side.deck.push(...side.hand);
      side.hand = [];
      shuffle(side.deck);
      drawCards(side, 7);
      const hasBasic = side.hand.some((c) => c.category === "pokemon" && (c.stage || "たね") === "たね");
      if (hasBasic) break;
      mulligans++;
    }
    return mulligans;
  }

  function addLog(msg, kind = "normal") {
    if (!G) return;
    G.logs.unshift({ msg, kind, turn: G.turn });
    if (G.logs.length > 60) G.logs.pop();
  }

  async function startMatch(playerChoiceId, aiChoiceId) {
    const pBuilt = buildRuntimeDeck(playerChoiceId);
    const aBuilt = buildRuntimeDeck(aiChoiceId);
    if (!pBuilt || pBuilt.cards.length < 7) return toast("自分のデッキにカードが足りません（最低7枚以上）");
    if (!aBuilt || aBuilt.cards.length < 7) return toast("AIデッキの読み込みに失敗しました");

    const pHasBasic = pBuilt.cards.some((c) => c.category === "pokemon" && (c.stage || "たね") === "たね");
    const aHasBasic = aBuilt.cards.some((c) => c.category === "pokemon" && (c.stage || "たね") === "たね");
    if (!pHasBasic) return toast("自分のデッキに「たねポケモン」が1枚もありません。ワザ・HP編集で確認してください。");
    if (!aHasBasic) return toast("AIデッキに「たねポケモン」が1枚もありません。");

    matchSessionId++;
    const sid = matchSessionId;
    const firstIsPlayer = Math.random() < 0.5;

    G = {
      phase: "setup",
      winner: null,
      winReason: "",
      turn: 1,
      activeSide: firstIsPlayer ? "player" : "ai",
      firstSide: firstIsPlayer ? "player" : "ai",
      stadium: null,
      logs: [],
      selectedHandUid: null,
      energyAttachedThisTurn: false,
      supporterUsedThisTurn: false,
      retreatedThisTurn: false,
      player: { name: "あなた", deckName: pBuilt.deckName, deck: shuffle([...pBuilt.cards]), hand: [], active: null, bench: [], prizes: [], discard: [] },
      ai: { name: "AI", deckName: aBuilt.deckName, deck: shuffle([...aBuilt.cards]), hand: [], active: null, bench: [], prizes: [], discard: [] }
    };

    const pMul = dealOpeningHandWithMulligan(G.player);
    const aMul = dealOpeningHandWithMulligan(G.ai);

    const aiBasics = G.ai.hand.filter((c) => c.category === "pokemon" && (c.stage || "たね") === "たね")
      .sort((a, b) => (Number(b.hp) || 0) - (Number(a.hp) || 0));
    const aiFirst = aiBasics[0];
    G.ai.hand = G.ai.hand.filter((c) => c.uid !== aiFirst.uid);
    G.ai.active = createPokemonSlot(aiFirst, 0);
    aiBasics.slice(1, 5).forEach((b) => {
      G.ai.hand = G.ai.hand.filter((c) => c.uid !== b.uid);
      G.ai.bench.push(createPokemonSlot(b, 0));
    });

    if (pMul > 0) { drawCards(G.ai, Math.min(pMul, 3)); addLog(`あなたのマリガン(${pMul}回)によりAIが追加ドロー`, "info"); }
    if (aMul > 0) { drawCards(G.player, Math.min(aMul, 3)); addLog(`AIのマリガン(${aMul}回)によりあなたが${Math.min(aMul, 3)}枚追加ドロー！`, "info"); }

    addLog(`コイントス結果：${firstIsPlayer ? "表！あなたが先攻" : "裏！AIが先攻"}！`, "important");
    addLog("初期配置：手札をタップして拡大確認し、たねポケモンを並べてください。", "info");

    closeLobbyModal();
    document.getElementById("btlArenaOverlay").classList.add("is-open");
    aiBusy = true;
    renderBattleArena();

    await playCoinFlipAnimation(firstIsPlayer, sid);
    if (!isSessionAlive(sid)) return;
    aiBusy = false;
    renderBattleArena();
  }

  async function finishSetupAndBegin() {
    if (!G || G.phase !== "setup" || aiBusy) return;
    if (!G.player.active) return toast("バトル場にたねポケモンを1匹選んでください");

    const sid = matchSessionId;
    const pPrizeCnt = G.player.deck.length >= 10 ? 6 : Math.max(1, Math.floor(G.player.deck.length / 2));
    const aPrizeCnt = G.ai.deck.length >= 10 ? 6 : Math.max(1, Math.floor(G.ai.deck.length / 2));
    for (let i = 0; i < pPrizeCnt && G.player.deck.length > 0; i++) G.player.prizes.push(G.player.deck.shift());
    for (let i = 0; i < aPrizeCnt && G.ai.deck.length > 0; i++) G.ai.prizes.push(G.ai.deck.shift());

    G.phase = "play";
    addLog(`サイドセット完了（あなた${G.player.prizes.length}枚 / AI${G.ai.prizes.length}枚）。バトル開始！`, "important");
    await beginTurn(G.activeSide, null, sid);
  }

  async function beginTurn(sideKey, endingSideKey, sid) {
    if (!isSessionAlive(sid) || G.phase === "over") return;
    aiBusy = true;
    G.activeSide = sideKey;
    G.energyAttachedThisTurn = false;
    G.supporterUsedThisTurn = false;
    G.retreatedThisTurn = false;
    G.selectedHandUid = null;
    closeHandZoom();
    renderBattleArena();

    await playTurnTransition(endingSideKey, sideKey, G.turn, sid);
    if (!isSessionAlive(sid) || G.phase === "over") return;

    const side = G[sideKey];
    if (side.deck.length === 0) {
      aiBusy = false;
      endMatch(sideKey === "player" ? "ai" : "player", `${side.name}の山札が0枚で引けなくなった！`);
      return;
    }
    const [drawn] = drawCards(side, 1);
    addLog(`━━ ターン${G.turn}：${side.name}の番（1枚ドロー${sideKey === "player" && drawn ? `：${drawn.name}` : ""}）`, "turn");
    renderBattleArena();

    if (sideKey === "ai") {
      aiBusy = false;
      runAiTurn(sid);
    } else {
      aiBusy = false;
      renderBattleArena();
    }
  }

  async function endTurn() {
    if (!G || G.phase !== "play") return;
    const sid = matchSessionId;
    const prevSide = G.activeSide;
    G.turn += 1;
    await beginTurn(prevSide === "player" ? "ai" : "player", prevSide, sid);
  }

  function endMatch(winnerSide, reason) {
    if (!G) return;
    G.phase = "over";
    G.winner = winnerSide;
    G.winReason = reason;
    aiBusy = false;
    closeHandZoom();
    addLog(`🏆 決着！${winnerSide === "player" ? "あなたの勝利！" : "AIの勝利…"}（${reason}）`, "win");
    renderBattleArena();
  }

  async function performAttack(attackerKey, attackIdx) {
    if (!G || G.phase !== "play") return;
    const sid = matchSessionId;
    if (G.turn === 1 && attackerKey === G.firstSide) {
      if (attackerKey === "player") toast("先攻1ターン目はワザを使えません");
      return;
    }
    const atkSide = G[attackerKey];
    const defKey = attackerKey === "player" ? "ai" : "player";
    const defSide = G[defKey];
    if (!atkSide.active || !defSide.active) return;

    const atk = (atkSide.active.card.attacks || [])[attackIdx];
    if (!atk) return;
    if (atkSide.active.energies.length < atk.cost) {
      if (attackerKey === "player") toast(`エネルギーが足りません（必要 ${atk.cost}個）`);
      return;
    }

    aiBusy = true;
    closeHandZoom();
    renderBattleArena();

    let dmg = Number(atk.damage) || 0;
    if (atk.name === "バーニングダーク") {
      const oppTaken = Math.max(0, 6 - defSide.prizes.length);
      dmg += oppTaken * 30;
    }
    if (atkSide.active.tool && atkSide.active.tool.trainerEffect === "tool_dmg20" && dmg > 0) dmg += 20;

    let weakText = "";
    if (dmg > 0 && defSide.active.card.weakness && atkSide.active.card.type === defSide.active.card.weakness) {
      dmg *= 2;
      weakText = "【弱点×2！】";
    }

    await showActionCutin({
      badge: attackerKey === "player" ? "⚔️ あなたのワザ" : "💥 AIのワザ",
      title: `${atkSide.active.card.name} の「${atk.name}」！`,
      detail: dmg > 0 ? `${dmg} ダメージ！${weakText}` : (atk.effect || "ワザを発動！"),
      card: atkSide.active.card,
      accent: "attack",
      duration: 1300
    }, sid);
    if (!isSessionAlive(sid)) return;

    defSide.active.damage += dmg;
    addLog(`💥 ${atkSide.name}の${atkSide.active.card.name}の「${atk.name}」！ ${dmg}ダメージ${weakText}`, "attack");
    renderBattleArena();

    if (dmg > 0) {
      await playDamageHitEffect(defKey, dmg, weakText, sid);
      if (!isSessionAlive(sid)) return;
    }

    const maxHp = getMaxHp(defSide.active);
    if (defSide.active.damage >= maxHp) {
      const koSlot = defSide.active;
      const prizeTake = Number(koSlot.card.prizeCount) || 1;
      defSide.discard.push(...koSlot.stack, ...koSlot.energies);
      if (koSlot.tool) defSide.discard.push(koSlot.tool);
      defSide.active = null;

      const taken = [];
      for (let i = 0; i < prizeTake && atkSide.prizes.length > 0; i++) {
        const pr = atkSide.prizes.shift();
        atkSide.hand.push(pr);
        taken.push(pr);
      }
      addLog(`💀 ${defSide.name}の${koSlot.card.name}がきぜつ！ ${atkSide.name}はサイドを${taken.length}枚取った！（残り${atkSide.prizes.length}枚）`, "ko");
      renderBattleArena();

      await showActionCutin({
        badge: "💀 きぜつ！",
        title: `${koSlot.card.name} がきぜつ！`,
        detail: `${atkSide.name}がサイドを${taken.length}枚取った（残り${atkSide.prizes.length}枚）`,
        card: koSlot.card,
        accent: "ko",
        duration: 1450
      }, sid);
      if (!isSessionAlive(sid)) return;

      if (atkSide.prizes.length === 0) {
        endMatch(attackerKey, `${atkSide.name}がサイドをすべて取り切った！`);
        return;
      }
      if (defSide.bench.length === 0) {
        endMatch(attackerKey, `${defSide.name}の場にポケモンがいなくなった！`);
        return;
      }

      if (defKey === "ai") {
        defSide.bench.sort((a, b) => (b.energies.length * 100 + (getMaxHp(b) - b.damage)) - (a.energies.length * 100 + (getMaxHp(a) - a.damage)));
        defSide.active = defSide.bench.shift();
        addLog(`AIはベンチから${defSide.active.card.name}をバトル場に出した。`, "info");
        renderBattleArena();
        await showActionCutin({
          badge: "🤖 AIの交代",
          title: `${defSide.active.card.name} がバトル場へ！`,
          detail: "ベンチから新しいポケモンを出した",
          card: defSide.active.card,
          accent: "ai",
          duration: 1150
        }, sid);
        if (!isSessionAlive(sid)) return;
        await endTurn();
      } else {
        G.phase = "chooseActive";
        aiBusy = false;
        renderBattleArena();
        openSelectModal("次のバトルポケモンを選択", "ベンチからバトル場に出すポケモンを選んでください", defSide.bench.map((sl, i) => ({
          label: `${sl.card.name}（HP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}・エネ${sl.energies.length}）`,
          photoUrl: sl.card.photoUrl,
          onPick: () => {
            defSide.active = defSide.bench.splice(i, 1)[0];
            G.phase = "play";
            addLog(`あなたは${defSide.active.card.name}をバトル場に出した。`, "info");
            endTurn();
          }
        })), false);
      }
      return;
    }

    await endTurn();
  }

  /* ================= トレーナーズ実行処理（ふしぎなアメ・ペパー・夜のタンカ・すごいつりざお・エネつけかえ等） ================= */
  function playTrainerCard(sideKey, card, onDone) {
    const side = G[sideKey];
    const opp = G[sideKey === "player" ? "ai" : "player"];

    if (card.category === "support") {
      if (G.supporterUsedThisTurn) { if (sideKey === "player") toast("サポートは1ターンに1枚までです"); return false; }
      if (G.turn === 1 && sideKey === G.firstSide) { if (sideKey === "player") toast("先攻1ターン目はサポートを使えません"); return false; }
    }

    const consumeCard = () => {
      if (card.category === "support") G.supporterUsedThisTurn = true;
      side.hand = side.hand.filter((c) => c.uid !== card.uid);
      side.discard.push(card);
    };

    if (card.category === "stadium") {
      side.hand = side.hand.filter((c) => c.uid !== card.uid);
      if (G.stadium) side.discard.push(G.stadium);
      G.stadium = card;
      addLog(`🏟️ ${side.name}がスタジアム「${card.name}」を出した。`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `スタジアム「${card.name}」を場に出した` };
    }

    const eff = card.trainerEffect || "none";

    /* --- 1. ふしぎなアメ --- */
    if (eff === "rare_candy") {
      if (G.turn <= 2) { if (sideKey === "player") toast("最初の自分の番はふしぎなアメを使えません"); return false; }
      const stage2Hand = side.hand.filter((c) => c.category === "pokemon" && c.stage === "2進化");
      const basicSlots = [side.active, ...side.bench].filter((sl) => sl && (sl.card.stage || "たね") === "たね" && sl.playedTurn < G.turn);
      if (stage2Hand.length === 0) { if (sideKey === "player") toast("手札に2進化ポケモンがありません"); return false; }
      if (basicSlots.length === 0) { if (sideKey === "player") toast("進化できるたねポケモンが場にいません（出した番は不可）"); return false; }

      if (sideKey === "ai") {
        let pair = null;
        for (const s2 of stage2Hand) {
          const matchSlot = basicSlots.find((sl) => isLikelyRareCandyPair(sl.card, s2, side));
          if (matchSlot) { pair = { s2, sl: matchSlot }; break; }
        }
        if (!pair) return false;
        consumeCard();
        side.hand = side.hand.filter((c) => c.uid !== pair.s2.uid);
        const prevName = pair.sl.card.name;
        pair.sl.stack.push(pair.s2);
        pair.sl.card = pair.s2;
        pair.sl.playedTurn = G.turn;
        addLog(`🍬 AIが「${card.name}」で${prevName}を${pair.s2.name}へ直接進化させた！`, "important");
        if (onDone) onDone();
        return { ok: true, summary: `${prevName} → ${pair.s2.name} に直接進化！`, evolvedCard: pair.s2 };
      } else {
        openSelectModal(`🍬 ${card.name}：2進化ポケモン選択`, "手札から進化させる2進化ポケモンを選んでください", stage2Hand.map((s2) => ({
          label: `${s2.name}（HP ${s2.hp}）`,
          photoUrl: s2.photoUrl,
          onPick: () => {
            openSelectModal(`🍬 ${card.name}：進化元のたね選択`, `${s2.name}に進化させる自分のたねポケモンを選択`, basicSlots.map((sl) => ({
              label: `${sl.card.name}（HP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}・エネ${sl.energies.length}）`,
              photoUrl: sl.card.photoUrl,
              onPick: () => {
                consumeCard();
                side.hand = side.hand.filter((c) => c.uid !== s2.uid);
                const prevName = sl.card.name;
                sl.stack.push(s2);
                sl.card = s2;
                sl.playedTurn = G.turn;
                addLog(`🍬 「${card.name}」で${prevName}を${s2.name}へ直接進化させた！`, "important");
                if (onDone) onDone();
              }
            })), true);
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    /* --- 2. ペパー（グッズ1枚＋ポケモンのどうぐ1枚） --- */
    if (eff === "arven") {
      const goodsList = side.deck.filter((c) => c.category === "goods");
      const toolsList = side.deck.filter((c) => c.category === "tool");
      if (goodsList.length === 0 && toolsList.length === 0) {
        if (sideKey === "player") toast("山札にグッズもポケモンのどうぐもありません");
        return false;
      }

      if (sideKey === "ai") {
        consumeCard();
        const pickedNames = [];
        if (goodsList.length > 0) {
          const priority = ["rare_candy", "search_poffin", "search_basic", "search_pokemon", "energy_search", "recover_discard", "energy_switch"];
          const chosenG = [...goodsList].sort((a, b) => {
            const ia = priority.indexOf(a.trainerEffect), ib = priority.indexOf(b.trainerEffect);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
          })[0];
          side.deck = side.deck.filter((x) => x.uid !== chosenG.uid);
          side.hand.push(chosenG);
          pickedNames.push(chosenG.name);
        }
        if (toolsList.length > 0) {
          const chosenT = toolsList[0];
          side.deck = side.deck.filter((x) => x.uid !== chosenT.uid);
          side.hand.push(chosenT);
          pickedNames.push(chosenT.name);
        }
        shuffle(side.deck);
        addLog(`🧑 AIが「${card.name}」で ${pickedNames.join("・")} を手札に加えた！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `山札から「${pickedNames.join("」「")}」を手札に加えた` };
      } else {
        consumeCard();
        const gotNames = [];
        const stepTool = () => {
          const curTools = side.deck.filter((c) => c.category === "tool");
          if (curTools.length === 0) {
            shuffle(side.deck);
            addLog(`🧑 「${card.name}」で ${gotNames.length > 0 ? gotNames.join("・") : "なし"} を手札に加えた。`, "trainer");
            if (onDone) onDone();
            return;
          }
          const uMap = new Map();
          curTools.forEach((c) => { if (!uMap.has(c.name)) uMap.set(c.name, c); });
          openSelectModal(`${card.name}（2/2：ポケモンのどうぐ）`, "山札から手札に加えるどうぐを1枚選択（不要なら✕）", [...uMap.values()].map((c) => ({
            label: `${c.name}${c.effectText ? ` — ${c.effectText}` : ""}`,
            photoUrl: c.photoUrl,
            onPick: () => {
              const real = side.deck.find((x) => x.name === c.name && x.category === "tool");
              if (real) { side.deck = side.deck.filter((x) => x.uid !== real.uid); side.hand.push(real); gotNames.push(real.name); }
              shuffle(side.deck);
              addLog(`🧑 「${card.name}」で ${gotNames.join("・")} を手札に加えた！`, "trainer");
              if (onDone) onDone();
            }
          })), true, () => {
            shuffle(side.deck);
            addLog(`🧑 「${card.name}」で ${gotNames.length > 0 ? gotNames.join("・") : "なし"} を手札に加えた。`, "trainer");
            if (onDone) onDone();
          });
        };

        if (goodsList.length > 0) {
          const uMap = new Map();
          goodsList.forEach((c) => { if (!uMap.has(c.name)) uMap.set(c.name, c); });
          openSelectModal(`${card.name}（1/2：グッズ）`, "山札から手札に加えるグッズを1枚選択（不要なら✕）", [...uMap.values()].map((c) => ({
            label: `${c.name}${c.effectText ? ` — ${c.effectText}` : ""}`,
            photoUrl: c.photoUrl,
            onPick: () => {
              const real = side.deck.find((x) => x.name === c.name && x.category === "goods");
              if (real) { side.deck = side.deck.filter((x) => x.uid !== real.uid); side.hand.push(real); gotNames.push(real.name); }
              stepTool();
            }
          })), true, stepTool);
        } else {
          stepTool();
        }
        return { ok: true, summary: "" };
      }
    }

    /* --- 3. すごいつりざお（トラッシュからポケモン・エネ計3枚まで山札へ） --- */
    if (eff === "super_rod") {
      const cands = side.discard.filter((c) => c.category === "pokemon" || c.category === "energy");
      if (cands.length === 0) { if (sideKey === "player") toast("トラッシュに戻せるポケモン・エネルギーがありません"); return false; }

      if (sideKey === "ai") {
        consumeCard();
        const sorted = [...cands].sort((a, b) => (a.category === "pokemon" ? 0 : 1) - (b.category === "pokemon" ? 0 : 1));
        const pick = sorted.slice(0, 3);
        pick.forEach((c) => {
          side.discard = side.discard.filter((x) => x.uid !== c.uid);
          side.deck.push(c);
        });
        shuffle(side.deck);
        const names = pick.map((x) => x.name).join("・");
        addLog(`🎣 AIが「${card.name}」で${names}を山札に戻した！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `トラッシュから${pick.length}枚（${names}）を山札に戻した` };
      } else {
        consumeCard();
        const returned = [];
        const pickNext = (left) => {
          const curCands = side.discard.filter((c) => c.category === "pokemon" || c.category === "energy");
          if (left <= 0 || curCands.length === 0) {
            shuffle(side.deck);
            addLog(`🎣 「${card.name}」で ${returned.length > 0 ? returned.join("・") : "0枚"} を山札に戻した！`, "trainer");
            if (onDone) onDone();
            return;
          }
          const opts = curCands.map((c) => ({
            label: `${c.category === "pokemon" ? "👾" : "🔋"} ${c.name}`,
            photoUrl: c.photoUrl,
            onPick: () => {
              side.discard = side.discard.filter((x) => x.uid !== c.uid);
              side.deck.push(c);
              returned.push(c.name);
              pickNext(left - 1);
            }
          }));
          if (returned.length > 0) {
            opts.unshift({
              label: `✅ ここで決定（${returned.length}枚を山札に戻す）`,
              onPick: () => {
                shuffle(side.deck);
                addLog(`🎣 「${card.name}」で ${returned.join("・")} を山札に戻した！`, "trainer");
                if (onDone) onDone();
              }
            });
          }
          openSelectModal(`🎣 ${card.name}（残り${left}枚まで）`, "トラッシュから山札に戻すカードを選んでください", opts, returned.length > 0, () => {
            shuffle(side.deck);
            addLog(`🎣 「${card.name}」で ${returned.join("・")} を山札に戻した！`, "trainer");
            if (onDone) onDone();
          });
        };
        pickNext(3);
        return { ok: true, summary: "" };
      }
    }

    /* --- 4. エネルギーつけかえ（場のエネ1個を別の自分のポケモンへ） --- */
    if (eff === "energy_switch") {
      const allSlots = [side.active, ...side.bench].filter(Boolean);
      const donorSlots = allSlots.filter((sl) => sl.energies.length > 0);
      if (allSlots.length < 2 || donorSlots.length === 0) {
        if (sideKey === "player") toast("エネルギーを付け替えるポケモンが足りません");
        return false;
      }

      if (sideKey === "ai") {
        // バトル場がエネ不足で、ベンチにエネがある場合のみ実行
        if (!side.active) return false;
        const maxCost = Math.max(1, ...(side.active.card.attacks || []).map((a) => a.cost));
        if (side.active.energies.length >= maxCost) return false;
        const donor = side.bench.find((b) => b.energies.length > 0);
        if (!donor) return false;
        consumeCard();
        const movedEne = donor.energies.pop();
        side.active.energies.push(movedEne);
        addLog(`⚡ AIが「${card.name}」で${donor.card.name}の${movedEne.name}を${side.active.card.name}へ付け替えた！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `${donor.card.name} → ${side.active.card.name} へエネルギー移動！` };
      } else {
        openSelectModal(`⚡ ${card.name}（1/2：移動元）`, "エネルギーを外すポケモンを選んでください", donorSlots.map((fromSl) => ({
          label: `${fromSl.card.name}（エネ ${fromSl.energies.length}個）`,
          photoUrl: fromSl.card.photoUrl,
          onPick: () => {
            const destSlots = allSlots.filter((sl) => sl !== fromSl);
            openSelectModal(`⚡ ${card.name}（2/2：移動先）`, "エネルギーをつける先のポケモンを選んでください", destSlots.map((toSl) => ({
              label: `${toSl.card.name}（現在エネ ${toSl.energies.length}個）`,
              photoUrl: toSl.card.photoUrl,
              onPick: () => {
                consumeCard();
                const moved = fromSl.energies.pop();
                toSl.energies.push(moved);
                addLog(`⚡ 「${card.name}」で${fromSl.card.name}の${moved.name}を${toSl.card.name}へ付け替えた！`, "trainer");
                if (onDone) onDone();
              }
            })), true);
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    /* --- 5. エネルギー回収（トラッシュからエネ2枚手札へ） --- */
    if (eff === "energy_retrieval") {
      const enes = side.discard.filter((c) => c.category === "energy");
      if (enes.length === 0) { if (sideKey === "player") toast("トラッシュにエネルギーがありません"); return false; }
      consumeCard();
      const take = enes.slice(0, 2);
      take.forEach((e) => { side.discard = side.discard.filter((x) => x.uid !== e.uid); side.hand.push(e); });
      addLog(`🔋 ${side.name}が「${card.name}」でエネルギーを${take.length}枚手札に回収した！`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `トラッシュからエネルギーを${take.length}枚手札に加えた` };
    }

    /* --- 6. ともだちてちょう（トラッシュからサポート2枚山札へ） --- */
    if (eff === "pal_pad") {
      const sups = side.discard.filter((c) => c.category === "support");
      if (sups.length === 0) { if (sideKey === "player") toast("トラッシュにサポートがありません"); return false; }
      consumeCard();
      const take = sups.slice(0, 2);
      take.forEach((s) => { side.discard = side.discard.filter((x) => x.uid !== s.uid); side.deck.push(s); });
      shuffle(side.deck);
      addLog(`📒 ${side.name}が「${card.name}」でサポート${take.length}枚を山札に戻した！`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `トラッシュからサポート${take.length}枚を山札に戻した` };
    }

    /* --- 7. 既存トレーナーズ群 --- */
    if (eff === "draw7_discard") {
      consumeCard();
      side.discard.push(...side.hand);
      side.hand = [];
      const dr = drawCards(side, 7);
      addLog(`🧑 ${side.name}が「${card.name}」を使用！手札をトラッシュし${dr.length}枚引いた。`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `手札をすべてトラッシュし、山札を${dr.length}枚引いた` };
    }

    if (eff === "iono") {
      consumeCard();
      shuffle(side.hand); side.deck.push(...side.hand); side.hand = [];
      shuffle(opp.hand); opp.deck.push(...opp.hand); opp.hand = [];
      const d1 = drawCards(side, side.prizes.length);
      const d2 = drawCards(opp, opp.prizes.length);
      addLog(`🧑 ${side.name}が「${card.name}」を使用！（${side.name}${d1.length}枚 / ${opp.name}${d2.length}枚引き直し）`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `お互い手札を引き直し（${side.name}${d1.length}枚 / ${opp.name}${d2.length}枚）` };
    }

    if (eff === "draw3") {
      consumeCard();
      const dr = drawCards(side, 3);
      addLog(`🧑 ${side.name}が「${card.name}」を使用！${dr.length}枚引いた。`, "trainer");
      if (onDone) onDone();
      return { ok: true, summary: `山札から${dr.length}枚引いた` };
    }

    if (eff === "heal30") {
      const targets = [side.active, ...side.bench].filter((s) => s && s.damage > 0);
      if (targets.length === 0) { if (sideKey === "player") toast("ダメージを受けているポケモンがいません"); return false; }
      if (sideKey === "ai" || targets.length === 1) {
        consumeCard();
        targets[0].damage = Math.max(0, targets[0].damage - 30);
        addLog(`💚 ${side.name}が「${card.name}」で${targets[0].card.name}のHPを30回復！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `${targets[0].card.name}のHPを30回復` };
      } else {
        openSelectModal(card.name, "HPを30回復するポケモンを選んでください", targets.map((sl) => ({
          label: `${sl.card.name}（残りHP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}）`,
          photoUrl: sl.card.photoUrl,
          onPick: () => {
            consumeCard();
            sl.damage = Math.max(0, sl.damage - 30);
            addLog(`💚 ${side.name}が「${card.name}」で${sl.card.name}のHPを30回復！`, "trainer");
            if (onDone) onDone();
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "switch") {
      if (side.bench.length === 0) { if (sideKey === "player") toast("ベンチにポケモンがいません"); return false; }
      if (sideKey === "ai") {
        consumeCard();
        const nextAct = side.bench.splice(0, 1)[0];
        if (side.active) side.bench.push(side.active);
        side.active = nextAct;
        addLog(`🔄 AIが「${card.name}」で${side.active.card.name}と入れ替えた！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `${side.active.card.name}とバトル場を入れ替えた` };
      } else {
        openSelectModal(card.name, "バトル場に出すベンチポケモンを選んでください", side.bench.map((sl, i) => ({
          label: `${sl.card.name}（HP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}・エネ${sl.energies.length}）`,
          photoUrl: sl.card.photoUrl,
          onPick: () => {
            consumeCard();
            const nextAct = side.bench.splice(i, 1)[0];
            if (side.active) side.bench.push(side.active);
            side.active = nextAct;
            addLog(`🔄 あなたが「${card.name}」で${side.active.card.name}と入れ替えた！`, "trainer");
            if (onDone) onDone();
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "boss") {
      if (opp.bench.length === 0) { if (sideKey === "player") toast("相手のベンチにポケモンがいません"); return false; }
      if (sideKey === "ai") {
        consumeCard();
        let targetIdx = 0, minRem = 9999;
        opp.bench.forEach((sl, i) => {
          const rem = getMaxHp(sl) - sl.damage;
          if (rem < minRem) { minRem = rem; targetIdx = i; }
        });
        const pulled = opp.bench.splice(targetIdx, 1)[0];
        if (opp.active) opp.bench.push(opp.active);
        opp.active = pulled;
        addLog(`🎯 AIが「${card.name}」であなたの${pulled.card.name}をバトル場に呼び出した！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `あなたのベンチから「${pulled.card.name}」を呼び出した！` };
      } else {
        openSelectModal(card.name, "バトル場に呼び出す相手のベンチポケモンを選択", opp.bench.map((sl, i) => ({
          label: `${sl.card.name}（HP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}・エネ${sl.energies.length}）`,
          photoUrl: sl.card.photoUrl,
          onPick: () => {
            consumeCard();
            const pulled = opp.bench.splice(i, 1)[0];
            if (opp.active) opp.bench.push(opp.active);
            opp.active = pulled;
            addLog(`🎯 あなたが「${card.name}」で相手の${pulled.card.name}を呼び出した！`, "trainer");
            if (onDone) onDone();
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "search_basic" || eff === "search_poffin") {
      if (side.bench.length >= 5) { if (sideKey === "player") toast("ベンチがいっぱいです（最大5匹）"); return false; }
      const cands = side.deck.filter((c) => c.category === "pokemon" && (c.stage || "たね") === "たね" && (eff === "search_basic" || (Number(c.hp) || 999) <= 70));
      if (cands.length === 0) { if (sideKey === "player") toast("山札に対象のたねポケモンがいません"); return false; }
      consumeCard();

      if (sideKey === "ai") {
        const limit = eff === "search_poffin" ? Math.min(2, 5 - side.bench.length) : 1;
        const picked = cands.slice(0, limit);
        picked.forEach((p) => {
          side.deck = side.deck.filter((x) => x.uid !== p.uid);
          side.bench.push(createPokemonSlot(p, G.turn));
        });
        shuffle(side.deck);
        const names = picked.map((x) => x.name).join("・");
        addLog(`🎒 AIが「${card.name}」で${names}をベンチに出した！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `山札から「${names}」をベンチに出した` };
      } else {
        const maxPick = eff === "search_poffin" ? Math.min(2, 5 - side.bench.length) : 1;
        const pickOne = (remaining) => {
          const curCands = side.deck.filter((c) => c.category === "pokemon" && (c.stage || "たね") === "たね" && (eff === "search_basic" || (Number(c.hp) || 999) <= 70));
          if (remaining <= 0 || curCands.length === 0 || side.bench.length >= 5) {
            shuffle(side.deck);
            if (onDone) onDone();
            return;
          }
          const uMap = new Map();
          curCands.forEach((c) => { if (!uMap.has(c.name)) uMap.set(c.name, c); });
          openSelectModal(`${card.name}（残り${remaining}匹）`, "ベンチに出すたねポケモンを選んでください", [...uMap.values()].map((c) => ({
            label: `${c.name}（HP ${c.hp || 70}）`,
            photoUrl: c.photoUrl,
            onPick: () => {
              const real = side.deck.find((x) => x.name === c.name && x.category === "pokemon");
              if (real) {
                side.deck = side.deck.filter((x) => x.uid !== real.uid);
                side.bench.push(createPokemonSlot(real, G.turn));
                addLog(`🎒 「${card.name}」で${real.name}をベンチに出した！`, "trainer");
              }
              pickOne(remaining - 1);
            }
          })), true, () => { shuffle(side.deck); if (onDone) onDone(); });
        };
        pickOne(maxPick);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "search_pokemon") {
      const others = side.hand.filter((c) => c.uid !== card.uid);
      if (others.length < 2) { if (sideKey === "player") toast("トラッシュする手札が2枚足りません"); return false; }
      const pokes = side.deck.filter((c) => c.category === "pokemon");
      if (pokes.length === 0) { if (sideKey === "player") toast("山札にポケモンがいません"); return false; }
      consumeCard();

      if (sideKey === "ai") {
        const trash = others.slice(0, 2);
        trash.forEach((t) => { side.hand = side.hand.filter((x) => x.uid !== t.uid); side.discard.push(t); });
        const best = pokes.sort((a, b) => (Number(b.hp) || 0) - (Number(a.hp) || 0))[0];
        side.deck = side.deck.filter((x) => x.uid !== best.uid);
        side.hand.push(best);
        shuffle(side.deck);
        addLog(`🎒 AIが「${card.name}」で${best.name}を手札に加えた！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `山札から「${best.name}」を手札に加えた` };
      } else {
        const pickTrash = (left) => {
          if (left <= 0) {
            const uMap = new Map();
            side.deck.filter((c) => c.category === "pokemon").forEach((c) => { if (!uMap.has(c.name)) uMap.set(c.name, c); });
            openSelectModal(`${card.name}：ポケモン選択`, "山札から手札に加えるポケモンを選択", [...uMap.values()].map((c) => ({
              label: `${c.name}（${c.stage || "たね"}・HP ${c.hp || 80}）`,
              photoUrl: c.photoUrl,
              onPick: () => {
                const real = side.deck.find((x) => x.name === c.name && x.category === "pokemon");
                if (real) {
                  side.deck = side.deck.filter((x) => x.uid !== real.uid);
                  side.hand.push(real);
                  addLog(`🎒 「${card.name}」で${real.name}を手札に加えた！`, "trainer");
                }
                shuffle(side.deck);
                if (onDone) onDone();
              }
            })), true, () => { shuffle(side.deck); if (onDone) onDone(); });
            return;
          }
          openSelectModal(`${card.name}：トラッシュ（残り${left}枚）`, "手札からトラッシュするカードを選んでください", side.hand.map((h) => ({
            label: `${h.name}`,
            photoUrl: h.photoUrl,
            onPick: () => {
              side.hand = side.hand.filter((x) => x.uid !== h.uid);
              side.discard.push(h);
              pickTrash(left - 1);
            }
          })), false);
        };
        pickTrash(2);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "energy_search") {
      const others = side.hand.filter((c) => c.uid !== card.uid);
      const enes = side.deck.filter((c) => c.category === "energy");
      if (enes.length === 0) { if (sideKey === "player") toast("山札にエネルギーがありません"); return false; }
      if (others.length < 1) { if (sideKey === "player") toast("トラッシュする手札が1枚足りません"); return false; }
      consumeCard();

      const grantEnergies = () => {
        const take = side.deck.filter((c) => c.category === "energy").slice(0, 2);
        take.forEach((e) => { side.deck = side.deck.filter((x) => x.uid !== e.uid); side.hand.push(e); });
        shuffle(side.deck);
        addLog(`🔋 ${side.name}が「${card.name}」でエネルギーを${take.length}枚手札に加えた！`, "trainer");
        if (onDone) onDone();
        return take.length;
      };

      if (sideKey === "ai") {
        const t = others[0];
        side.hand = side.hand.filter((x) => x.uid !== t.uid);
        side.discard.push(t);
        const got = grantEnergies();
        return { ok: true, summary: `山札からエネルギーを${got}枚手札に加えた` };
      } else {
        openSelectModal(`${card.name}：1枚トラッシュ`, "手札からトラッシュするカードを1枚選んでください", side.hand.map((h) => ({
          label: h.name,
          photoUrl: h.photoUrl,
          onPick: () => {
            side.hand = side.hand.filter((x) => x.uid !== h.uid);
            side.discard.push(h);
            grantEnergies();
          }
        })), false);
        return { ok: true, summary: "" };
      }
    }

    if (eff === "recover_discard") {
      const cands = side.discard.filter((c) => c.category === "pokemon" || c.category === "energy");
      if (cands.length === 0) { if (sideKey === "player") toast("トラッシュにポケモン・エネルギーがありません"); return false; }
      if (sideKey === "ai") {
        consumeCard();
        const pick = cands.find((c) => c.category === "pokemon") || cands[0];
        side.discard = side.discard.filter((x) => x.uid !== pick.uid);
        side.hand.push(pick);
        addLog(`♻️ AIが「${card.name}」で${pick.name}を回収した！`, "trainer");
        if (onDone) onDone();
        return { ok: true, summary: `トラッシュから「${pick.name}」を手札に回収` };
      } else {
        openSelectModal(card.name, "トラッシュから手札に戻すカードを選択", cands.map((c) => ({
          label: `${c.category === "pokemon" ? "👾" : "🔋"} ${c.name}`,
          photoUrl: c.photoUrl,
          onPick: () => {
            consumeCard();
            side.discard = side.discard.filter((x) => x.uid !== c.uid);
            side.hand.push(c);
            addLog(`♻️ 「${card.name}」で${c.name}を回収した！`, "trainer");
            if (onDone) onDone();
          }
        })), true);
        return { ok: true, summary: "" };
      }
    }

    consumeCard();
    addLog(`🃏 ${side.name}が「${card.name}」を使用${card.effectText ? `（${card.effectText}）` : "（特殊効果は🛠️手動メニューで反映できます）"}`, "trainer");
    if (onDone) onDone();
    return { ok: true, summary: card.effectText || "カードを使用" };
  }

  /* ================= オフラインAI思考ルーチン（新特殊効果＆超ゆっくり対応） ================= */
  async function runAiTurn(sid) {
    if (!isSessionAlive(sid) || G.phase !== "play" || G.activeSide !== "ai" || aiBusy) return;
    aiBusy = true;
    try {
      await wait(pace(700));
      if (!isSessionAlive(sid)) return;
      const ai = G.ai;

      // 1. たねポケモンをベンチに展開
      for (let guard = 0; guard < 5; guard++) {
        if (!isSessionAlive(sid) || ai.bench.length >= 5) break;
        const basic = ai.hand.find((c) => c.category === "pokemon" && (c.stage || "たね") === "たね");
        if (!basic) break;
        ai.hand = ai.hand.filter((c) => c.uid !== basic.uid);
        ai.bench.push(createPokemonSlot(basic, G.turn));
        const bIdx = ai.bench.length - 1;
        addLog(`AIがベンチに${basic.name}を出した。`, "info");
        renderBattleArena();
        flashBoardTarget(`[data-ai-bench="${bIdx}"] .btl-pkm-card`);
        await showActionCutin({
          badge: "🤖 AI：ベンチに展開",
          title: basic.name,
          detail: `HP ${basic.hp || 70} のたねポケモンをベンチに出した`,
          card: basic,
          accent: "ai",
          duration: 1300
        }, sid);
      }

      // 2. サポート使用（ペパーなどサーチ系をグッズより先に使うのも有効）
      if (isSessionAlive(sid) && !(G.turn === 1 && G.firstSide === "ai") && !G.supporterUsedThisTurn) {
        const arven = ai.hand.find((c) => c.category === "support" && c.trainerEffect === "arven");
        const boss = ai.hand.find((c) => c.category === "support" && c.trainerEffect === "boss");
        const drawSup = ai.hand.find((c) => c.category === "support" && ["draw7_discard", "iono", "draw3"].includes(c.trainerEffect));
        let chosenSup = null;
        if (arven && ai.deck.some((c) => c.category === "goods" || c.category === "tool")) chosenSup = arven;
        else if (drawSup && ai.hand.length <= 4) chosenSup = drawSup;
        else if (boss && G.player.bench.length > 0 && ai.active && ai.active.energies.length >= 1) chosenSup = boss;
        else if (drawSup && ai.hand.length <= 6 && !ai.hand.some((c) => c.category === "energy")) chosenSup = drawSup;

        if (chosenSup) {
          const res = playTrainerCard("ai", chosenSup);
          if (res && res.ok) {
            renderBattleArena();
            await showActionCutin({
              badge: "🧑 AI：サポート使用",
              title: chosenSup.name,
              detail: res.summary || chosenSup.effectText || "",
              card: chosenSup,
              accent: "trainer",
              duration: 1550
            }, sid);
          }
        }
      }

      // 3. グッズ・どうぐ使用（ふしぎなアメ・夜のタンカ・すごいつりざお・エネつけかえ対応）
      const aiGoodsEffects = ["rare_candy", "search_basic", "search_poffin", "energy_search", "recover_discard", "super_rod", "energy_retrieval", "pal_pad", "energy_switch", "heal30", "search_pokemon"];
      for (let g = 0; g < 5; g++) {
        if (!isSessionAlive(sid) || G.phase !== "play") return;
        const tool = ai.hand.find((c) => c.category === "tool");
        if (tool && ai.active && !ai.active.tool) {
          ai.hand = ai.hand.filter((c) => c.uid !== tool.uid);
          ai.active.tool = tool;
          addLog(`🛠️ AIが${ai.active.card.name}に「${tool.name}」をつけた。`, "trainer");
          renderBattleArena();
          flashBoardTarget("#btlAiActive .btl-pkm-card");
          await showActionCutin({
            badge: "🛠️ AI：ポケモンのどうぐ",
            title: tool.name,
            detail: `${ai.active.card.name} につけた`,
            card: tool,
            accent: "trainer",
            duration: 1350
          }, sid);
          continue;
        }

        let usedThisLoop = false;
        for (const effName of aiGoodsEffects) {
          const goods = ai.hand.find((c) => c.category === "goods" && c.trainerEffect === effName);
          if (!goods) continue;
          const res = playTrainerCard("ai", goods);
          if (res && res.ok) {
            renderBattleArena();
            await showActionCutin({
              badge: effName === "rare_candy" ? "🍬 AI：ふしぎなアメ！" : "🎒 AI：グッズ使用",
              title: goods.name,
              detail: res.summary || goods.effectText || "",
              card: res.evolvedCard || goods,
              accent: effName === "rare_candy" ? "evolve" : "trainer",
              duration: 1450
            }, sid);
            usedThisLoop = true;
            break;
          }
        }
        if (!usedThisLoop) break;
      }

      // 4. 通常進化できるポケモンを進化させる
      const allSlots = [{ sl: ai.active, sel: "#btlAiActive .btl-pkm-card" }, ...ai.bench.map((b, i) => ({ sl: b, sel: `[data-ai-bench="${i}"] .btl-pkm-card` }))].filter((x) => x.sl);
      for (const item of allSlots) {
        if (!isSessionAlive(sid)) return;
        const evo = ai.hand.find((c) => canEvolveOnto(c, item.sl, G.turn));
        if (evo) {
          ai.hand = ai.hand.filter((c) => c.uid !== evo.uid);
          const prevName = item.sl.card.name;
          item.sl.stack.push(evo);
          item.sl.card = evo;
          item.sl.playedTurn = G.turn;
          addLog(`✨ AIの${prevName}が${evo.name}に進化した！`, "important");
          renderBattleArena();
          flashBoardTarget(item.sel);
          await showActionCutin({
            badge: "✨ AI：進化！",
            title: `${prevName} → ${evo.name}`,
            detail: `HP ${evo.hp} にパワーアップ！`,
            card: evo,
            accent: "evolve",
            duration: 1450
          }, sid);
        }
      }

      // 5. エネルギーを1枚貼る
      const ene = ai.hand.find((c) => c.category === "energy");
      if (isSessionAlive(sid) && ene && !G.energyAttachedThisTurn) {
        let target = ai.active;
        let targetSel = "#btlAiActive .btl-pkm-card";
        if (ai.active) {
          const maxCost = Math.max(0, ...(ai.active.card.attacks || []).map((a) => a.cost));
          if (ai.active.energies.length >= maxCost && ai.bench.length > 0) {
            const bIdx = ai.bench.findIndex((b) => b.energies.length < Math.max(1, ...(b.card.attacks || []).map((a) => a.cost)));
            if (bIdx >= 0) { target = ai.bench[bIdx]; targetSel = `[data-ai-bench="${bIdx}"] .btl-pkm-card`; }
          }
        } else if (ai.bench.length > 0) {
          target = ai.bench[0];
          targetSel = `[data-ai-bench="0"] .btl-pkm-card`;
        }
        if (target) {
          ai.hand = ai.hand.filter((c) => c.uid !== ene.uid);
          target.energies.push(ene);
          G.energyAttachedThisTurn = true;
          addLog(`🔋 AIが${target.card.name}に${ene.name}をつけた。`, "info");
          renderBattleArena();
          flashBoardTarget(targetSel);
          await showActionCutin({
            badge: "🔋 AI：エネルギー付与",
            title: `${target.card.name} にエネルギー`,
            detail: `${ene.name} をつけた（計${target.energies.length}個）`,
            card: ene,
            accent: "energy",
            duration: 1350
          }, sid);
        }
      }

      // 6. ワザを使えるなら最大ダメージのワザを使う（先攻1ターン目は不可）
      if (isSessionAlive(sid) && G.phase === "play" && ai.active && !(G.turn === 1 && G.firstSide === "ai")) {
        const attacks = ai.active.card.attacks || [];
        let bestIdx = -1, bestDmg = -1;
        attacks.forEach((a, i) => {
          if (ai.active.energies.length >= a.cost && (Number(a.damage) || 0) >= bestDmg) {
            bestDmg = Number(a.damage) || 0;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0) {
          aiBusy = false;
          await performAttack("ai", bestIdx);
          return;
        }
      }

      if (isSessionAlive(sid) && G.phase === "play" && G.activeSide === "ai") {
        addLog("AIはワザを使わず番を終了した。", "info");
        await wait(pace(650));
        if (!isSessionAlive(sid)) return;
        aiBusy = false;
        await endTurn();
      }
    } finally {
      if (isSessionAlive(sid) && G && G.activeSide === "player") aiBusy = false;
    }
  }

  /* ================= 手札アップ表示（ポケポケ風ハンドズーム） ================= */
  function getHandActionMeta(card) {
    if (!G || !card) return { label: "使えません", disabled: true };
    if (G.phase === "over") return { label: "対戦終了", disabled: true };

    if (G.phase === "setup") {
      if (card.category === "pokemon" && (card.stage || "たね") === "たね") {
        if (!G.player.active) return { label: "⚔️ バトル場に出す", disabled: false };
        if (G.player.bench.length < 5) return { label: "🪑 ベンチに出す", disabled: false };
        return { label: "ベンチがいっぱいです", disabled: true };
      }
      return { label: "初期配置はたねポケモンのみ", disabled: true };
    }

    if (G.phase !== "play" || G.activeSide !== "player" || aiBusy) {
      return { label: "相手の番です（確認のみ）", disabled: true };
    }

    if (card.category === "pokemon") {
      if ((card.stage || "たね") === "たね") {
        if (G.player.bench.length >= 5) return { label: "ベンチがいっぱいです", disabled: true };
        return { label: "🪑 ベンチに出す", disabled: false };
      }
      return { label: "✨ 進化先を選ぶ", disabled: false };
    }
    if (card.category === "energy") {
      if (G.energyAttachedThisTurn) return { label: "この番はエネルギー付与済み", disabled: true };
      return { label: "🔋 つけるポケモンを選ぶ", disabled: false };
    }
    if (card.category === "tool") return { label: "🛠️ つけるポケモンを選ぶ", disabled: false };
    if (card.category === "support") {
      if (G.supporterUsedThisTurn) return { label: "この番はサポート使用済み", disabled: true };
      if (G.turn === 1 && G.firstSide === "player") return { label: "先攻1ターン目はサポート不可", disabled: true };
      return { label: "🧑 このサポートを使う", disabled: false };
    }
    if (card.category === "stadium") return { label: "🏟️ スタジアムを出す", disabled: false };
    return { label: "🎒 このグッズを使う", disabled: false };
  }

  function openHandZoom(idx) {
    if (!G || !G.player.hand || G.player.hand.length === 0) return;
    handZoomIdx = Math.max(0, Math.min(G.player.hand.length - 1, idx));
    renderHandZoom();
    document.getElementById("btlHandZoomOverlay").classList.add("is-open");
  }

  function closeHandZoom() {
    const el = document.getElementById("btlHandZoomOverlay");
    if (el) el.classList.remove("is-open");
  }

  function renderHandZoom() {
    if (!G || !G.player.hand || G.player.hand.length === 0) { closeHandZoom(); return; }
    handZoomIdx = Math.max(0, Math.min(G.player.hand.length - 1, handZoomIdx));
    const card = G.player.hand[handZoomIdx];
    const ti = TYPE_INFO[card.type] || TYPE_INFO[card.category === "energy" ? "エネルギー" : card.category === "support" ? "サポート" : card.category === "goods" ? "グッズ" : card.category === "tool" ? "ポケモンのどうぐ" : "無色"] || TYPE_INFO["無色"];

    document.getElementById("btlHzPos").textContent = `手札 ${handZoomIdx + 1} / ${G.player.hand.length}（左右スワイプで切替）`;
    document.getElementById("btlHzPrevBtn").style.visibility = handZoomIdx > 0 ? "visible" : "hidden";
    document.getElementById("btlHzNextBtn").style.visibility = handZoomIdx < G.player.hand.length - 1 ? "visible" : "hidden";

    const box = document.getElementById("btlHzCardBox");
    box.style.borderColor = ti.color;
    box.innerHTML = card.photoUrl
      ? `<img src="${card.photoUrl}" alt="${esc(card.name)}" />`
      : `<div style="width:100%;height:100%;background:${ti.bg};color:#0f172a;padding:14px;display:flex;flex-direction:column;justify-content:space-between;text-align:center;">
           <div style="font-weight:900;font-size:15px;">${esc(card.name)}</div>
           <div style="font-size:52px;margin:auto 0;">${ti.icon}</div>
           <div style="font-weight:800;font-size:12px;color:#475569;">${card.category === "pokemon" ? `${card.stage || "たね"} / HP ${card.hp}` : esc(card.category)}</div>
         </div>`;

    let infoHtml = `<div style="font-weight:900;font-size:14px;margin-bottom:4px;">${esc(card.name)}</div>`;
    if (card.category === "pokemon") {
      infoHtml += `<div style="color:#cbd5e1;margin-bottom:4px;">${esc(card.stage || "たね")}・${ti.icon}${esc(card.type || "無色")} ／ HP <b>${card.hp}</b> ／ 弱点:${esc(card.weakness || "なし")} ／ にげる:${card.retreat ?? 1}</div>`;
      const atks = card.attacks || [];
      if (atks.length > 0) {
        infoHtml += atks.map((a) => `<div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:4px 7px;margin-top:4px;"><b>⚔️ ${esc(a.name)}</b>（エネ${a.cost} ／ <b>${a.damage}</b>ダメ）${a.effect ? `<div style="font-size:10.5px;color:#cbd5e1;">${esc(a.effect)}</div>` : ""}</div>`).join("");
      }
    } else if (card.category === "energy") {
      infoHtml += `<div style="color:#cbd5e1;">${ti.icon} エネルギーカード（1ターンに1枚、自分のポケモンにつけられます）</div>`;
    } else {
      const effDesc = card.effectText || TRAINER_EFFECT_LABELS[card.trainerEffect] || "トレーナーズカード";
      infoHtml += `<div style="color:#e2e8f0;">${esc(effDesc)}</div>`;
    }
    document.getElementById("btlHzInfo").innerHTML = infoHtml;

    const act = getHandActionMeta(card);
    const useBtn = document.getElementById("btlHzUseBtn");
    useBtn.textContent = act.label;
    useBtn.disabled = act.disabled;
    useBtn.onclick = () => {
      closeHandZoom();
      executePlayerHandCard(card.uid);
    };
  }

  /* ================= プレイヤー操作ハンドラ ================= */
  function executePlayerHandCard(cardUid) {
    if (!G || aiBusy) return;
    const card = G.player.hand.find((c) => c.uid === cardUid);
    if (!card) return;

    if (G.phase === "setup") {
      if (card.category !== "pokemon" || (card.stage || "たね") !== "たね") {
        return toast("初期配置では「たねポケモン」だけを出せます");
      }
      if (!G.player.active) {
        G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
        G.player.active = createPokemonSlot(card, 0);
        addLog(`バトル場に${card.name}を配置した。`, "info");
      } else if (G.player.bench.length < 5) {
        G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
        G.player.bench.push(createPokemonSlot(card, 0));
        addLog(`ベンチに${card.name}を配置した。`, "info");
      } else {
        toast("ベンチがいっぱいです（最大5匹）");
      }
      renderBattleArena();
      return;
    }

    if (G.phase !== "play" || G.activeSide !== "player") return toast("相手の番です");

    if (card.category === "pokemon" && (card.stage || "たね") === "たね") {
      if (G.player.bench.length >= 5) return toast("ベンチがいっぱいです（最大5匹）");
      G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
      G.player.bench.push(createPokemonSlot(card, G.turn));
      addLog(`あなたがベンチに${card.name}を出した。`, "info");
      G.selectedHandUid = null;
      renderBattleArena();
      return;
    }

    if (card.category === "goods" || card.category === "support" || card.category === "stadium") {
      playTrainerCard("player", card, () => renderBattleArena());
      renderBattleArena();
      return;
    }

    if (card.category === "energy" && G.energyAttachedThisTurn) {
      return toast("エネルギーは1ターンに1枚までです");
    }
    G.selectedHandUid = card.uid;
    const msg = card.category === "energy"
      ? `🔋 「${card.name}」をつける自分のポケモンをタップしてください`
      : card.category === "tool"
        ? `🛠️ 「${card.name}」をつける自分のポケモンをタップしてください`
        : `✨ 「${card.name}」に進化させる自分のポケモンをタップしてください`;
    toast(msg);
    renderBattleArena();
  }

  function onPlayerSlotTap(isActive, benchIdx) {
    if (!G || aiBusy) return;
    const slot = isActive ? G.player.active : G.player.bench[benchIdx];
    if (!slot) return;

    if (G.phase === "setup") {
      if (isActive) { G.player.hand.push(slot.card); G.player.active = null; }
      else { G.player.hand.push(slot.card); G.player.bench.splice(benchIdx, 1); }
      renderBattleArena();
      return;
    }

    if (G.phase === "play" && G.activeSide === "player" && G.selectedHandUid) {
      const card = G.player.hand.find((c) => c.uid === G.selectedHandUid);
      if (card) {
        if (card.category === "energy") {
          if (G.energyAttachedThisTurn) return toast("エネルギーは1ターンに1枚までです");
          G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
          slot.energies.push(card);
          G.energyAttachedThisTurn = true;
          G.selectedHandUid = null;
          addLog(`🔋 ${slot.card.name}に${card.name}をつけた。`, "info");
          renderBattleArena();
          flashBoardTarget(isActive ? "#btlPlActive .btl-pkm-card" : `[data-pl-bench="${benchIdx}"] .btl-pkm-card`);
          return;
        }
        if (card.category === "tool") {
          if (slot.tool) return toast("すでにポケモンのどうぐが付いています");
          G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
          slot.tool = card;
          G.selectedHandUid = null;
          addLog(`🛠️ ${slot.card.name}に「${card.name}」をつけた！`, "trainer");
          renderBattleArena();
          flashBoardTarget(isActive ? "#btlPlActive .btl-pkm-card" : `[data-pl-bench="${benchIdx}"] .btl-pkm-card`);
          return;
        }
        if (card.category === "pokemon") {
          if (!canEvolveOnto(card, slot, G.turn)) {
            return toast(`このポケモンには進化できません（必要進化元: ${card.evolvesFrom || "前の段階"}／出した番・1ターン目は進化不可）`);
          }
          G.player.hand = G.player.hand.filter((c) => c.uid !== card.uid);
          const prevName = slot.card.name;
          slot.stack.push(card);
          slot.card = card;
          slot.playedTurn = G.turn;
          G.selectedHandUid = null;
          addLog(`✨ ${prevName}が${card.name}に進化した！`, "important");
          renderBattleArena();
          flashBoardTarget(isActive ? "#btlPlActive .btl-pkm-card" : `[data-pl-bench="${benchIdx}"] .btl-pkm-card`);
          return;
        }
      }
    }

    openSlotInspector(slot, "player", isActive);
  }

  function openAttackPicker() {
    if (!G || G.phase !== "play" || G.activeSide !== "player" || aiBusy) return;
    if (!G.player.active) return;
    if (G.turn === 1 && G.firstSide === "player") return toast("先攻1ターン目はワザを使えません");

    const sl = G.player.active;
    const atks = sl.card.attacks || [];
    if (atks.length === 0) return toast("このポケモンにワザが登録されていません");

    openSelectModal(`⚔️ ${sl.card.name}のワザ`, `ついているエネルギー：${sl.energies.length}個`, atks.map((a, idx) => {
      const ok = sl.energies.length >= a.cost;
      return {
        label: `${ok ? "✅" : "🔒"} ${a.name}（必要エネ${a.cost} ／ ${a.damage}ダメージ）${a.effect ? ` — ${a.effect}` : ""}`,
        disabled: !ok,
        onPick: () => performAttack("player", idx)
      };
    }), true);
  }

  function openRetreatPicker() {
    if (!G || G.phase !== "play" || G.activeSide !== "player" || aiBusy) return;
    if (G.retreatedThisTurn) return toast("にげるは1ターンに1回までです");
    if (!G.player.active || G.player.bench.length === 0) return toast("入れ替えるベンチポケモンがいません");
    const cost = Number(G.player.active.card.retreat) || 0;
    if (G.player.active.energies.length < cost) return toast(`にげるエネルギーが足りません（必要 ${cost}個）`);

    openSelectModal("🏃 にげる（ベンチ選択）", `エネルギーを${cost}個トラッシュして交代します`, G.player.bench.map((sl, i) => ({
      label: `${sl.card.name}（HP ${getMaxHp(sl) - sl.damage}/${getMaxHp(sl)}・エネ${sl.energies.length}）`,
      photoUrl: sl.card.photoUrl,
      onPick: () => {
        for (let k = 0; k < cost; k++) G.player.discard.push(G.player.active.energies.pop());
        const nextAct = G.player.bench.splice(i, 1)[0];
        G.player.bench.push(G.player.active);
        G.player.active = nextAct;
        G.retreatedThisTurn = true;
        addLog(`🏃 にげる！${nextAct.card.name}をバトル場に出した。`, "info");
        renderBattleArena();
      }
    })), true);
  }

  function openManualAssistMenu() {
    if (!G || G.phase !== "play" || aiBusy) return;
    openSelectModal("🛠️ 手動補助（複雑な特性・効果用）", "未自動化の特性・グッズ効果を手動で反映できます", [
      { label: "💥 相手バトル場に +10 ダメカン", onPick: () => { if (G.ai.active) { G.ai.active.damage += 10; addLog("🛠️ 手動：相手バトル場に10ダメージ", "info"); renderBattleArena(); } } },
      { label: "💚 相手バトル場のダメカン -10", onPick: () => { if (G.ai.active) { G.ai.active.damage = Math.max(0, G.ai.active.damage - 10); renderBattleArena(); } } },
      { label: "💚 自分バトル場のHPを +30 回復", onPick: () => { if (G.player.active) { G.player.active.damage = Math.max(0, G.player.active.damage - 30); addLog("🛠️ 手動：自分バトル場を30回復", "info"); renderBattleArena(); } } },
      { label: "🃏 自分の山札から1枚ドロー", onPick: () => { const [d] = drawCards(G.player, 1); if (d) addLog(`🛠️ 手動ドロー：${d.name}`, "info"); renderBattleArena(); } },
      { label: "🔍 自分の山札を見て1枚手札に加える", onPick: () => {
        const uMap = new Map();
        G.player.deck.forEach((c) => { if (!uMap.has(c.name)) uMap.set(c.name, c); });
        openSelectModal("山札から1枚選択", "手札に加えるカードを選択（自動でシャッフルされます）", [...uMap.values()].map((c) => ({
          label: c.name,
          photoUrl: c.photoUrl,
          onPick: () => {
            const real = G.player.deck.find((x) => x.name === c.name);
            if (real) { G.player.deck = G.player.deck.filter((x) => x.uid !== real.uid); G.player.hand.push(real); shuffle(G.player.deck); addLog(`🛠️ 手動サーチ：${real.name}`, "info"); renderBattleArena(); }
          }
        })), true);
      } }
    ], true);
  }

  /* ================= UI描画：バトル盤面 ================= */
  function renderEnergyOrbs(energies) {
    if (!energies || energies.length === 0) return "";
    return `<div class="btl-orbs">${energies.slice(0, 6).map((e) => {
      const ti = TYPE_INFO[e.type] || TYPE_INFO["無色"];
      return `<span class="btl-orb" style="background:${ti.color};" title="${esc(e.name)}">${ti.icon}</span>`;
    }).join("")}${energies.length > 6 ? `<span class="btl-orb-more">+${energies.length - 6}</span>` : ""}</div>`;
  }

  function renderFieldCardHtml(slot, isBench, isHighlight) {
    if (!slot) return `<div class="btl-slot-empty">${isBench ? "ベンチ" : "バトル場"}</div>`;
    const c = slot.card;
    const maxHp = getMaxHp(slot);
    const remHp = Math.max(0, maxHp - slot.damage);
    const pct = Math.max(0, Math.min(100, Math.round((remHp / maxHp) * 100)));
    const hpColor = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";
    const ti = TYPE_INFO[c.type] || TYPE_INFO["無色"];

    return `
      <div class="btl-pkm-card${isBench ? " is-bench" : " is-active-spot"}${isHighlight ? " is-target-glow" : ""}" style="border-color:${ti.color};">
        ${c.photoUrl
          ? `<img class="btl-pkm-img" src="${c.photoUrl}" alt="${esc(c.name)}" />`
          : `<div class="btl-pkm-fallback" style="background:${ti.bg};">
               <div class="btl-fb-name">${esc(c.name)}</div>
               <div class="btl-fb-icon">${ti.icon}</div>
             </div>`}
        <div class="btl-hp-badge">
          <div class="btl-hp-text">${remHp}/${maxHp}</div>
          <div class="btl-hp-bar"><div class="btl-hp-fill" style="width:${pct}%;background:${hpColor};"></div></div>
        </div>
        ${slot.damage > 0 ? `<div class="btl-dmg-chip">-${slot.damage}</div>` : ""}
        ${slot.tool ? `<div class="btl-tool-chip">🛠️</div>` : ""}
        ${renderEnergyOrbs(slot.energies)}
      </div>
    `;
  }

  function renderBattleArena() {
    if (!G) return;
    const turnBadge = document.getElementById("btlTurnBadge");
    if (turnBadge) {
      turnBadge.textContent = G.phase === "setup"
        ? `初期配置（${G.firstSide === "player" ? "先攻" : "後攻"}）`
        : G.phase === "over"
          ? (G.winner === "player" ? "🏆 WIN!" : "💀 LOSE")
          : `T${G.turn} ${G.activeSide === "player" ? "あなたの番" : "AIの番..."}`;
      turnBadge.className = `btl-turn-pill ${G.activeSide === "player" ? "is-player" : "is-ai"}`;
    }

    const spdBtn = document.getElementById("btlSpeedBtn");
    if (spdBtn) {
      spdBtn.textContent = aiSpeedMode === "superslow" ? "🐌 超ゆっくり" : aiSpeedMode === "slow" ? "🐢 ゆっくり" : "🐇 標準";
    }

    document.getElementById("btlAiStats").innerHTML = `
      <span>🤖 ${esc(G.ai.deckName.slice(0, 14))}</span>
      <span>サイド<b>${G.ai.prizes.length}</b> / 手札<b>${G.ai.hand.length}</b> / 山札<b>${G.ai.deck.length}</b></span>
    `;
    const aiBenchEl = document.getElementById("btlAiBench");
    aiBenchEl.innerHTML = Array.from({ length: 5 }).map((_, i) => `<div class="btl-bench-cell" data-ai-bench="${i}">${renderFieldCardHtml(G.ai.bench[i] || null, true, false)}</div>`).join("");
    aiBenchEl.querySelectorAll("[data-ai-bench]").forEach((el) => {
      const idx = Number(el.dataset.aiBench);
      if (G.ai.bench[idx]) el.addEventListener("click", () => openSlotInspector(G.ai.bench[idx], "ai", false));
    });

    const aiActEl = document.getElementById("btlAiActive");
    aiActEl.innerHTML = renderFieldCardHtml(G.ai.active, false, false);
    aiActEl.onclick = () => { if (G.ai.active) openSlotInspector(G.ai.active, "ai", true); };

    const latest = G.logs[0];
    document.getElementById("btlLogTicker").textContent = latest ? latest.msg : "バトル開始";
    document.getElementById("btlStadiumChip").textContent = G.stadium ? `🏟️ ${G.stadium.name}` : "";

    const selCard = G.selectedHandUid ? G.player.hand.find((c) => c.uid === G.selectedHandUid) : null;
    const isTargetable = (sl) => {
      if (!selCard || !sl) return false;
      if (selCard.category === "energy" && !G.energyAttachedThisTurn) return true;
      if (selCard.category === "tool" && !sl.tool) return true;
      if (selCard.category === "pokemon") return canEvolveOnto(selCard, sl, G.turn);
      return false;
    };

    const plActEl = document.getElementById("btlPlActive");
    plActEl.innerHTML = renderFieldCardHtml(G.player.active, false, isTargetable(G.player.active));
    plActEl.onclick = () => onPlayerSlotTap(true, -1);

    const plBenchEl = document.getElementById("btlPlBench");
    plBenchEl.innerHTML = Array.from({ length: 5 }).map((_, i) => `<div class="btl-bench-cell" data-pl-bench="${i}">${renderFieldCardHtml(G.player.bench[i] || null, true, isTargetable(G.player.bench[i]))}</div>`).join("");
    plBenchEl.querySelectorAll("[data-pl-bench]").forEach((el) => {
      const idx = Number(el.dataset.plBench);
      el.addEventListener("click", () => onPlayerSlotTap(false, idx));
    });

    document.getElementById("btlPlStats").innerHTML = `
      <span>サイド<b>${G.player.prizes.length}</b> / 山札<b>${G.player.deck.length}</b> / トラッシュ<b>${G.player.discard.length}</b></span>
      <span>${G.energyAttachedThisTurn ? "🔋エネ済" : "🔋エネ可"} / ${G.supporterUsedThisTurn ? "🧑サポ済" : "🧑サポ可"}</span>
    `;

    // 手札ストリップ（タップでアップ拡大プレビュー）
    const handEl = document.getElementById("btlHandStrip");
    handEl.innerHTML = G.player.hand.map((c, idx) => {
      const ti = TYPE_INFO[c.type] || TYPE_INFO[c.category === "energy" ? "エネルギー" : c.category === "support" ? "サポート" : c.category === "goods" ? "グッズ" : c.category === "tool" ? "ポケモンのどうぐ" : "無色"] || TYPE_INFO["無色"];
      const isSel = G.selectedHandUid === c.uid;
      const isSetupBasic = G.phase === "setup" && c.category === "pokemon" && (c.stage || "たね") === "たね";
      return `
        <div class="btl-hand-card${isSel ? " is-selected" : ""}${isSetupBasic ? " is-setup-glow" : ""}" data-hidx="${idx}" data-uid="${c.uid}" style="border-color:${ti.color};">
          ${c.photoUrl
            ? `<img src="${c.photoUrl}" alt="${esc(c.name)}" />`
            : `<div class="btl-hand-fb" style="background:${ti.bg};">
                 <div class="btl-hand-nm">${esc(c.name)}</div>
                 <div style="font-size:18px;margin:auto 0;">${ti.icon}</div>
                 <div class="btl-hand-sub">${c.category === "pokemon" ? `HP${c.hp}` : c.category === "energy" ? "エネ" : c.category === "support" ? "サポ" : c.category === "tool" ? "どうぐ" : "グッズ"}</div>
               </div>`}
          <div class="btl-hand-cap">${esc(c.name)}</div>
        </div>
      `;
    }).join("");
    handEl.querySelectorAll(".btl-hand-card").forEach((el) => {
      el.addEventListener("click", () => {
        // すでにエネ・進化の対象選択中で同じカードをもう1回押した場合は解除
        if (G.selectedHandUid && G.selectedHandUid === el.dataset.uid) {
          G.selectedHandUid = null;
          renderBattleArena();
          return;
        }
        openHandZoom(Number(el.dataset.hidx));
      });
    });

    const actBar = document.getElementById("btlActionBar");
    if (G.phase === "setup") {
      actBar.innerHTML = `<button id="btlConfirmSetupBtn" class="btl-act-btn is-primary" style="flex:1;" type="button" ${G.player.active && !aiBusy ? "" : "disabled"}>⚔️ 対戦スタート！（サイド6枚セット）</button>`;
      document.getElementById("btlConfirmSetupBtn").addEventListener("click", finishSetupAndBegin);
    } else if (G.phase === "over") {
      actBar.innerHTML = `
        <div style="flex:1;text-align:center;font-weight:900;color:#fff;font-size:13px;">${G.winner === "player" ? "🏆 あなたの勝利！" : "💀 AIの勝利…"}（${esc(G.winReason)}）</div>
        <button id="btlExitAfterWinBtn" class="btl-act-btn is-primary" type="button">ロビーへ戻る</button>
      `;
      document.getElementById("btlExitAfterWinBtn").addEventListener("click", () => {
        document.getElementById("btlArenaOverlay").classList.remove("is-open");
        openLobbyModal();
      });
    } else {
      const myTurn = G.activeSide === "player" && G.phase === "play" && !aiBusy;
      const canAtk = myTurn && G.player.active && !(G.turn === 1 && G.firstSide === "player");
      actBar.innerHTML = `
        <button id="btlBtnAttack" class="btl-act-btn is-attack" type="button" ${canAtk ? "" : "disabled"}>⚔️ ワザ</button>
        <button id="btlBtnRetreat" class="btl-act-btn" type="button" ${myTurn ? "" : "disabled"}>🏃 にげる</button>
        <button id="btlBtnManual" class="btl-act-btn" type="button" ${myTurn ? "" : "disabled"}>🛠️ 手動</button>
        <button id="btlBtnEndTurn" class="btl-act-btn is-end" type="button" ${myTurn ? "" : "disabled"}>⏭️ 番終了</button>
      `;
      document.getElementById("btlBtnAttack").addEventListener("click", openAttackPicker);
      document.getElementById("btlBtnRetreat").addEventListener("click", openRetreatPicker);
      document.getElementById("btlBtnManual").addEventListener("click", openManualAssistMenu);
      document.getElementById("btlBtnEndTurn").addEventListener("click", () => { addLog("あなたは番を終了した。", "info"); endTurn(); });
    }
  }

  /* ================= 汎用選択モーダル & スロット詳細 ================= */
  function openSelectModal(title, sub, options, allowCancel = true, onCancel = null) {
    const ov = document.getElementById("btlSelectModal");
    document.getElementById("btlSelectTitle").textContent = title;
    document.getElementById("btlSelectSub").textContent = sub || "";
    const list = document.getElementById("btlSelectList");
    list.innerHTML = options.map((opt, idx) => `
      <button type="button" class="btl-opt-row" data-idx="${idx}" ${opt.disabled ? "disabled" : ""}>
        ${opt.photoUrl ? `<img src="${opt.photoUrl}" class="btl-opt-thumb" />` : ""}
        <span style="flex:1;text-align:left;">${esc(opt.label)}</span>
      </button>
    `).join("");
    list.querySelectorAll(".btl-opt-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const opt = options[Number(btn.dataset.idx)];
        ov.classList.remove("is-open");
        if (opt && opt.onPick) opt.onPick();
      });
    });
    const closeBtn = document.getElementById("btlSelectCancelBtn");
    closeBtn.style.display = allowCancel ? "inline-flex" : "none";
    closeBtn.onclick = () => { ov.classList.remove("is-open"); if (onCancel) onCancel(); };
    ov.classList.add("is-open");
  }

  function openSlotInspector(slot, ownerKey, isActive) {
    const c = slot.card;
    const maxHp = getMaxHp(slot);
    const atks = (c.attacks || []).map((a) => `・${a.name}（エネ${a.cost} / ${a.damage}ダメ）${a.effect ? ` ${a.effect}` : ""}`).join("\n");
    const info = [
      `分類: ${c.stage || "たね"}（${c.type || "無色"}） / HP ${maxHp - slot.damage}/${maxHp}`,
      `弱点: ${c.weakness || "なし"} / にげる: ${c.retreat || 0} / サイド: ${c.prizeCount || 1}枚`,
      `エネルギー: ${slot.energies.length}個${slot.tool ? ` / どうぐ: ${slot.tool.name}` : ""}`,
      atks ? `\n【ワザ】\n${atks}` : ""
    ].filter(Boolean).join("\n");

    const opts = [];
    if (ownerKey === "player" && isActive && G.phase === "play" && G.activeSide === "player" && !aiBusy) {
      opts.push({ label: "⚔️ このポケモンのワザを使う", onPick: openAttackPicker });
      opts.push({ label: "🏃 にげる", onPick: openRetreatPicker });
    }
    opts.push({ label: "閉じる", onPick: () => {} });
    openSelectModal(`${c.name}（${ownerKey === "player" ? "自分" : "相手"}）`, info, opts, false);
  }

  /* ================= 対戦ロビー＆対戦データ管理モーダル ================= */
  function getUniqueDeckCardsInfo(choiceId) {
    if (!choiceId || !choiceId.startsWith("user:")) return [];
    const appState = loadAppState();
    const did = choiceId.slice(5);
    const ud = (appState.decks || []).find((x) => x.id === did);
    if (!ud) return [];
    const seen = new Set();
    const res = [];
    (ud.cards || []).forEach((dc) => {
      const bInfo = findBinderCard(appState, dc);
      const k = bInfo.photoKey || `name__${norm(bInfo.name)}`;
      if (seen.has(k)) return;
      seen.add(k);
      res.push({
        binder: bInfo,
        photoUrl: bInfo.photoKey ? (photoMap.get(bInfo.photoKey) || "") : "",
        spec: getCardSpec(bInfo)
      });
    });
    return res;
  }

  function refreshLobbyDeckStats() {
    const selVal = document.getElementById("btlPlayerDeckSelect").value;
    const statusBox = document.getElementById("btlDeckDataStatus");
    const scanBtn = document.getElementById("btlAiScanDeckBtn");
    const editBtn = document.getElementById("btlEditDeckSpecsBtn");
    if (!selVal.startsWith("user:")) {
      statusBox.textContent = "サンプルデッキは全60枚のワザ・HP・特殊グッズ（ふしぎなアメ・ペパー等）が設定済みです！";
      scanBtn.style.display = "none";
      editBtn.style.display = "none";
      return;
    }
    const items = getUniqueDeckCardsInfo(selVal);
    const scanned = items.filter((x) => x.spec.aiScanned).length;
    const withPhoto = items.filter((x) => Boolean(x.photoUrl) && !x.spec.aiScanned).length;
    const appState = loadAppState();
    const ud = (appState.decks || []).find((x) => x.id === selVal.slice(5));
    const totalCards = (ud?.cards || []).reduce((s, c) => s + (Number(c.count) || 0), 0);
    statusBox.innerHTML = `デッキ枚数：<b>${totalCards} / 60枚</b> ／ 対戦データ登録済：<b>${scanned} / ${items.length}種</b>` + (totalCards !== 60 ? ` <span style="color:#d97706;">（※60枚未満でもテスト対戦可）</span>` : "");
    scanBtn.style.display = "block";
    scanBtn.textContent = withPhoto > 0 ? `✨ 未読取の写真カード(${withPhoto}種)をGemini AIで一括読取` : `✨ デッキ内カードをGemini AIで再スキャン`;
    editBtn.style.display = "block";
  }

  async function runBulkScanDeckSpecs() {
    const selVal = document.getElementById("btlPlayerDeckSelect").value;
    if (!selVal.startsWith("user:")) return;
    if (!getApiKey()) return toast("先に「⚙️ 設定・保存」タブでGemini APIキーを登録してください");

    const items = getUniqueDeckCardsInfo(selVal);
    const targets = items.filter((x) => Boolean(x.photoUrl) && !x.spec.aiScanned);
    const listToScan = targets.length > 0 ? targets : items.filter((x) => Boolean(x.photoUrl));
    if (listToScan.length === 0) return toast("写真付きのカードがありません。下の「ワザ・HPを手動編集」から入力できます。");

    const btn = document.getElementById("btlAiScanDeckBtn");
    btn.disabled = true;
    let okCount = 0;
    try {
      for (let i = 0; i < listToScan.length; i++) {
        const it = listToScan[i];
        btn.textContent = `✨ AI読取中... (${i + 1}/${listToScan.length}) ${it.binder.name}`;
        try {
          const scanned = await scanBattleDataWithGemini(it.photoUrl, it.binder.name, it.binder.type);
          setCardSpec(it.binder, scanned);
          okCount++;
        } catch (err) {
          console.warn(err);
        }
        await wait(250);
      }
      toast(`${okCount}種のワザ・HPデータを読み取りました！`);
    } finally {
      btn.disabled = false;
      refreshLobbyDeckStats();
    }
  }

  function openDeckSpecsEditor() {
    const selVal = document.getElementById("btlPlayerDeckSelect").value;
    if (!selVal.startsWith("user:")) return;
    const items = getUniqueDeckCardsInfo(selVal);
    const body = document.getElementById("btlSpecsList");

    body.innerHTML = items.map((it, idx) => {
      const s = it.spec;
      const a0 = (s.attacks && s.attacks[0]) || { name: "ワザ1", cost: 1, damage: 40, effect: "" };
      const isPoke = s.category === "pokemon";
      const effOpts = Object.entries(TRAINER_EFFECT_LABELS).map(([k, v]) => `<option value="${k}" ${(s.trainerEffect || "none") === k ? "selected" : ""}>${esc(v)}</option>`).join("");

      return `
        <div class="btl-spec-row" data-idx="${idx}">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
            ${it.photoUrl ? `<img src="${it.photoUrl}" style="width:36px;aspect-ratio:63/88;object-fit:cover;border-radius:4px;" />` : `<div style="width:36px;aspect-ratio:63/88;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;">🃏</div>`}
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(it.binder.name)}</div>
              <select class="form-control sp-cat" style="padding:3px 6px;font-size:11px;margin-top:3px;">
                <option value="pokemon" ${s.category === "pokemon" ? "selected" : ""}>ポケモン</option>
                <option value="goods" ${s.category === "goods" ? "selected" : ""}>グッズ</option>
                <option value="tool" ${s.category === "tool" ? "selected" : ""}>ポケモンのどうぐ</option>
                <option value="support" ${s.category === "support" ? "selected" : ""}>サポート</option>
                <option value="stadium" ${s.category === "stadium" ? "selected" : ""}>スタジアム</option>
                <option value="energy" ${s.category === "energy" ? "selected" : ""}>エネルギー</option>
              </select>
            </div>
          </div>
          ${isPoke ? `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:4px;">
              <select class="form-control sp-stage" style="padding:4px;font-size:11px;">
                <option value="たね" ${(s.stage || "たね") === "たね" ? "selected" : ""}>たね</option>
                <option value="1進化" ${s.stage === "1進化" ? "selected" : ""}>1進化</option>
                <option value="2進化" ${s.stage === "2進化" ? "selected" : ""}>2進化</option>
              </select>
              <input type="number" class="form-control sp-hp" value="${s.hp || 80}" placeholder="HP" style="padding:4px;font-size:11px;" />
              <select class="form-control sp-prize" style="padding:4px;font-size:11px;">
                <option value="1" ${(s.prizeCount || 1) === 1 ? "selected" : ""}>サイド1</option>
                <option value="2" ${s.prizeCount === 2 ? "selected" : ""}>サイド2(ex)</option>
                <option value="3" ${s.prizeCount === 3 ? "selected" : ""}>サイド3(メガ)</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px;">
              <input type="text" class="form-control sp-from" value="${esc(s.evolvesFrom || "")}" placeholder="進化元(例:ラルトス)" style="padding:4px 6px;font-size:11px;" />
              <input type="number" class="form-control sp-ret" value="${s.retreat ?? 1}" min="0" max="5" placeholder="にげる" style="padding:4px 6px;font-size:11px;" />
            </div>
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:4px;">
              <input type="text" class="form-control sp-aname" value="${esc(a0.name)}" placeholder="ワザ名" style="padding:4px 6px;font-size:11px;" />
              <input type="number" class="form-control sp-acost" value="${a0.cost}" min="0" max="6" placeholder="エネ数" style="padding:4px;font-size:11px;" />
              <input type="number" class="form-control sp-admg" value="${a0.damage}" min="0" step="10" placeholder="ダメ" style="padding:4px;font-size:11px;" />
            </div>
          ` : s.category !== "energy" ? `
            <select class="form-control sp-eff" style="padding:4px 6px;font-size:11px;">${effOpts}</select>
          ` : `<div style="font-size:11px;color:#64748b;">エネルギーカード（手札から1ターン1枚貼れます）</div>`}
        </div>
      `;
    }).join("");

    document.getElementById("btlSaveSpecsBtn").onclick = () => {
      body.querySelectorAll(".btl-spec-row").forEach((row) => {
        const it = items[Number(row.dataset.idx)];
        const cat = row.querySelector(".sp-cat").value;
        const nextSpec = { ...it.spec, category: cat, aiScanned: true };
        if (cat === "pokemon") {
          if (row.querySelector(".sp-stage")) nextSpec.stage = row.querySelector(".sp-stage").value;
          if (row.querySelector(".sp-hp")) nextSpec.hp = Math.max(30, Number(row.querySelector(".sp-hp").value) || 80);
          if (row.querySelector(".sp-prize")) nextSpec.prizeCount = Number(row.querySelector(".sp-prize").value) || 1;
          if (row.querySelector(".sp-from")) nextSpec.evolvesFrom = row.querySelector(".sp-from").value.trim();
          if (row.querySelector(".sp-ret")) nextSpec.retreat = Math.max(0, Number(row.querySelector(".sp-ret").value) || 0);
          const aname = row.querySelector(".sp-aname") ? row.querySelector(".sp-aname").value.trim() : "たいあたり";
          const acost = row.querySelector(".sp-acost") ? Math.max(0, Number(row.querySelector(".sp-acost").value) || 0) : 1;
          const admg = row.querySelector(".sp-admg") ? Math.max(0, Number(row.querySelector(".sp-admg").value) || 0) : 40;
          const rest = (it.spec.attacks || []).slice(1);
          nextSpec.attacks = [{ name: aname || "ワザ", cost: acost, damage: admg, effect: "" }, ...rest];
        } else if (cat !== "energy" && row.querySelector(".sp-eff")) {
          nextSpec.trainerEffect = row.querySelector(".sp-eff").value;
        }
        setCardSpec(it.binder, nextSpec);
      });
      document.getElementById("btlSpecsModal").classList.remove("is-open");
      refreshLobbyDeckStats();
      toast("ワザ・HPデータを保存しました");
    };

    document.getElementById("btlSpecsModal").classList.add("is-open");
  }

  async function openLobbyModal(preselectUserDeckName = null) {
    loadBattleMeta();
    await loadPhotosFromDB();
    const choices = getAllDeckChoices();
    const pSel = document.getElementById("btlPlayerDeckSelect");
    const aSel = document.getElementById("btlAiDeckSelect");

    pSel.innerHTML = choices.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("");
    aSel.innerHTML = choices.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("");

    if (preselectUserDeckName) {
      const found = choices.find((c) => c.isUser && c.raw.name === preselectUserDeckName);
      if (found) pSel.value = found.id;
    }
    const defaultAi = choices.find((c) => !c.isUser);
    if (defaultAi) aSel.value = defaultAi.id;

    refreshLobbyDeckStats();
    document.getElementById("btlLobbyModal").classList.add("is-open");
  }
  function closeLobbyModal() { document.getElementById("btlLobbyModal").classList.remove("is-open"); }

  /* ================= CSS＆DOM自動注入 ================= */
  function injectStylesAndDom() {
    const style = document.createElement("style");
    style.textContent = `
      .btl-launch-card {
        background: linear-gradient(135deg, #1e293b 0%, #312e81 60%, #4338ca 100%);
        color: #fff; border-radius: 18px; padding: 13px 14px; margin-bottom: 12px;
        box-shadow: 0 8px 22px rgba(49, 46, 129, 0.25);
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
      }
      .btl-launch-btn {
        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
        color: #fff; font-weight: 900; font-size: 12.5px; padding: 8px 14px;
        border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
      }
      .btl-arena-overlay {
        position: fixed; inset: 0; bottom: var(--host-bottom-offset, 0px); z-index: 210;
        background: radial-gradient(circle at 50% 45%, #1e3a5f 0%, #0b1324 100%);
        color: #fff; display: none; flex-direction: column; overflow: hidden;
      }
      .btl-arena-overlay.is-open { display: flex; }
      .btl-top-bar {
        display: flex; align-items: center; justify-content: space-between; gap: 6px;
        padding: calc(6px + env(safe-area-inset-top)) 10px 4px; flex-shrink: 0;
      }
      .btl-pill {
        background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.22);
        border-radius: 9999px; padding: 4px 9px; font-size: 10.5px; font-weight: 800; white-space: nowrap;
      }
      .btl-turn-pill { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 900; white-space: nowrap; }
      .btl-turn-pill.is-player { background: #10b981; color: #fff; }
      .btl-turn-pill.is-ai { background: #f59e0b; color: #1e293b; }

      .btl-stats-strip {
        display: flex; align-items: center; justify-content: space-between;
        padding: 3px 12px; font-size: 10.5px; color: #cbd5e1; flex-shrink: 0;
      }
      .btl-stats-strip b { color: #fff; margin: 0 2px; }

      .btl-board-wrap {
        flex: 1; display: flex; flex-direction: column; justify-content: space-between;
        padding: 2px 8px; max-width: 520px; width: 100%; margin: 0 auto; min-height: 0;
      }
      .btl-bench-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
      .btl-bench-cell { width: 100%; }
      .btl-active-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 2px 0; }
      .btl-active-holder { width: 88px; flex-shrink: 0; position: relative; }

      .btl-slot-empty {
        aspect-ratio: 63 / 88; border-radius: 7px; border: 1.5px dashed rgba(255,255,255,0.24);
        background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.38);
        display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800;
      }
      .btl-pkm-card {
        aspect-ratio: 63 / 88; border-radius: 7px; border: 2px solid #94a3b8;
        position: relative; overflow: hidden; background: #0f172a;
        box-shadow: 0 4px 10px rgba(0,0,0,0.45);
      }
      .btl-pkm-card.is-target-glow { box-shadow: 0 0 0 3px #facc15, 0 0 14px #facc15; }
      .btl-pkm-card.is-fx-pulse { animation: btlPulseGlow 1.05s ease; }
      @keyframes btlPulseGlow {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56,189,248,0.9); }
        40% { transform: scale(1.09); box-shadow: 0 0 0 6px rgba(56,189,248,0.7), 0 0 22px rgba(56,189,248,0.95); }
        100% { transform: scale(1); box-shadow: 0 4px 10px rgba(0,0,0,0.45); }
      }
      .btl-active-holder.is-fx-shake { animation: btlHitShake 0.5s ease; }
      @keyframes btlHitShake {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-8px) rotate(-3deg); }
        35% { transform: translateX(8px) rotate(3deg); }
        55% { transform: translateX(-6px); }
        75% { transform: translateX(5px); }
      }
      .btl-dmg-popup {
        position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
        z-index: 30; pointer-events: none; text-align: center;
        font-size: 26px; font-weight: 900; color: #fef08a;
        text-shadow: 0 2px 0 #b91c1c, 0 -2px 0 #b91c1c, 2px 0 0 #b91c1c, -2px 0 0 #b91c1c, 0 6px 14px rgba(0,0,0,0.75);
        animation: btlDmgFloat 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .btl-dmg-weak { font-size: 11px; color: #fff; background: #dc2626; padding: 1px 6px; border-radius: 99px; margin-top: 2px; }
      @keyframes btlDmgFloat {
        0% { opacity: 0; transform: translate(-50%, -10%) scale(0.6); }
        20% { opacity: 1; transform: translate(-50%, -55%) scale(1.18); }
        75% { opacity: 1; transform: translate(-50%, -85%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -120%) scale(0.95); }
      }

      .btl-pkm-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .btl-pkm-fallback {
        width: 100%; height: 100%; padding: 3px; color: #0f172a;
        display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
      }
      .btl-fb-name { font-size: 8.5px; font-weight: 900; line-height: 1.15; overflow: hidden; max-height: 22px; }
      .btl-fb-icon { font-size: 18px; margin-top: 2px; }
      .btl-hp-badge {
        position: absolute; left: 2px; right: 2px; top: 2px; background: rgba(15,23,42,0.82);
        border-radius: 4px; padding: 1px 3px;
      }
      .btl-hp-text { font-size: 8.5px; font-weight: 900; text-align: center; line-height: 1.15; font-variant-numeric: tabular-nums; }
      .btl-hp-bar { height: 3px; background: rgba(255,255,255,0.2); border-radius: 99px; overflow: hidden; margin-top: 1px; }
      .btl-hp-fill { height: 100%; }
      .btl-dmg-chip {
        position: absolute; right: 2px; top: 22px; background: #ef4444; color: #fff;
        font-size: 8.5px; font-weight: 900; padding: 0 4px; border-radius: 99px;
      }
      .btl-tool-chip { position: absolute; left: 2px; top: 22px; font-size: 10px; }
      .btl-orbs {
        position: absolute; left: 2px; right: 2px; bottom: 2px; display: flex; flex-wrap: wrap; gap: 1px; justify-content: center;
      }
      .btl-orb {
        width: 13px; height: 13px; border-radius: 50%; font-size: 8px;
        display: inline-flex; align-items: center; justify-content: center; border: 1px solid #fff;
      }
      .btl-orb-more { font-size: 8px; font-weight: 900; background: #0f172a; padding: 0 3px; border-radius: 99px; }

      .btl-mid-divider {
        background: rgba(15,23,42,0.75); border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px; padding: 4px 9px; margin: 2px 0;
        display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px;
      }
      #btlLogTicker { flex: 1; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f8fafc; }

      .btl-hand-wrap {
        background: rgba(15,23,42,0.88); border-top: 1px solid rgba(255,255,255,0.14);
        padding: 6px 8px 4px; flex-shrink: 0;
      }
      .btl-hand-strip {
        display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch;
      }
      .btl-hand-card {
        width: 60px; flex-shrink: 0; aspect-ratio: 63 / 88; border-radius: 6px; border: 2px solid #94a3b8;
        position: relative; overflow: hidden; background: #1e293b; transition: transform 0.15s ease;
      }
      .btl-hand-card.is-selected { transform: translateY(-7px); box-shadow: 0 0 0 2px #facc15; }
      .btl-hand-card.is-setup-glow { box-shadow: 0 0 0 2px #34d399; }
      .btl-hand-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .btl-hand-fb { width: 100%; height: 100%; padding: 3px; color: #0f172a; display: flex; flex-direction: column; text-align: center; }
      .btl-hand-nm { font-size: 8px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .btl-hand-sub { font-size: 8px; font-weight: 800; color: #475569; }
      .btl-hand-cap {
        position: absolute; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.82);
        color: #fff; font-size: 7.5px; font-weight: 800; padding: 1px 2px; text-align: center;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      .btl-action-bar {
        display: flex; gap: 5px; padding: 5px 8px calc(8px + env(safe-area-inset-bottom));
        background: #0b1324; flex-shrink: 0;
      }
      .btl-act-btn {
        flex: 1; padding: 9px 6px; border-radius: 12px; font-weight: 900; font-size: 12px;
        background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.18);
      }
      .btl-act-btn:disabled { opacity: 0.35; }
      .btl-act-btn.is-primary { background: #10b981; border-color: #34d399; }
      .btl-act-btn.is-attack { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); border-color: #fb923c; }
      .btl-act-btn.is-end { background: #3b82f6; border-color: #60a5fa; }

      /* 手札アップ表示モーダル */
      .btl-hand-zoom-overlay {
        position: fixed; inset: 0; bottom: var(--host-bottom-offset, 0px); z-index: 238;
        background: rgba(9, 15, 30, 0.88); backdrop-filter: blur(7px);
        display: none; flex-direction: column; align-items: center; justify-content: center;
        padding: calc(14px + env(safe-area-inset-top)) 14px calc(16px + env(safe-area-inset-bottom));
      }
      .btl-hand-zoom-overlay.is-open { display: flex; }
      .btl-hz-stage { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; max-width: 420px; }
      .btl-hz-card {
        width: min(64vw, 248px); aspect-ratio: 63 / 88; border-radius: 14px;
        overflow: hidden; border: 2.5px solid rgba(255,255,255,0.45);
        box-shadow: 0 18px 40px rgba(0,0,0,0.68); background: #0f172a;
      }
      .btl-hz-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .btl-hz-nav {
        width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.18);
        color: #fff; font-size: 24px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .btl-hz-info {
        width: 100%; max-width: 340px; margin-top: 10px; padding: 10px 12px;
        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
        border-radius: 14px; color: #f8fafc; font-size: 11.5px; line-height: 1.45; max-height: 21dvh; overflow-y: auto;
      }
      .btl-hz-actions { display: flex; gap: 8px; width: 100%; max-width: 340px; margin-top: 10px; }

      /* ポケポケ風：3Dコイントス演出 */
      .btl-coin-overlay {
        position: fixed; inset: 0; z-index: 235;
        background: rgba(9, 15, 30, 0.84); backdrop-filter: blur(6px);
        display: none; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;
      }
      .btl-coin-overlay.is-open { display: flex; }
      .btl-coin-stage { width: 124px; height: 124px; perspective: 800px; margin-bottom: 18px; }
      .btl-coin-3d { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; }
      .btl-coin-face {
        position: absolute; inset: 0; border-radius: 50%; backface-visibility: hidden; -webkit-backface-visibility: hidden;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        border: 5px solid #fef08a; box-shadow: 0 12px 30px rgba(0,0,0,0.55), inset 0 0 18px rgba(255,255,255,0.45);
      }
      .btl-coin-front { background: radial-gradient(circle at 32% 30%, #fde047 0%, #f59e0b 65%, #b45309 100%); color: #451a03; }
      .btl-coin-back { background: radial-gradient(circle at 32% 30%, #e2e8f0 0%, #64748b 65%, #1e293b 100%); border-color: #cbd5e1; color: #f8fafc; transform: rotateY(180deg); }
      .btl-coin-3d.is-spin-heads { animation: btlCoinHeads 1.5s cubic-bezier(0.2, 0.8, 0.25, 1) forwards; }
      .btl-coin-3d.is-spin-tails { animation: btlCoinTails 1.5s cubic-bezier(0.2, 0.8, 0.25, 1) forwards; }
      @keyframes btlCoinHeads {
        0% { transform: translateY(0) scale(0.9) rotateY(0deg); }
        45% { transform: translateY(-75px) scale(1.22) rotateY(720deg); }
        100% { transform: translateY(0) scale(1) rotateY(1440deg); }
      }
      @keyframes btlCoinTails {
        0% { transform: translateY(0) scale(0.9) rotateY(0deg); }
        45% { transform: translateY(-75px) scale(1.22) rotateY(900deg); }
        100% { transform: translateY(0) scale(1) rotateY(1620deg); }
      }

      /* ポケポケ風：ターン終了・開始バナー */
      .btl-turn-banner-overlay {
        position: fixed; inset: 0; z-index: 232; pointer-events: none;
        display: none; align-items: center; justify-content: center;
      }
      .btl-turn-banner-overlay.is-open { display: flex; }
      .btl-turn-band {
        width: 100%; padding: 18px 16px; text-align: center; color: #fff;
        box-shadow: 0 12px 32px rgba(0,0,0,0.45);
        border-top: 2px solid rgba(255,255,255,0.65); border-bottom: 2px solid rgba(255,255,255,0.65);
        animation: btlBandSlide 0.34s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .btl-turn-band.is-your-turn { background: linear-gradient(90deg, rgba(16,185,129,0.2) 0%, #059669 22%, #0ea5e9 78%, rgba(14,165,233,0.2) 100%); }
      .btl-turn-band.is-ai-turn { background: linear-gradient(90deg, rgba(239,68,68,0.2) 0%, #dc2626 22%, #f97316 78%, rgba(249,115,22,0.2) 100%); }
      .btl-turn-band.is-end { background: linear-gradient(90deg, rgba(30,41,59,0.2) 0%, #1e293b 25%, #475569 75%, rgba(30,41,59,0.2) 100%); }
      .btl-turn-band-main { font-size: 26px; font-weight: 900; letter-spacing: 0.12em; text-shadow: 0 3px 10px rgba(0,0,0,0.35); }
      .btl-turn-band-sub { font-size: 12.5px; font-weight: 800; opacity: 0.94; margin-top: 2px; }
      @keyframes btlBandSlide {
        0% { opacity: 0; transform: scaleY(0.4) translateX(-40px); }
        100% { opacity: 1; transform: scaleY(1) translateX(0); }
      }

      /* AI行動・攻撃カットイン（タップで次へ送り可能） */
      .btl-cutin-overlay {
        position: fixed; inset: 0; z-index: 230;
        display: none; align-items: center; justify-content: center; padding: 20px;
        background: rgba(9, 15, 30, 0.42);
      }
      .btl-cutin-overlay.is-open { display: flex; }
      .btl-cutin-box {
        width: min(270px, 78vw); background: rgba(15, 23, 42, 0.95); color: #fff;
        border-radius: 20px; padding: 14px 14px 10px; text-align: center;
        border: 2px solid #38bdf8; box-shadow: 0 18px 40px rgba(0,0,0,0.62);
        animation: btlCutinPop 0.24s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .btl-cutin-box.is-attack { border-color: #f97316; background: linear-gradient(180deg, rgba(124,45,18,0.96) 0%, rgba(15,23,42,0.96) 100%); }
      .btl-cutin-box.is-ko { border-color: #ef4444; background: linear-gradient(180deg, rgba(127,29,29,0.96) 0%, rgba(15,23,42,0.96) 100%); }
      .btl-cutin-box.is-evolve { border-color: #facc15; }
      .btl-cutin-box.is-trainer { border-color: #a855f7; }
      .btl-cutin-box.is-energy { border-color: #14b8a6; }
      .btl-cutin-badge {
        display: inline-block; background: rgba(255,255,255,0.16); border-radius: 9999px;
        padding: 2px 10px; font-size: 11px; font-weight: 900; margin-bottom: 8px;
      }
      .btl-cutin-visual { width: 114px; aspect-ratio: 63 / 88; margin: 0 auto 9px; border-radius: 9px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.55); }
      .btl-cutin-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .btl-cutin-fb { width: 100%; height: 100%; border: 2px solid #fff; border-radius: 9px; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; }
      .btl-cutin-title { font-size: 14.5px; font-weight: 900; line-height: 1.3; }
      .btl-cutin-detail { font-size: 11.5px; color: #e2e8f0; font-weight: 700; margin-top: 3px; }
      .btl-cutin-tap-hint { font-size: 9.5px; color: rgba(255,255,255,0.48); margin-top: 7px; font-weight: 700; }
      @keyframes btlCutinPop {
        0% { opacity: 0; transform: scale(0.84) translateY(14px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }

      .btl-opt-row {
        width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px;
        background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 11px;
        font-size: 12.5px; font-weight: 800; color: #1e293b;
      }
      .btl-opt-row:disabled { opacity: 0.45; }
      .btl-opt-thumb { width: 32px; aspect-ratio: 63/88; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
      .btl-spec-row { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; }
    `;
    document.head.appendChild(style);

    const decksView = document.getElementById("view-decks");
    const decksList = document.getElementById("decksListContainer");
    if (decksView && decksList && !document.getElementById("btlLaunchBanner")) {
      const card = document.createElement("div");
      card.id = "btlLaunchBanner";
      card.className = "btl-launch-card";
      card.innerHTML = `
        <div style="min-width:0;">
          <div style="font-weight:900;font-size:14px;">⚔️ オフラインAI対戦</div>
          <div style="font-size:11px;color:#c7d2fe;">本家60枚・サイド6枚・手札拡大＆特殊効果対応</div>
        </div>
        <button id="btlOpenLobbyBtn" class="btl-launch-btn" type="button">対戦する</button>
      `;
      decksView.insertBefore(card, decksList);
      card.querySelector("#btlOpenLobbyBtn").addEventListener("click", () => openLobbyModal());
    }

    const pdsBar = document.querySelector("#pocketDeckSheet .pds-action-bar");
    if (pdsBar && !document.getElementById("pdsBattleBtn")) {
      const b = document.createElement("button");
      b.id = "pdsBattleBtn";
      b.type = "button";
      b.className = "pds-edit-pill";
      b.style.cssText = "background:#fee2e2;border-color:#ef4444;color:#b91c1c;";
      b.textContent = "⚔️ AI対戦";
      b.addEventListener("click", () => {
        const titleEl = document.getElementById("pdsDeckTitleBar");
        openLobbyModal(titleEl ? titleEl.textContent.trim() : null);
      });
      pdsBar.appendChild(b);
    }

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <!-- 対戦ロビーモーダル -->
      <div id="btlLobbyModal" class="modal-backdrop" style="z-index:200;">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">⚔️ AI対戦ロビー（本家60枚ルール）</h3>
            <button id="btlCloseLobbyBtn" class="modal-close-x" type="button">✕</button>
          </div>
          <div class="form-group">
            <label>あなたのデッキ</label>
            <select id="btlPlayerDeckSelect" class="form-control"></select>
          </div>
          <div id="btlDeckDataStatus" style="font-size:11.5px;background:#f1f5f9;padding:7px 10px;border-radius:10px;margin-bottom:8px;color:#334155;"></div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
            <button id="btlAiScanDeckBtn" class="btn-ai-pill" type="button" style="padding:8px 12px;font-size:12px;width:100%;">✨ Gemini AIでワザ・HPを一括読取</button>
            <button id="btlEditDeckSpecsBtn" class="btn-pill-secondary" type="button" style="padding:7px 12px;justify-content:center;width:100%;">📝 デッキ内カードのワザ・HPを確認・手動編集</button>
          </div>
          <div class="form-group">
            <label>対戦相手（オフラインAI）のデッキ</label>
            <select id="btlAiDeckSelect" class="form-control"></select>
          </div>
          <button id="btlStartMatchBtn" class="btn-save-solid" type="button" style="background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);padding:12px;">⚔️ 対戦スタート！</button>
        </div>
      </div>

      <!-- ワザ・HP手動編集モーダル -->
      <div id="btlSpecsModal" class="modal-backdrop" style="z-index:225;">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">📝 カードのワザ・HP設定</h3>
            <button id="btlCloseSpecsBtn" class="modal-close-x" type="button">✕</button>
          </div>
          <div id="btlSpecsList" style="max-height:58dvh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"></div>
          <button id="btlSaveSpecsBtn" class="btn-save-solid" type="button">設定を保存</button>
        </div>
      </div>

      <!-- バトル盤面オーバーレイ -->
      <div id="btlArenaOverlay" class="btl-arena-overlay">
        <div class="btl-top-bar">
          <button id="btlQuitBtn" class="btl-pill" type="button">✕ 終了</button>
          <span id="btlTurnBadge" class="btl-turn-pill is-player">準備中</span>
          <div style="display:flex;gap:4px;">
            <button id="btlSpeedBtn" class="btl-pill" type="button">🐌 超ゆっくり</button>
            <button id="btlOpenLogBtn" class="btl-pill" type="button">📜 ログ</button>
          </div>
        </div>
        <div id="btlAiStats" class="btl-stats-strip"></div>
        <div class="btl-board-wrap">
          <div id="btlAiBench" class="btl-bench-row"></div>
          <div class="btl-active-row"><div id="btlAiActive" class="btl-active-holder"></div></div>
          <div class="btl-mid-divider">
            <span id="btlLogTicker">バトル準備中...</span>
            <span id="btlStadiumChip" style="font-size:10px;color:#6ee7b7;font-weight:800;white-space:nowrap;"></span>
          </div>
          <div class="btl-active-row"><div id="btlPlActive" class="btl-active-holder"></div></div>
          <div id="btlPlBench" class="btl-bench-row"></div>
        </div>
        <div id="btlPlStats" class="btl-stats-strip"></div>
        <div class="btl-hand-wrap"><div id="btlHandStrip" class="btl-hand-strip"></div></div>
        <div id="btlActionBar" class="btl-action-bar"></div>
      </div>

      <!-- 手札拡大プレビューモーダル -->
      <div id="btlHandZoomOverlay" class="btl-hand-zoom-overlay">
        <div id="btlHzPos" style="font-size:11.5px;font-weight:800;color:#cbd5e1;margin-bottom:8px;">手札 1 / 7</div>
        <div id="btlHzStage" class="btl-hz-stage">
          <button id="btlHzPrevBtn" class="btl-hz-nav" type="button">‹</button>
          <div id="btlHzCardBox" class="btl-hz-card"></div>
          <button id="btlHzNextBtn" class="btl-hz-nav" type="button">›</button>
        </div>
        <div id="btlHzInfo" class="btl-hz-info"></div>
        <div class="btl-hz-actions">
          <button id="btlHzCloseBtn" class="btl-act-btn" type="button">閉じる</button>
          <button id="btlHzUseBtn" class="btl-act-btn is-primary" style="flex:2;" type="button">このカードを使う</button>
        </div>
      </div>

      <!-- 3Dコイントス演出 -->
      <div id="btlCoinOverlay" class="btl-coin-overlay">
        <div class="btl-coin-stage">
          <div id="btlCoin3d" class="btl-coin-3d">
            <div class="btl-coin-face btl-coin-front">
              <div style="font-size:34px;line-height:1;">⚡</div>
              <div style="font-size:15px;font-weight:900;margin-top:3px;">表・先攻</div>
            </div>
            <div class="btl-coin-face btl-coin-back">
              <div style="font-size:32px;line-height:1;">🔮</div>
              <div style="font-size:15px;font-weight:900;margin-top:3px;">裏・後攻</div>
            </div>
          </div>
        </div>
        <div id="btlCoinTitle" style="font-size:19px;font-weight:900;color:#fff;margin-bottom:6px;">先攻・後攻を決めています...</div>
        <div id="btlCoinSub" style="font-size:12px;color:#cbd5e1;font-weight:700;max-width:300px;"></div>
      </div>

      <!-- ターン終了・開始バナー演出 -->
      <div id="btlTurnBannerOverlay" class="btl-turn-banner-overlay">
        <div id="btlTurnBannerBand" class="btl-turn-band is-your-turn">
          <div id="btlTurnBannerMain" class="btl-turn-band-main">YOUR TURN</div>
          <div id="btlTurnBannerSub" class="btl-turn-band-sub">あなたの番</div>
        </div>
      </div>

      <!-- AI行動・ワザカットイン -->
      <div id="btlCutinOverlay" class="btl-cutin-overlay">
        <div id="btlCutinCard" class="btl-cutin-box"></div>
      </div>

      <!-- 選択・詳細モーダル -->
      <div id="btlSelectModal" class="modal-backdrop" style="z-index:240;">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 id="btlSelectTitle" class="modal-title">選択</h3>
            <button id="btlSelectCancelBtn" class="modal-close-x" type="button">✕</button>
          </div>
          <div id="btlSelectSub" style="font-size:12px;color:#475569;white-space:pre-line;margin-bottom:10px;"></div>
          <div id="btlSelectList" style="max-height:55dvh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>
        </div>
      </div>

      <!-- バトルログモーダル -->
      <div id="btlLogModal" class="modal-backdrop" style="z-index:245;">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">📜 バトルログ</h3>
            <button id="btlCloseLogBtn" class="modal-close-x" type="button">✕</button>
          </div>
          <div id="btlLogBody" style="max-height:60dvh;overflow-y:auto;display:flex;flex-direction:column;gap:5px;font-size:12px;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // イベント結線
    document.getElementById("btlCloseLobbyBtn").addEventListener("click", closeLobbyModal);
    document.getElementById("btlPlayerDeckSelect").addEventListener("change", refreshLobbyDeckStats);
    document.getElementById("btlAiScanDeckBtn").addEventListener("click", runBulkScanDeckSpecs);
    document.getElementById("btlEditDeckSpecsBtn").addEventListener("click", openDeckSpecsEditor);
    document.getElementById("btlCloseSpecsBtn").addEventListener("click", () => document.getElementById("btlSpecsModal").classList.remove("is-open"));
    document.getElementById("btlStartMatchBtn").addEventListener("click", () => {
      startMatch(document.getElementById("btlPlayerDeckSelect").value, document.getElementById("btlAiDeckSelect").value);
    });

    // 速度3段階切替
    document.getElementById("btlSpeedBtn").addEventListener("click", () => {
      if (aiSpeedMode === "superslow") aiSpeedMode = "slow";
      else if (aiSpeedMode === "slow") aiSpeedMode = "normal";
      else aiSpeedMode = "superslow";
      renderBattleArena();
      const label = aiSpeedMode === "superslow" ? "🐌 超ゆっくり（じっくり確認）" : aiSpeedMode === "slow" ? "🐢 ゆっくり" : "🐇 標準";
      toast(`演出速度：${label}`);
    });

    // カットインをタップで即送り
    document.getElementById("btlCutinOverlay").addEventListener("click", () => {
      if (cutinSkipResolver) cutinSkipResolver();
    });

    // 手札アップ表示の操作（ボタン＆左右スワイプ）
    document.getElementById("btlHzCloseBtn").addEventListener("click", closeHandZoom);
    document.getElementById("btlHzPrevBtn").addEventListener("click", () => { if (handZoomIdx > 0) { handZoomIdx--; renderHandZoom(); } });
    document.getElementById("btlHzNextBtn").addEventListener("click", () => { if (G && handZoomIdx < G.player.hand.length - 1) { handZoomIdx++; renderHandZoom(); } });

    const hzStage = document.getElementById("btlHzStage");
    let hzStartX = 0;
    hzStage.addEventListener("touchstart", (e) => { if (e.touches.length === 1) hzStartX = e.touches[0].clientX; }, { passive: true });
    hzStage.addEventListener("touchend", (e) => {
      const endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : hzStartX;
      const dx = endX - hzStartX;
      if (dx < -45 && G && handZoomIdx < G.player.hand.length - 1) { handZoomIdx++; renderHandZoom(); }
      else if (dx > 45 && handZoomIdx > 0) { handZoomIdx--; renderHandZoom(); }
    });

    document.getElementById("btlQuitBtn").addEventListener("click", () => {
      matchSessionId++;
      aiBusy = false;
      if (cutinSkipResolver) cutinSkipResolver();
      closeHandZoom();
      document.getElementById("btlCoinOverlay").classList.remove("is-open");
      document.getElementById("btlTurnBannerOverlay").classList.remove("is-open");
      document.getElementById("btlCutinOverlay").classList.remove("is-open");
      document.getElementById("btlArenaOverlay").classList.remove("is-open");
      G = null;
    });
    document.getElementById("btlOpenLogBtn").addEventListener("click", () => {
      const lb = document.getElementById("btlLogBody");
      lb.innerHTML = (G?.logs || []).map((l) => `<div style="padding:5px 8px;border-radius:8px;background:${l.kind === "ko" ? "#fee2e2" : l.kind === "attack" ? "#ffedd5" : l.kind === "turn" ? "#e0f2fe" : "#f8fafc"};font-weight:${l.kind === "turn" || l.kind === "win" ? "900" : "600"};">${esc(l.msg)}</div>`).join("");
      document.getElementById("btlLogModal").classList.add("is-open");
    });
    document.getElementById("btlCloseLogBtn").addEventListener("click", () => document.getElementById("btlLogModal").classList.remove("is-open"));
  }

  loadBattleMeta();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectStylesAndDom);
  else injectStylesAndDom();
})();
