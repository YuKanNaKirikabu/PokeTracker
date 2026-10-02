import { RARITY_ICONS, TYPE_ICONS } from "../config/packs.js";
import {
    GAME_POKEDEXES,
    POKEDEX_DESCRIPTIONS,
    POKEDEX_RAW,
    POKEDEX_TRAINER_INCLUDES,
} from "../config/pokedex.js";
import { getCurrentLanguage, t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { formatCardCode, formatCardId, renderCardTypeBadge } from "./cards.js";

let POKEDEX_CACHE = null;
let POKEDEX_LOOKUP = null;
const POKEDEX_TYPE_CACHE = new Map();
const GAME_POKEDEX_CACHE = new Map();
const POKEDEX_CARD_CACHE = new Map();
const GAME_POKEDEX_LOADING = new Map();
let POKEDEX_NAMES_LOADING = null;

const POKEDEX_VALIDATION_ANCHORS = [
  { number: 1, nameEn: "Bulbasaur" },
  { number: 438, nameEn: "Bonsly" },
  { number: 439, nameEn: "Mime Jr." },
  { number: 827, nameEn: "Nickit" },
  { number: 828, nameEn: "Thievul" },
  { number: 1025, nameEn: "Pecharunt" },
];

function resolveDisplayName(nameEn, nameRu) {
  const safeNameEn = String(nameEn || "").trim();
  const safeNameRu = String(nameRu || "").trim();
  if (!safeNameRu) {
    return safeNameEn;
  }
  return safeNameRu;
}

export function getPokemonDisplayName(entryOrNameEn, maybeNameRu) {
  const lang = getCurrentLanguage();
  const nameEn = typeof entryOrNameEn === "object"
    ? String(entryOrNameEn?.nameEn || "").trim()
    : String(entryOrNameEn || "").trim();
  const nameRu = typeof entryOrNameEn === "object"
    ? String(entryOrNameEn?.nameRu || "").trim()
    : String(maybeNameRu || "").trim();

  if (lang === "ru") {
    const resolved = resolveDisplayName(nameEn, nameRu);
    return resolved || nameEn;
  }

  return nameEn || resolveDisplayName(nameEn, nameRu);
}

export function normalizePokemonName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

export function tokenizePokemonName(name) {
  return String(name || "")
    .toLowerCase()
    // Keep hyphenated Pokemon as one lexical unit (e.g. Porygon-Z, Ho-Oh).
    .replace(/-/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizePokedexType(typeRaw) {
  const normalized = String(typeRaw || "").trim().toUpperCase();
  if (!normalized) return null;
  const aliases = {
    ELECTRIC: "LIGHTNING",
    LIGHTNING: "LIGHTNING",
    DARK: "DARKNESS",
    DARKNESS: "DARKNESS",
    STEEL: "METAL",
    METAL: "METAL",
    FAIRY: "PSYCHIC",
    ICE: "WATER",
    GROUND: "FIGHTING",
    ROCK: "FIGHTING",
    POISON: "DARKNESS",
    BUG: "GRASS",
    FLYING: "COLORLESS",
    NORMAL: "COLORLESS",
  };
  return aliases[normalized] || normalized;
}

export function parsePokedexTypes(typeRaw) {
  if (!typeRaw) return null;
  const parts = String(typeRaw)
    .split(/[\/,&]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(normalizePokedexType)
    .filter(Boolean);
  return parts.length ? parts : null;
}

export function parsePokedexText(raw, padLength = 4) {
  return raw.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#"))
    .map((line) => {
      const matchWithRu = line.match(/^#(\d{3,4})\s+(.+?)\s+\|\s+(.+)$/);
      if (matchWithRu) {
        const number = Number(matchWithRu[1]);
        const nameEn = String(matchWithRu[2] || "").trim();
        const parsedNameRu = String(matchWithRu[3] || "").trim();
        return {
          number,
          numberStr: String(number).padStart(padLength, "0"),
          nameEn,
          nameRu: resolveDisplayName(nameEn, parsedNameRu),
          types: null,
        };
      }
      const matchWithoutRu = line.match(/^#(\d{3,4})\s+(.+?)(?:\s+-\s+(.+))?$/);
      if (matchWithoutRu) {
        const number = Number(matchWithoutRu[1]);
        const nameEn = String(matchWithoutRu[2] || "").trim();
        const types = parsePokedexTypes(matchWithoutRu[3]);
        return {
          number,
          numberStr: String(number).padStart(padLength, "0"),
          nameEn,
          nameRu: null,
          types,
        };
      }
      return null;
    })
    .filter(Boolean);
}

export function parsePokedexRaw() {
  return parsePokedexText(POKEDEX_RAW, 4);
}

function rebuildPokedexLookup(list) {
  POKEDEX_CACHE = list;
  POKEDEX_LOOKUP = new Map();
  POKEDEX_CACHE.forEach((entry) => {
    POKEDEX_LOOKUP.set(normalizePokemonName(entry.nameEn), entry);
  });
}

function isValidMasterPokedexList(list) {
  if (!Array.isArray(list) || list.length < 1025) return false;

  for (let i = 0; i < 1025; i += 1) {
    const entry = list[i];
    const expectedNumber = i + 1;
    if (!entry || entry.number !== expectedNumber) return false;
  }

  return POKEDEX_VALIDATION_ANCHORS.every((anchor) => {
    const entry = list[anchor.number - 1];
    if (!entry) return false;
    return normalizePokemonName(entry.nameEn) === normalizePokemonName(anchor.nameEn);
  });
}

export async function loadPokedexNamesFromFile() {
  if (POKEDEX_NAMES_LOADING) return POKEDEX_NAMES_LOADING;

  POKEDEX_NAMES_LOADING = (async () => {
    try {
      const response = await fetch("Lists/1025.txt");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      const list = parsePokedexText(raw, 4);
      if (isValidMasterPokedexList(list)) {
        rebuildPokedexLookup(list);
      } else {
        console.warn("Pokedex names list rejected: invalid or shifted mapping");
      }
    } catch (err) {
      console.warn("Pokedex names load failed:", err.message);
    }
  })();

  return POKEDEX_NAMES_LOADING;
}

export function getPokedexList() {
  if (!POKEDEX_CACHE) {
    rebuildPokedexLookup(parsePokedexRaw());
  }
  return POKEDEX_CACHE;
}

export function getPokedexEntryByName(nameEn) {
  getPokedexList();
  return POKEDEX_LOOKUP?.get(normalizePokemonName(nameEn)) || null;
}

export function getGamePokedexConfig(gameId) {
  return GAME_POKEDEXES.find((game) => game.id === gameId);
}

export async function loadGamePokedexes() {
  const tasks = GAME_POKEDEXES.map(async (game) => {
    try {
      const response = await fetch(game.listPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      const list = parsePokedexText(raw, 3);
      const byName = new Set(list.map((entry) => normalizePokemonName(entry.nameEn)));
      GAME_POKEDEX_CACHE.set(game.id, { list, byName, loaded: true });
    } catch (err) {
      console.warn(`Game pokedex load failed for ${game.id}:`, err.message);
      GAME_POKEDEX_CACHE.set(game.id, { list: [], byName: new Set(), loaded: true });
    }
  });
  await Promise.all(tasks);
}

export async function ensureGamePokedexLoaded(gameId) {
  const cached = GAME_POKEDEX_CACHE.get(gameId);
  if (cached?.loaded) return cached;

  if (GAME_POKEDEX_LOADING.has(gameId)) {
    return GAME_POKEDEX_LOADING.get(gameId);
  }

  const game = getGamePokedexConfig(gameId);
  if (!game) {
    const empty = { list: [], byName: new Set(), loaded: true };
    GAME_POKEDEX_CACHE.set(gameId, empty);
    return empty;
  }

  const loader = (async () => {
    try {
      const response = await fetch(game.listPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.text();
      const list = parsePokedexText(raw, 3);
      const byName = new Set(list.map((entry) => normalizePokemonName(entry.nameEn)));
      const data = { list, byName, loaded: true };
      GAME_POKEDEX_CACHE.set(gameId, data);
      return data;
    } catch (err) {
      console.warn(`Game pokedex load failed for ${gameId}:`, err.message);
      const fallback = { list: [], byName: new Set(), loaded: true };
      GAME_POKEDEX_CACHE.set(gameId, fallback);
      return fallback;
    } finally {
      GAME_POKEDEX_LOADING.delete(gameId);
    }
  })();

  GAME_POKEDEX_LOADING.set(gameId, loader);
  return loader;
}

export function getGamePokedexData(gameId) {
  if (!GAME_POKEDEX_CACHE.has(gameId)) {
    GAME_POKEDEX_CACHE.set(gameId, { list: [], byName: new Set(), loaded: false });
  }
  return GAME_POKEDEX_CACHE.get(gameId);
}

export function getGamePokedexMarks(gameId, versionIndex = 0) {
  const config = getGamePokedexConfig(gameId);
  const hasMultipleVersions = config?.icons?.length > 1;
  const key = hasMultipleVersions ? `${gameId}-v${versionIndex}` : gameId;
  const record = state.ui.gamePokedex?.[key] || {};
  return {
    blue: new Set(record.blue || []),
    red: new Set(record.red || []),
    sort: record.sort || "found",
  };
}

export function setGamePokedexMarks(gameId, marks, versionIndex = 0) {
  if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
  const config = getGamePokedexConfig(gameId);
  const hasMultipleVersions = config?.icons?.length > 1;
  const key = hasMultipleVersions ? `${gameId}-v${versionIndex}` : gameId;
  state.ui.gamePokedex[key] = {
    blue: [...marks.blue],
    red: [...marks.red],
    sort: marks.sort || "found",
  };
}

export function isPokemonMarkedInGame(nameEn, gameId, versionIndex = null) {
  const key = normalizePokemonName(nameEn);
  const data = getGamePokedexData(gameId);
  if (!data.byName.has(key)) return false;

  if (versionIndex !== null) {
    const marks = getGamePokedexMarks(gameId, versionIndex);
    return marks.blue.has(key) || marks.red.has(key);
  }

  const config = getGamePokedexConfig(gameId);
  const versionCount = config?.icons?.length || 1;
  for (let i = 0; i < versionCount; i += 1) {
    const marks = getGamePokedexMarks(gameId, i);
    if (marks.blue.has(key) || marks.red.has(key)) {
      return true;
    }
  }
  return false;
}

export function renderGameIcons(nameEn) {
  if (!GAME_POKEDEXES || GAME_POKEDEXES.length === 0) return "";
  const visibleIcons = [];
  GAME_POKEDEXES.forEach((game) => {
    const data = getGamePokedexData(game.id);
    if (data.list.length === 0) return;
    const inGame = data.byName.has(normalizePokemonName(nameEn));
    if (!inGame) return;

    game.icons.forEach((icon, versionIndex) => {
      const isMarked = isPokemonMarkedInGame(nameEn, game.id, versionIndex);
      const className = isMarked ? "active" : "";
      visibleIcons.push(`<img class="game-icon ${className}" loading="lazy" decoding="async" src="${icon.src}" alt="${icon.alt}" />`);
    });
  });
  if (visibleIcons.length === 0) return "";
  return `<div class="pokedex-game-icons">${visibleIcons.join("")}</div>`;
}

export function formatDexNumber(number) {
  return String(number).padStart(4, "0");
}

export function getPokedexRegion(number) {
  if (number >= 1 && number <= 151) return "Канто";
  if (number >= 152 && number <= 251) return "Джото";
  if (number >= 252 && number <= 386) return "Хоэнн";
  if (number >= 387 && number <= 493) return "Синно";
  if (number >= 494 && number <= 649) return "Юнова";
  if (number >= 650 && number <= 721) return "Калос";
  if (number >= 722 && number <= 809) return "Алола";
  if (number >= 810 && number <= 898) return "Галар / Хисуи";
  return "Палдея";
}

export function getPokemonCardMatches(nameEn) {
  if (!state.data?.cards?.length) return [];
  const key = normalizePokemonName(nameEn);
  if (POKEDEX_CARD_CACHE.has(key)) return POKEDEX_CARD_CACHE.get(key);
  const baseTokens = tokenizePokemonName(nameEn);
  const includeNames = (POKEDEX_TRAINER_INCLUDES[nameEn] || []).map((value) => value.toLowerCase());
  const matches = state.data.cards.filter((card) => {
    if (includeNames.length) {
      const lowerName = String(card.name || "").toLowerCase();
      if (includeNames.some((value) => lowerName.includes(value))) {
        return true;
      }
    }
    const tokens = tokenizePokemonName(card.name);
    if (tokens.length < baseTokens.length) return false;
    for (let i = 0; i <= tokens.length - baseTokens.length; i += 1) {
      let ok = true;
      for (let j = 0; j < baseTokens.length; j += 1) {
        if (tokens[i + j] !== baseTokens[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  });
  POKEDEX_CARD_CACHE.set(key, matches);
  return matches;
}

export function getPokemonTypes(nameEn) {
  const key = normalizePokemonName(nameEn);
  if (POKEDEX_TYPE_CACHE.has(key)) return POKEDEX_TYPE_CACHE.get(key);
  const types = new Set();
  getPokemonCardMatches(nameEn).forEach((card) => {
    if (card.type) {
      const normalized = String(card.type).trim().toUpperCase();
      if (!normalized) return;
      if (["ITEM", "TOOL", "SUPPORTER"].includes(normalized)) return;
      types.add(normalized);
    }
  });
  let list = types.size ? [...types] : [];
  if (!list.length) {
    const lookup = POKEDEX_LOOKUP?.get(key);
    if (lookup?.types?.length) {
      list = [...lookup.types];
    }
  }
  if (!list.length) list = ["COLORLESS"];
  POKEDEX_TYPE_CACHE.set(key, list);
  return list;
}

export function getPokemonArtwork(nameEn) {
  const matches = getPokemonCardMatches(nameEn);
  return matches[0]?.image || null;
}

export function sanitizePokemonFileName(nameEn) {
  return String(nameEn || "").replace(/[<>:"/\\|?*]/g, "").trim();
}

export function getPokedexIconPath(entry) {
  if (!entry?.number || !entry?.nameEn) return null;
  if (entry.number > 1025) return null;
  const safeName = sanitizePokemonFileName(entry.nameEn);
  return `https://storage.yandexcloud.net/poketracker/Images/Pokedex/0001-1025 Original/${entry.numberStr}_${encodeURIComponent(safeName)}.png`;
}

export function getPokedexSpriteFallback(entry) {
  if (!entry?.number) return null;
  const number = Number(entry.number);
  if (!Number.isFinite(number) || number < 1) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
}

export function renderPokemonTypeIcons(types, sizeClass = "") {
  const safeTypes = types && types.length ? types : ["COLORLESS"];
  const uniqueTypes = [...new Set(safeTypes.map((type) => String(type).trim().toUpperCase()))];
  return uniqueTypes
    .map((type) => {
      const icon = TYPE_ICONS[type] || TYPE_ICONS.COLORLESS;
      return `<span class="icon-badge type-badge ${sizeClass}"><img src="${icon}" alt="${type}" /></span>`;
    })
    .join("");
}

function getCardImageFallback(url) {
  if (!url) return "";
  if (url.includes("/Images/Packs/MEGA SHINE/")) {
    return url.replace("/Images/Packs/MEGA SHINE/", "/Images/Packs/Mega Shine/");
  }
  return "";
}

export function renderPokedexCardItem(card) {
  const cardId = formatCardId(card);
  const owned = state.owned.has(cardId);
  const wished = state.wishlist?.has(cardId) ?? false;
  const displayCode = formatCardCode(card);
  const rarityIcon = RARITY_ICONS[card.rarity] || "https://storage.yandexcloud.net/poketracker/Images/Rarity/DIAMOND1.png";
  const safeId = cardId.replace(/[^a-z0-9_-]/gi, "");
  const gradientId = `heartGradient-${safeId}`;
  const heartFill = wished ? `url(#${gradientId})` : "none";
  const heartStroke = wished ? "rgba(255, 120, 160, 0.95)" : "rgba(255, 255, 255, 0.75)";
  const fallbackImage = getCardImageFallback(card.image);
  const fallbackAttr = fallbackImage ? ` data-fallback-src="${fallbackImage}"` : "";
  const wishlistHtml = !owned
    ? `
      <button class="wishlist-heart ${wished ? "active" : ""}" data-card-id="${cardId}" aria-label="${t("wishlist.aria")}" type="button">
        <svg viewBox="0 0 24 24" class="heart-icon" aria-hidden="true" style="--heart-fill: ${heartFill}; --heart-stroke: ${heartStroke};">
          <defs>
            <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ff6b6b" />
              <stop offset="100%" stop-color="#ff2e79" />
            </linearGradient>
          </defs>
          <path d="M12 21s-7.5-4.35-9.5-8.35C1 9 3 5 6.8 5c2 0 3.4 1 4.2 2.3C11.8 6 13.2 5 15.2 5 19 5 21 9 21.5 12.65 19.5 16.65 12 21 12 21z" />
        </svg>
      </button>
    `
    : "";
  return `
    <div class="card-item card-item--compact pokedex-card" data-pack="${card.pack}" data-card-id="${cardId}">
      <div class="pokeball ${owned ? "collected" : ""}" data-card-id="${cardId}"></div>
      ${wishlistHtml}
      <img src="${card.image}" alt="${card.name}" loading="lazy" decoding="async"${fallbackAttr} />
      <div class="card-meta">
        <h3>${card.name}</h3>
        <span>${displayCode}</span>
        <div class="meta-icons">
          <span class="icon-badge rarity-badge"><img src="${rarityIcon}" alt="${card.rarity}" /></span>
          ${renderCardTypeBadge(card)}
        </div>
      </div>
    </div>
  `;
}

export function renderPokedexCards(cards) {
  if (!cards.length) {
    return `<div class="pokedex-empty">${t("pokedex.cardsNotFound")}</div>`;
  }
  return `
    <div class="pokedex-card-strip" id="pokedexCardStrip">
      ${cards.map(renderPokedexCardItem).join("")}
    </div>
  `;
}

export function getPokedexDescription(entry) {
  const desc = POKEDEX_DESCRIPTIONS[entry.number];
  if (!desc) {
    return { common: t("pokedex.descriptionFallback") };
  }
  return desc;
}

export function resolvePokedexGender(desc) {
  const current = state.ui.pokedexGender;
  if (desc.male || desc.female) {
    if (current === "male" && desc.male) return "male";
    if (current === "female" && desc.female) return "female";
    return desc.male ? "male" : "female";
  }
  return "common";
}

export function renderPokedexDetail(entry) {
  const displayName = getPokemonDisplayName(entry);
  const region = getPokedexRegion(entry.number);
  const types = getPokemonTypes(entry.nameEn);
  const iconPath = getPokedexIconPath(entry);
  const artwork = getPokemonArtwork(entry.nameEn);
  const spriteFallback = getPokedexSpriteFallback(entry);
  const fallbackSrc = artwork || spriteFallback || "";
  const fallbackData = fallbackSrc ? ` data-fallback-src="${fallbackSrc}"` : "";
  const iconHtml = iconPath
    ? `<img src="${iconPath}" alt="${displayName}"${fallbackData} onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
    : artwork
      ? `<img src="${artwork}" alt="${displayName}" onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
      : `<span>${displayName.slice(0, 1)}</span>`;
  const desc = getPokedexDescription(entry);
  const gender = resolvePokedexGender(desc);
  const showGender = !!(desc.male || desc.female);
  const descriptionText =
    gender === "male" ? desc.male : gender === "female" ? desc.female : desc.common;
  return `
    <div class="pokedex-detail">
      <div class="pokedex-detail-header">
        <div class="pokedex-icon pokedex-icon--large">
          ${iconHtml}
        </div>
        <div class="pokedex-detail-meta">
          <div class="pokedex-title">
            <span class="pokedex-number">${formatDexNumber(entry.number)}</span>
            <span class="pokedex-name">${displayName}</span>
          </div>
          <div class="pokedex-subline">
            <span class="pokedex-region">${region}</span>
            <span class="pokedex-types">${renderPokemonTypeIcons(types, "icon-sm")}</span>
          </div>
          ${renderGameIcons(entry.nameEn)}
        </div>
      </div>
      <div class="pokedex-divider"></div>
      <div class="pokedex-description">
        <div class="pokedex-description-header">
          <h3>${t("pokedex.descriptionTitle")}</h3>
          ${
            showGender
              ? `
                <div class="pokedex-gender-toggle">
                  <button class="gender-btn ${gender === "male" ? "active" : ""}" data-gender="male" type="button">♂</button>
                  <button class="gender-btn ${gender === "female" ? "active" : ""}" data-gender="female" type="button">♀</button>
                </div>
              `
              : ""
          }
        </div>
        <p>${descriptionText}</p>
      </div>
      <div class="pokedex-divider"></div>
      <div class="pokedex-cards-block">
        <div class="pokedex-cards-header">
          <h3>${t("pokedex.cardsFromPacks")}</h3>
          <div class="pokedex-scroll-controls">
            <button class="scroll-btn" id="pokedexScrollPrev" type="button" aria-label="${t("common.back")}">‹</button>
            <button class="scroll-btn" id="pokedexScrollNext" type="button" aria-label="${t("common.next")}">›</button>
          </div>
        </div>
        ${renderPokedexCards(getPokemonCardMatches(entry.nameEn))}
      </div>
    </div>
  `;
}

