import { t } from "../core/i18n.js";
import { saveDataToFile } from "../core/storage.js";
import { state } from "../core/state.js";
import { attachCardImageFallbacks, formatCardId, renderCardGrid, toggleOwned } from "../features/cards.js";

const collectionPendingRemoved = new Set();
const collectionOpenPacks = new Set();

function getOrderedPacks() {
  return state.data?.packs || [];
}

function resolvePackBanner(pack) {
  return pack?.logo || pack?.artwork || pack?.subpacks?.[0]?.logo || pack?.subpacks?.[0]?.artwork || "";
}

function renderGroupedByPacks(cards) {
  const blocks = getOrderedPacks()
    .map((pack) => {
      const packCards = cards.filter((card) => card.pack === pack.id);
      if (!packCards.length) return "";
      const logo = resolvePackBanner(pack);
      const isOpen = collectionOpenPacks.has(pack.id);
      return `
        <div class="pack-block pack-accordion ${isOpen ? "is-open" : ""}" data-pack-block="${pack.id}">
          <button class="pack-accordion-header" data-pack-toggle="${pack.id}" type="button" aria-expanded="${isOpen ? "true" : "false"}">
            <span class="pack-accordion-logo-wrap">${pack.kind === "collection" ? (pack.subpacks || []).map((subpack) => '<img src="' + (subpack.logo || subpack.artwork || "") + '" alt="' + (subpack.display || subpack.id) + '" loading="lazy" decoding="async" />').join("") : '<img src="' + logo + '" alt="' + pack.display + '" loading="lazy" decoding="async" />'}</span>
            <span class="pack-accordion-title">${pack.display}</span>
            <span class="pack-accordion-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="pack-accordion-divider"></div>
          <div class="pack-group-content" data-pack-content="${pack.id}" style="max-height:${isOpen ? "none" : "0px"}" aria-hidden="${isOpen ? "false" : "true"}">
            <div class="pack-group-content-inner">
              ${renderCardGrid(packCards, { showWishlist: false })}
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
          collectionOpenPacks.delete(packId);
        });
        return;
      }

      block.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      contentEl.setAttribute("aria-hidden", "false");
      contentEl.style.maxHeight = `${contentEl.scrollHeight}px`;
      collectionOpenPacks.add(packId);
    });
  });
}

function attachCollectionCardEvents(app) {
  app.querySelectorAll(".pokeball").forEach((ball) => {
    ball.addEventListener("click", () => {
      const cardId = ball.dataset.cardId;
      if (!cardId) return;
      toggleOwned(cardId);
      const cardEl = ball.closest(".card-item");
      const ownedNow = state.owned.has(cardId);
      if (ownedNow) {
        collectionPendingRemoved.delete(cardId);
        ball.classList.add("collected");
        cardEl?.classList.remove("pending-remove");
      } else {
        collectionPendingRemoved.add(cardId);
        ball.classList.remove("collected");
        cardEl?.classList.add("pending-remove");
      }
    });
  });
}

export function renderCollection() {
  const app = document.getElementById("app");
  const visibleOwned = new Set(state.owned);
  collectionPendingRemoved.forEach((cardId) => {
    if (!state.owned.has(cardId)) {
      visibleOwned.add(cardId);
    }
  });
  const ownedCards = (state.data?.cards || []).filter((card) => visibleOwned.has(formatCardId(card)));
  const groupMode = state.filters.collectionMode || "packs";

  let content = "";
  if (groupMode === "all") {
    content = renderCardGrid(ownedCards, { showWishlist: false });
  } else {
    content = renderGroupedByPacks(ownedCards);
  }

  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("collection.title")}</h1>
      <p class="section-subtitle">${t("collection.subtitle")}</p>
      <div class="collection-toolbar">
        <div class="toggle ${groupMode === "packs" ? "active" : ""}" data-mode="packs">${t("collection.togglePacks")}</div>
        <div class="toggle ${groupMode === "all" ? "active" : ""}" data-mode="all">${t("collection.toggleAll")}</div>
      </div>
      <div class="collection-save-row"><button type="button" class="game-pokedex-save-btn left collection-save-btn" id="collectionSaveBtn" disabled>Сохранить изменения</button><span class="collection-save-status" id="collectionSaveStatus" aria-live="polite"></span></div>
      ${content || `<div class="placeholder">${t("collection.empty")}</div>`}
    </section>
  `;

  const saveButton = app.querySelector("#collectionSaveBtn");
  const saveStatus = app.querySelector("#collectionSaveStatus");
  const refreshSaveButton = () => {
    const dirty = Boolean(state.ui.cardsDirty);
    if (saveButton) {
      saveButton.disabled = !dirty || !state.user;
      saveButton.classList.toggle("is-dirty", dirty);
    }
    if (saveStatus) saveStatus.textContent = dirty ? "Есть несохранённые изменения" : "";
  };
  refreshSaveButton();
  saveButton?.addEventListener("click", async () => {
    if (!state.user) {
      location.hash = "#/register?mode=login";
      return;
    }
    saveButton.disabled = true;
    saveButton.textContent = "Сохранение…";
    if (saveStatus) saveStatus.textContent = "";
    try {
      await saveDataToFile();
      state.ui.cardsDirty = false;
      collectionPendingRemoved.clear();
      window.dispatchEvent(new CustomEvent("cardsdatasaved"));
      renderCollection();
    } catch (error) {
      console.error("Не удалось сохранить коллекцию:", error);
      if (saveStatus) saveStatus.textContent = "Не удалось сохранить. Повтори попытку.";
      saveButton.disabled = false;
      saveButton.textContent = "Повторить сохранение";
    }
  });
  window.addEventListener("cardsdatachanged", refreshSaveButton);
  window.addEventListener("cardsdatasaved", refreshSaveButton);

  document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state.filters.collectionMode = toggle.dataset.mode;
      renderCollection();
    });
  });

  if (groupMode === "packs") {
    attachPackAccordionEvents(app);
  }

  if (ownedCards.length && groupMode === "packs") {
    app.querySelectorAll(".pack-accordion.is-open .pack-group-content").forEach((contentEl) => {
      contentEl.style.maxHeight = "none";
    });
  }

  if (ownedCards.length) {
    attachCardImageFallbacks(app);
    attachCollectionCardEvents(app);
    app.querySelectorAll(".pokeball").forEach((ball) => {
      const cardId = ball.dataset.cardId;
      if (!cardId) return;
      if (collectionPendingRemoved.has(cardId) && !state.owned.has(cardId)) {
        ball.classList.remove("collected");
        ball.closest(".card-item")?.classList.add("pending-remove");
      }
    });
  }

}
