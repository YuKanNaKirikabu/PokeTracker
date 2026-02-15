import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveDataToFile } from "../core/storage.js";
import { attachCardEvents, formatCardId, renderCardGrid } from "../features/cards.js";

function setCardsDirty(isDirty) {
  state.ui.cardsDirty = isDirty;
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

export function renderWishlist() {
  const app = document.getElementById("app");
  const cards = state.data?.cards.filter((card) => state.wishlist.has(formatCardId(card))) || [];
  const groupMode = state.filters.wishlistMode || "packs";

  let content = "";
  if (groupMode === "all") {
    content = renderCardGrid(cards);
  } else {
    content = state.data.packs
      .map((pack) => {
        const packCards = cards.filter((card) => card.pack === pack.id);
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
      <h1 class="section-title">${t("wishlist.title")}</h1>
      <p class="section-subtitle">${t("wishlist.subtitle")}</p>
      <div class="collection-toolbar">
        <div class="toggle ${groupMode === "packs" ? "active" : ""}" data-mode="packs">${t("wishlist.togglePacks")}</div>
        <div class="toggle ${groupMode === "all" ? "active" : ""}" data-mode="all">${t("wishlist.toggleAll")}</div>
      </div>
      ${content || `<div class="placeholder">${t("wishlist.empty")}</div>`}
    </section>
    <button class="game-pokedex-save-btn left" id="cardsSaveBtn" type="button" disabled>
      ${t("gamePokedex.save")}
    </button>
  `;

  document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state.filters.wishlistMode = toggle.dataset.mode;
      renderWishlist();
    });
  });

  if (cards.length) {
    attachCardEvents(renderWishlist);
  }

  const saveButton = app.querySelector("#cardsSaveBtn");
  saveButton?.addEventListener("click", async () => {
    await saveDataToFile();
    setCardsDirty(false);
  });
  setCardsDirty(Boolean(state.ui.cardsDirty));
}
