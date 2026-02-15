import { state } from "./state.js";

export async function loadData() {
  try {
    const response = await fetch("data/cards.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    state.data = await response.json();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    state.data = { packs: [], cards: [] };
  }
}
