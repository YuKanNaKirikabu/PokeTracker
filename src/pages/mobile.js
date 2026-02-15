import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { getMobilePackTiles, setupPacksArc } from "../features/packs-ui.js";

export function renderMobileHome() {
  const app = document.getElementById("app");
  const mode = state.ui.packsHomeMode || "grid";
  const isArc = mode === "arc";
  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("mobileHome.title")}</h1>
      <p class="section-subtitle">${t("mobileHome.subtitle")}${isArc ? ` ${t("mobileHome.arcNote")}` : ""}</p>
      ${isArc ? '<div class="packs-arc" id="packsArc"></div>' : '<div class="packs-gallery" id="packsGrid"></div>'}
    </section>
  `;

  const tiles = getMobilePackTiles();
  if (!tiles.length) return;

  if (!isArc) {
    const grid = document.getElementById("packsGrid");
    tiles.forEach((tileData) => {
      const tile = document.createElement("a");
      tile.className = "pack-tile";
      tile.href = tileData.href;
      tile.innerHTML = `<img src="${tileData.artwork}" alt="${tileData.label}" loading="lazy" decoding="async" />`;
      grid.appendChild(tile);
    });
    return;
  }

  const arc = document.getElementById("packsArc");
  if (state.ui.arcCleanup) state.ui.arcCleanup();
  state.ui.arcCleanup = setupPacksArc(arc, tiles);
}
