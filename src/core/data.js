import { state } from "./state.js";

const STORAGE_HOST = "storage.yandexcloud.net";

function normalizePackFolderSegment(segment) {
  if (!segment || segment.includes(".")) return segment;

  return segment;
}

function normalizeStorageImageUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return rawUrl;

  const trimmed = rawUrl.trim();
  if (!trimmed.includes(STORAGE_HOST)) return rawUrl;

  try {
    const url = new URL(trimmed);
    if (url.hostname !== STORAGE_HOST) return rawUrl;

    const fixedPath = url.pathname
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

export function getPackSubpacks(packId) {
  const cards = state.data?.cards?.filter((card) => card.pack === packId) || [];
  const subpacks = new Map();

  cards.forEach((card) => {
    (Array.isArray(card.subpacks) ? card.subpacks : []).forEach((name) => {
      if (!subpacks.has(name)) {
        subpacks.set(name, {
          key: String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          label: name,
          name,
          artwork: card.image,
          count: 0,
        });
      }
      subpacks.get(name).count += 1;
    });
  });

  return [...subpacks.values()];
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
