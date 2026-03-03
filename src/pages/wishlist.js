import { PACKS_ORDER } from "../config/packs.js";
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

function getOrderedPacks() {
  const packs = state.data?.packs || [];
  const map = new Map(packs.map((pack) => [pack.id, pack]));
  const ordered = [];
  PACKS_ORDER.forEach((item) => {
    if (item.id === "ALL" || item.id.startsWith("Series")) return;
    if (map.has(item.id)) {
      ordered.push(map.get(item.id));
      map.delete(item.id);
    }
  });
  map.forEach((pack) => ordered.push(pack));
  return ordered;
}

function resolvePackBanner(pack) {
  const orderItem = PACKS_ORDER.find((item) => item.id === pack.id);
  return (
    pack.logo
    || pack.artwork
    || orderItem?.artwork
    || "https://storage.yandexcloud.net/poketracker/Images/Artworks/ALL.png"
  );
}

function renderGroupedByPacks(cards) {
  const blocks = getOrderedPacks()
    .map((pack) => {
      const packCards = cards.filter((card) => card.pack === pack.id);
      if (!packCards.length) return "";
      const logo = resolvePackBanner(pack);
      return `
        <div class="pack-block pack-accordion" data-pack-block="${pack.id}">
          <button class="pack-accordion-header" data-pack-toggle="${pack.id}" type="button" aria-expanded="false">
            <span class="pack-accordion-logo-wrap">
              <img src="${logo}" alt="${pack.display}" onerror="this.onerror=null;this.src='https://storage.yandexcloud.net/poketracker/Images/Artworks/ALL.png';" loading="lazy" decoding="async" />
            </span>
            <span class="pack-accordion-title">${pack.display}</span>
            <span class="pack-accordion-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="pack-accordion-divider"></div>
          <div class="pack-group-content" data-pack-content="${pack.id}" style="max-height:0px" aria-hidden="true">
            <div class="pack-group-content-inner">
              ${renderCardGrid(packCards)}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  return blocks;
}

function attachPackAccordionEvents(app) {
  app.querySelectorAll("[data-pack-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const packId = button.getAttribute("data-pack-toggle");
      if (!packId) return;
      const block = app.querySelector(`[data-pack-block="${packId}"]`);
      const contentEl = app.querySelector(`[data-pack-content="${packId}"]`);
      if (!block || !contentEl) return;

      const isOpen = block.classList.contains("is-open");
      if (isOpen) {
        const currentHeight = contentEl.scrollHeight;
        contentEl.style.maxHeight = `${currentHeight}px`;
        requestAnimationFrame(() => {
          block.classList.remove("is-open");
          button.setAttribute("aria-expanded", "false");
          contentEl.setAttribute("aria-hidden", "true");
          contentEl.style.maxHeight = "0px";
        });
        return;
      }

      block.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      contentEl.setAttribute("aria-hidden", "false");
      contentEl.style.maxHeight = `${contentEl.scrollHeight}px`;
    });
  });
}

export function renderWishlist() {
  const app = document.getElementById("app");
  const cards = state.data?.cards.filter((card) => state.wishlist.has(formatCardId(card))) || [];
  const groupMode = state.filters.wishlistMode || "packs";

  let content = "";
  if (groupMode === "all") {
    content = renderCardGrid(cards);
  } else {
    content = renderGroupedByPacks(cards);
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

  if (groupMode === "packs") {
    attachPackAccordionEvents(app);
  }

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
