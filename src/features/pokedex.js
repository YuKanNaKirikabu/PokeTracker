
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
let GAME_DEX_POKEMON_INDEX = null;
let GAME_DEX_LOAD_PROMISE = null;
let GAME_DEX_LOAD_ERROR = null;
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
    .split(/[\\/,&·•]/)
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
  // The complete 1,025-entry master Pokédex is bundled in src/config/pokedex.js.
  // Do not request the removed local Lists/1025.txt file.
  getPokedexList();
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
  return GAME_POKEDEXES.find((game) => game.id === gameId) || null;
}

export function getGameDexLoadError() {
  return GAME_DEX_LOAD_ERROR;
}

function firstDefined(object, keys, fallback = undefined) {
  for (const key of keys) if (object && object[key] !== undefined && object[key] !== null) return object[key];
  return fallback;
}

function normalizeIcon(icon, alt = "") {
  if (typeof icon === "string") return { src: icon, alt };
  if (!icon || typeof icon !== "object") return null;
  const src = firstDefined(icon, ["src", "url", "image", "imageUrl"]);
  return src ? { src: String(src), alt: String(firstDefined(icon, ["alt", "name", "title"], alt)) } : null;
}

function normalizeIcons(game) {
  const raw = firstDefined(game, ["icons", "images", "versions"], []);
  const icons = (Array.isArray(raw) ? raw : [raw])
    .map((item) => normalizeIcon(item, String(firstDefined(game, ["title", "name"], ""))))
    .filter(Boolean);
  if (icons.length) return icons;
  const single = normalizeIcon(firstDefined(game, ["icon", "image", "imageUrl", "logo"]), String(firstDefined(game, ["title", "name"], "")));
  return single ? [single] : [];
}

function normalizeEntry(entry, index, dex = null) {
  let number = NaN, nameEn = "", nameRu = null, types = null;
  if (typeof entry === "string") nameEn = entry.trim();
  else if (Array.isArray(entry)) {
    number = Number(entry[0]); nameEn = String(entry[1] || "").trim();
    types = parsePokedexTypes(entry[2]); nameRu = entry[3] == null ? null : String(entry[3]);
  } else if (entry && typeof entry === "object") {
    number = Number(firstDefined(entry, ["number", "no", "dexNumber", "nationalNumber"]));
    nameEn = String(firstDefined(entry, ["nameEn", "englishName", "name", "pokemon", "pokemonName", "en"], "")).trim();
    const ru = firstDefined(entry, ["nameRu", "russianName", "ru"], null);
    nameRu = ru == null ? null : String(ru);
    types = parsePokedexTypes(firstDefined(entry, ["types", "type", "pokemonTypes"], null));
  }
  if (!nameEn) return null;
  if (!Number.isFinite(number) || number < 1) number = index + 1;
  return { number, numberStr: String(number).padStart(3, "0"), nameEn, nameRu, types, dexId: dex?.id || null };
}

function normalizeDex(dex, index) {
  const entries = firstDefined(dex, ["entries", "pokemon", "pokemons", "list", "members"], []);
  return {
    id: String(firstDefined(dex, ["id", "slug", "key", "name", "title"], `dex-${index + 1}`)),
    title: String(firstDefined(dex, ["title", "name", "label"], `Pokédex ${index + 1}`)),
    entries: Array.isArray(entries) ? entries.map((entry, entryIndex) => normalizeEntry(entry, entryIndex, dex)).filter(Boolean) : [],
  };
}

