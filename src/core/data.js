import { state } from "./state.js";

export async function loadData() {
  try {
    const response = await fetch("/api/cards");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const payload = await response.json();
    state.data = payload;
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    state.data = { packs: [], cards: [] };
  }
}
