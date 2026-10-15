import { state } from "./state.js";

export async function loadData() {
  try {
    const response = await fetch("/api/cards?limit=150&offset=0");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.packs) || !Array.isArray(payload.cards)) {
      throw new Error("cards.json must contain packs[] and cards[]");
    }
    state.data = payload;
    window.dispatchEvent(new CustomEvent("cardsdataready", {
      detail: { loaded: payload.cards.length, total: payload.total || payload.cards.length },
    }));
    if (payload.hasMore) {
      loadRemainingCards(payload.cards.length).catch((error) => {
        console.error("Ошибка догрузки карточек:", error);
      });
    }
  } catch (error) {
    console.error("Ошибка загрузки cards.json:", error);
    state.data = { packs: [], cards: [] };
  }
}

async function loadRemainingCards(offset) {
  let nextOffset = offset;
  while (true) {
    const response = await fetch(`/api/cards?limit=150&offset=${nextOffset}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    state.data.cards.push(...payload.cards);
    nextOffset += payload.cards.length;
    window.dispatchEvent(new CustomEvent("cardsdataready", {
      detail: { loaded: state.data.cards.length, total: payload.total },
    }));
    if (!payload.hasMore || !payload.cards.length) return;
  }
}
