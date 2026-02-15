import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveDataToFile } from "../core/storage.js";
import { formatCardId, renderCardGrid } from "../features/cards.js";

function setCardsDirty(isDirty) {
  state.ui.cardsDirty = isDirty;
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

export function renderCollection() {
  const app = document.getElementById("app");
  const ownedCards = state.data.cards.filter((card) => state.owned.has(formatCardId(card)));
  const groupMode = state.filters.collectionMode || "packs";

  let content = "";
  if (groupMode === "all") {
    content = renderCardGrid(ownedCards);
  } else {
    content = state.data.packs
      .map((pack) => {
        const packCards = ownedCards.filter((card) => card.pack === pack.id);
        if (!packCards.length) return "";
        return `
          <div class="pack-block">
            <h2>${pack.display}</h2>
            ${renderCardGrid(packCards)}
          </div>
        `;
      })
      .join("");
  }

  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("collection.title")}</h1>
      <p class="section-subtitle">${t("collection.subtitle")}</p>
      <div class="collection-toolbar">
        <div class="toggle ${groupMode === "packs" ? "active" : ""}" data-mode="packs">${t("collection.togglePacks")}</div>
        <div class="toggle ${groupMode === "all" ? "active" : ""}" data-mode="all">${t("collection.toggleAll")}</div>
      </div>
      ${content || `<div class="placeholder">${t("collection.empty")}</div>`}
    </section>
    <button class="game-pokedex-save-btn left" id="cardsSaveBtn" type="button" disabled>
      ${t("gamePokedex.save")}
    </button>
  `;

  document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state.filters.collectionMode = toggle.dataset.mode;
      renderCollection();
    });
  });

  const saveButton = app.querySelector("#cardsSaveBtn");
  saveButton?.addEventListener("click", async () => {
    await saveDataToFile();
    setCardsDirty(false);
  });
  setCardsDirty(Boolean(state.ui.cardsDirty));
}
