import { state } from "../core/state.js";
import { getMobilePackTiles, setupPacksArc } from "../features/packs-ui.js";

export function renderMobileHome() {
  const app = document.getElementById("app");
  const mode = state.ui.packsHomeMode || "grid";
  const isArc = mode === "arc";
  app.innerHTML = `
    <section class="mobile-packs-page">
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
      tile.addEventListener("pointermove", (event) => {
        const rect = tile.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        tile.style.setProperty("--pack-tilt-x", `${(y * -20).toFixed(2)}deg`);
        tile.style.setProperty("--pack-tilt-y", `${(x * 20).toFixed(2)}deg`);
      });
      tile.addEventListener("pointerleave", () => {
        tile.style.removeProperty("--pack-tilt-x");
        tile.style.removeProperty("--pack-tilt-y");
      });
      grid.appendChild(tile);
    });
    return;
  }

  const arc = document.getElementById("packsArc");
  if (state.ui.arcCleanup) state.ui.arcCleanup();
  state.ui.arcCleanup = setupPacksArc(arc, tiles);
}
