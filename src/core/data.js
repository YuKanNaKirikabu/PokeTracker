import { state } from "./state.js";

export async function loadData() {
  try {
    const response = await fetch("/api/cards", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.packs) || !Array.isArray(payload.cards)) {
      throw new Error("cards.json must contain packs[] and cards[]");
    }
    state.data = payload;
  } catch (error) {
    console.error("Ошибка загрузки cards.json:", error);
    state.data = { packs: [], cards: [] };
  }
}
