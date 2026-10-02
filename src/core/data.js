import { state } from "./state.js";

const STORAGE_HOST = "storage.yandexcloud.net";
const PACK_FOLDER_MAP = {
  "MEGA SHINE": "Mega Shine",
};

function normalizePackFolderSegment(segment) {
  if (!segment || segment.includes(".")) return segment;

  const normalizedKey = segment.replace(/[-_]+/g, " ").trim().toUpperCase();
  return PACK_FOLDER_MAP[normalizedKey] || segment;
}

function normalizeStorageImageUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return rawUrl;

  const trimmed = rawUrl.trim();
  if (!trimmed.includes(STORAGE_HOST)) return rawUrl;

  try {
    const url = new URL(trimmed);
    if (url.hostname !== STORAGE_HOST) return rawUrl;

    const fixedPath = url.pathname
      .replaceAll("/Mega-Shine/", "/Mega Shine/")
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .map((segment) => normalizePackFolderSegment(segment))
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    url.pathname = fixedPath;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeLoadedCardsData(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const normalized = { ...payload };

  if (Array.isArray(normalized.packs)) {
    normalized.packs = normalized.packs.map((pack) => {
      if (!pack || typeof pack !== "object") return pack;
      return {
        ...pack,
        logo: normalizeStorageImageUrl(pack.logo),
        artwork: normalizeStorageImageUrl(pack.artwork),
      };
    });
  }

  if (Array.isArray(normalized.cards)) {
    normalized.cards = normalized.cards.map((card) => {
      if (!card || typeof card !== "object") return card;
      return {
        ...card,
        image: normalizeStorageImageUrl(card.image),
      };
    });
  }

  return normalized;
}

export async function loadData() {
  try {
    const response = await fetch("/api/cards");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const payload = await response.json();
    state.data = normalizeLoadedCardsData(payload);
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    state.data = { packs: [], cards: [] };
  }
}