function normalizeGame(game, index) {
  if (!game || typeof game !== "object") return null;
  const title = String(firstDefined(game, ["title", "name", "game", "label"], "")).trim();
  if (!title) return null;
  const id = String(firstDefined(game, ["id", "slug", "key", "codeName"], title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")));
  const gen = Number(firstDefined(game, ["generation", "gen"], NaN));
  const rawDexes = firstDefined(game, ["dexes", "pokedexes", "regionalDexes"], []);
  const dexes = Array.isArray(rawDexes) ? rawDexes.map(normalizeDex) : [];
  if (!dexes.length) {
    const entries = firstDefined(game, ["entries", "pokemon", "pokemons", "list"], []);
    if (Array.isArray(entries)) dexes.push({ id: "national", title: "Pokédex", entries: entries.map((entry, i) => normalizeEntry(entry, i)).filter(Boolean) });
  }
  const total = dexes.reduce((sum, dex) => sum + dex.entries.length, 0);
  const count = Number(firstDefined(game, ["pokemonCount", "count", "totalPokemon", "total"], NaN));
  return {
    id, title,
    generation: Number.isFinite(gen) && gen > 0 ? gen : null,
    codeName: String(firstDefined(game, ["codeName", "code", "shortName"], "")),
    pokemonCount: Number.isFinite(count) && count >= 0 ? count : total,
    status: String(firstDefined(game, ["status"], total ? "ready" : "coming-soon")),
    icons: normalizeIcons(game),
    listPath: total ? "GameDex.json" : null,
    pageSize: Number(firstDefined(game, ["pageSize"], 30)),
    dexes, activeDexId: dexes[0]?.id || null, entries: dexes[0]?.entries || [], catalogIndex: index,
  };
}

export async function loadGameDexCatalog() {
  if (!GAME_DEX_LOAD_PROMISE) {
    GAME_DEX_LOAD_PROMISE = (async () => {
      const response = await fetch("/api/game-dex", { cache: "no-store" });
      if (!response.ok) {
        let details = "";
        try { details = (await response.json()).error || ""; } catch {}
        throw new Error(`GameDex.json: HTTP ${response.status}${details ? ` — ${details}` : ""}`);
      }
      const payload = await response.json();
      const rawGames = Array.isArray(payload) ? payload : firstDefined(payload, ["games", "gameCatalog", "catalog"], null);
      if (!Array.isArray(rawGames)) throw new Error("GameDex.json must contain a games[] array.");
      const games = rawGames.map(normalizeGame).filter(Boolean);
      if (!games.length) throw new Error("GameDex.json contains no valid games.");
      GAME_POKEDEXES.splice(0, GAME_POKEDEXES.length, ...games);
      GAME_DEX_POKEMON_INDEX = payload && !Array.isArray(payload) && payload.pokemon && typeof payload.pokemon === "object" ? payload.pokemon : null;
      GAME_POKEDEX_CACHE.clear();
      GAME_POKEDEX_LOADING.clear();
      GAME_DEX_LOAD_ERROR = null;
      return games;
    })().catch((error) => {
      GAME_DEX_LOAD_ERROR = error;
      console.error("Failed to load GameDex.json:", error);
      throw error;
    }).finally(() => { GAME_DEX_LOAD_PROMISE = null; });
  }
  return GAME_DEX_LOAD_PROMISE;
}

function dedupeGamePokedexEntries(list) {
  const seen = new Set();
  return list.filter((entry) => {
    const key = normalizePokemonName(entry.nameEn);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadGamePokedexes() {
  await loadGameDexCatalog();
  await Promise.all(GAME_POKEDEXES.map((game) => ensureGamePokedexLoaded(game.id)));
}

export async function ensureGamePokedexLoaded(gameId) {
  const cached = GAME_POKEDEX_CACHE.get(gameId);
  if (cached?.loaded) return cached;
  if (GAME_POKEDEX_LOADING.has(gameId)) return GAME_POKEDEX_LOADING.get(gameId);
  const game = getGamePokedexConfig(gameId);
  if (!game) {
    const missing = { list: [], byName: new Set(), loaded: true, error: new Error(`Unknown game: ${gameId}`) };
    GAME_POKEDEX_CACHE.set(gameId, missing);
    return missing;
  }
  const loader = Promise.resolve().then(() => {
    const selectedDexId = state.ui.gamePokedexDex?.[gameId] || game.activeDexId;
    const dex = game.dexes?.find((item) => item.id === selectedDexId) || game.dexes?.[0];
    const list = dedupeGamePokedexEntries((dex?.entries || game.entries || []).map((entry, index) => ({
      ...entry,
      number: Number.isFinite(entry.number) ? entry.number : index + 1,
      numberStr: String(Number.isFinite(entry.number) ? entry.number : index + 1).padStart(3, "0"),
    })));
    const data = { list, byName: new Set(list.map((entry) => normalizePokemonName(entry.nameEn))), loaded: true, error: null };
    GAME_POKEDEX_CACHE.set(gameId, data);
    return data;
  }).finally(() => GAME_POKEDEX_LOADING.delete(gameId));
  GAME_POKEDEX_LOADING.set(gameId, loader);
  return loader;
}

export function getGameDexPokemonIndex() {
  return GAME_DEX_POKEMON_INDEX;
}

export function invalidateGamePokedexData(gameId) {
  GAME_POKEDEX_CACHE.delete(gameId);
}

export function getGamePokedexData(gameId) {
  if (!GAME_POKEDEX_CACHE.has(gameId)) GAME_POKEDEX_CACHE.set(gameId, { list: [], byName: new Set(), loaded: false, error: null });
  return GAME_POKEDEX_CACHE.get(gameId);
}

function getGamePokedexMarksKey(gameId, versionIndex = 0) {
  const config = getGamePokedexConfig(gameId);
  const records = state.ui.gamePokedex || {};
  const versionKey = `${gameId}-v${versionIndex}`;
  // Keep existing per-version marks readable if older catalog metadata is absent.
  if (config?.icons?.length > 1 || Object.prototype.hasOwnProperty.call(records, versionKey)) return versionKey;
  return gameId;
}

export function getGamePokedexMarks(gameId, versionIndex = 0) {
  const key = getGamePokedexMarksKey(gameId, versionIndex);
  const record = state.ui.gamePokedex?.[key] || {};
  return { blue: new Set(record.blue || []), red: new Set(record.red || []), sort: record.sort || "found" };
}

export function setGamePokedexMarks(gameId, marks, versionIndex = 0) {
  if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
  const key = getGamePokedexMarksKey(gameId, versionIndex);
  state.ui.gamePokedex[key] = { blue: [...marks.blue], red: [...marks.red], sort: marks.sort || "found" };
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

const POKEDEX_NON_POKEMON_CARD_TYPES = new Set([
  "ITEM",
  "TOOL",
  "POKEMON TOOL",
  "SUPPORTER",
  "STADIUM",
  "TRAINER",
  "ENERGY",
  "POKEMON",
  "OTHER",
  "UNKNOWN",
]);

function extractPokedexCardType(typeRaw) {
  if (typeRaw == null) return null;

  let value = String(typeRaw).trim();
  if (!value) return null;

  // Convert a type-icon URL such as ".../Types/Psychic.webp" to "PSYCHIC".
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      value = decodeURIComponent(url.pathname.split("/").pop() || "");
    } catch {
      value = value.split(/[?#]/, 1)[0].split("/").pop() || "";
    }
    value = value.replace(/\.[^.]+$/, "");
  }

  value = value
    .replace(/[-_]+/g, " ")
    .trim()
    .toUpperCase();

  if (!value || POKEDEX_NON_POKEMON_CARD_TYPES.has(value)) return null;

  const normalized = normalizePokedexType(value);
  if (!normalized || POKEDEX_NON_POKEMON_CARD_TYPES.has(normalized)) return null;

  return normalized;
}

export function getPokemonTypes(nameEn) {
  const key = normalizePokemonName(nameEn);
  const cards = state.data?.cards || [];
  const cached = POKEDEX_TYPE_CACHE.get(key);
  if (cached && (cached.length !== 1 || cached[0] !== "COLORLESS" || !cards.length)) {
    return cached;
  }

  const types = new Set();

  getPokemonCardMatches(nameEn).forEach((card) => {
    const type = extractPokedexCardType(card.type);
    if (type) types.add(type);
  });

  let list = [...types];

  // Use the Pokédex text list only if no usable type was found in card data.
  if (!list.length) {
    const lookup = POKEDEX_LOOKUP?.get(key);
    if (lookup?.types?.length) {
      lookup.types.forEach((typeRaw) => {
        const type = extractPokedexCardType(typeRaw);
        if (type) types.add(type);
      });
      list = [...types];
    }
  }

  // Colorless is only the fallback when no valid type can be determined.
  if (!list.length) {
    list = ["COLORLESS"];
    if (!cards.length) return list;
  }

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
  return `https://storage.yandexcloud.net/poketracker/Images/Pokedex/0001-1025 Original/${entry.numberStr}_${encodeURIComponent(safeName)}.webp`;
}

export function getPokedexSpriteFallback() {
  return null;
}

export function renderPokemonTypeIcons(types, sizeClass = "") {
  const safeTypes = types && types.length ? types : ["COLORLESS"];
  const uniqueTypes = [...new Set(safeTypes.map((type) => String(type).trim().toUpperCase()))];
  return uniqueTypes
    .map((type) => {
      const icon = (state.data?.cards || []).find((card) => {
        const value = String(card.type || "").split(/[?#]/, 1)[0].split("/").pop() || "";
        return normalizePokedexType(value.replace(/\.[^.]+$/, "")) === type;
      })?.type || "";
      return `<span class="icon-badge type-badge ${sizeClass}"><img src="${icon}" alt="${type}" /></span>`;
    })
    .join("");
}

function getCardImageFallback() { return ""; }

export function renderPokedexCardItem(card) {
  const cardId = formatCardId(card);
  const owned = state.owned.has(cardId);
  const wished = state.wishlist?.has(cardId) ?? false;
  const displayCode = formatCardCode(card);
  const rarityIcon = card.rarity || "";
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
  return { common: t("pokedex.descriptionFallback") };
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
  const artwork = null;
  const fallbackSrc = "";
  const fallbackData = fallbackSrc ? ` data-fallback-src="${fallbackSrc}"` : "";
  const iconHtml = iconPath
    ? `<img src="${iconPath}" alt="${displayName}"${fallbackData} onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
    : artwork ? `<img src="${artwork}" alt="${displayName}" loading="lazy" decoding="async" />` : `<span>${displayName.slice(0,1)}</span>`;
  const desc = getPokedexDescription(entry);
  const gender = resolvePokedexGender(desc);
  const descriptionText = gender === "male" ? desc.male : gender === "female" ? desc.female : desc.common;
  const cards = getPokemonCardMatches(entry.nameEn);
  const statsPanel = `<div class="pokedex-data-grid"><div class="pokedex-data-cell"><span>Национальный номер</span><strong>#${formatDexNumber(entry.number)}</strong></div><div class="pokedex-data-cell"><span>Регион</span><strong>${region}</strong></div><div class="pokedex-data-cell"><span>Тип</span><strong>${types.join(" / ")}</strong></div><div class="pokedex-data-cell"><span>Карты TCG Pocket</span><strong>${cards.length}</strong></div></div><p class="pokedex-data-note">Рост, вес и базовые характеристики будут показаны здесь после загрузки проверенных данных Pokédex.</p>`;
  return `
    <div class="pokedex-detail">
      <div class="pokedex-detail-header">
        <div class="pokedex-icon pokedex-icon--large">${iconHtml}</div>
        <div class="pokedex-detail-meta">
          <div class="pokedex-title"><span class="pokedex-number">NATIONAL DEX · #${formatDexNumber(entry.number)}</span><span class="pokedex-name">${displayName}</span></div>
          <div class="pokedex-subline"><span class="pokedex-region">${region}</span><span class="pokedex-types">${renderPokemonTypeIcons(types, "icon-sm")}</span></div>
          <div class="pokedex-detail-kicker">POKÉMON DATABASE</div>
        </div>
      </div>
      <section class="pokedex-overview-description"><div class="pokedex-description-heading"><span class="pokedex-section-mark"></span><h3>Описание</h3></div><p>${descriptionText || t("pokedex.descriptionFallback")}</p></section>
      <nav class="pokedex-detail-tabs" role="tablist" aria-label="Информация о покемоне">
        <button type="button" class="active" data-dex-tab="cards" role="tab" aria-selected="true">Карты TCG Pocket</button>
        <button type="button" data-dex-tab="stats" role="tab" aria-selected="false">Характеристики</button>
        <button type="button" data-dex-tab="moves" role="tab" aria-selected="false">Приёмы</button>
        <button type="button" data-dex-tab="evolution" role="tab" aria-selected="false">Эволюции</button>
      </nav>
      <section class="pokedex-tab-panel" data-dex-panel="cards">
        <div class="pokedex-cards-header"><h3>Карты TCG Pocket <span class="pokedex-tab-count">${cards.length}</span></h3><div class="pokedex-scroll-controls"><button class="scroll-btn" id="pokedexScrollPrev" type="button" aria-label="Предыдущие карты">‹</button><button class="scroll-btn" id="pokedexScrollNext" type="button" aria-label="Следующие карты">›</button></div></div>
        ${renderPokedexCards(cards)}
      </section>
      <section class="pokedex-tab-panel" data-dex-panel="stats" hidden><h3 class="pokedex-tab-heading">Характеристики</h3>${statsPanel}</section>
      <section class="pokedex-tab-panel" data-dex-panel="moves" hidden><h3 class="pokedex-tab-heading">Известные приёмы</h3><p class="pokedex-data-note">Достоверный список приёмов для этого покемона ещё не подключён к локальным данным проекта.</p></section>
      <section class="pokedex-tab-panel" data-dex-panel="evolution" hidden><h3 class="pokedex-tab-heading">Эволюционная цепочка</h3><p class="pokedex-data-note">Эволюции и предыдущие формы требуют отдельного источника данных. Здесь не будут подставляться предположительные связи.</p></section>
    </div>
  `;
}