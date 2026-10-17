import { state } from "./state.js";

export async function loadData() {
  try {
    const response = await fetch("/api/cards?limit=2000&offset=0");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.packs) || !Array.isArray(payload.cards)) {
      throw new Error("cards.json must contain packs[] and cards[]");
    }
    state.data = payload;
    if (payload.hasMore) await loadRemainingCards(payload.cards.length);
    window.dispatchEvent(new CustomEvent("cardsdataready", {
      detail: { loaded: state.data.cards.length, total: state.data.cards.length },
    }));
  } catch (error) {
    console.error("Ошибка загрузки cards.json:", error);
    state.data = { packs: [], cards: [] };
    window.dispatchEvent(new CustomEvent("cardsdataready", { detail: { loaded: 0, total: 0, error: true } }));
  }
}

async function loadRemainingCards(offset) {
  let nextOffset = offset;
  while (true) {
    const response = await fetch(`/api/cards?limit=2000&offset=${nextOffset}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.cards)) throw new Error("Invalid cards page.");
    state.data.cards.push(...payload.cards);
    nextOffset += payload.cards.length;
    if (!payload.hasMore || !payload.cards.length) return;
  }
}
