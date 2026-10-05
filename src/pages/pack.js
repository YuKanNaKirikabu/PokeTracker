import { getPackSubpacks } from "../core/data.js";
import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveDataToFile } from "../core/storage.js";
import { attachCardEvents, formatCardId, renderCardGrid } from "../features/cards.js";
import { applyFilters, attachFilterEvents, renderAllPackGroup, renderFilters } from "../features/filters.js";

const ALL_CARDS_BATCH_SIZE = 150;

function renderBatchedCardGrid(cards) {
  const initialCards = cards.slice(0, ALL_CARDS_BATCH_SIZE);
  return `<div id="allCardsGrid" class="cards-grid" style="--card-scale: 1; --icon-scale: 1">${renderCardGrid(initialCards).replace(/^\s*<div class="cards-grid"[^>]*>|<\/div>\s*$/g, "")}</div><div id="allCardsSentinel" aria-hidden="true"></div>`;
}

function attachCardsInfiniteScroll(cards) {
  const grid = document.querySelector("#allCardsGrid");
  const sentinel = document.querySelector("#allCardsSentinel");
  if (!grid || !sentinel || cards.length <= ALL_CARDS_BATCH_SIZE) {
    sentinel?.remove();
    return;
  }
  let nextIndex = ALL_CARDS_BATCH_SIZE;
  const appendNextBatch = () => {
    if (nextIndex >= cards.length) return;
    const batch = cards.slice(nextIndex, nextIndex + ALL_CARDS_BATCH_SIZE);
    const template = document.createElement("template");
    template.innerHTML = renderCardGrid(batch);
    const batchGrid = template.content.firstElementChild;
    if (batchGrid) grid.append(...batchGrid.children);
    nextIndex += batch.length;
    if (nextIndex >= cards.length) {
      observer.disconnect();
      sentinel.remove();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) appendNextBatch();
  }, { rootMargin: "600px 0px" });
  observer.observe(sentinel);
}

function renderCardsSaveButton() {
  return `<button class="game-pokedex-save-btn left" id="cardsSaveBtn" type="button" disabled>${t("gamePokedex.save")}</button>`;
}

function setCardsDirty(isDirty) {
  state.ui.cardsDirty = isDirty;
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

function attachCardsSaveButton() {
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.addEventListener("click", async () => {
    await saveDataToFile();
    setCardsDirty(false);
  });
  setCardsDirty(Boolean(state.ui.cardsDirty));
}

function renderSubpackGroup(subpacks, activeKey) {
  if (!subpacks.length) return "";
  return `<div class="filter-group"><div class="toggle-group" data-subpack-group><button class="toggle-btn ${activeKey === "all" ? "active" : ""}" data-subpack="all">${t("common.all")}</button>${subpacks.map((sub) => `<button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.label}</button>`).join("")}</div></div>`;
}

function attachSubpackEvents(packId) {
  const group = document.querySelector("[data-subpack-group]");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const button = event.target.closest(".toggle-btn");
    if (!button) return;
    const query = button.dataset.subpack === "all" ? "" : `?sub=${encodeURIComponent(button.dataset.subpack)}`;
    location.hash = `#/pack/${encodeURIComponent(packId)}${query}`;
  });
}

function renderPackPage(packTitle, packData, subpack) {
  const subpacks = getPackSubpacks(packData.id);
  const activeSubpack = subpacks.some((item) => item.key === subpack) ? subpack : "all";
  const subpackData = subpacks.find((item) => item.key === activeSubpack);
  const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
  const visibleCards = activeSubpack === "all" ? baseCards : baseCards.filter((card) => card.subpacks?.includes(subpackData.name));
  const cards = applyFilters(visibleCards);
  const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
  const logo = subpackData?.artwork || packData.logo || packData.artwork || "";
  const app = document.getElementById("app");

  app.innerHTML = `<section class="pack-page">${renderFilters(renderSubpackGroup(subpacks, activeSubpack))}<div><div class="pack-header"><img src="${logo}" alt="${packData.display || packData.id}" class="pack-logo" loading="lazy" decoding="async" /></div><p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>${renderBatchedCardGrid(cards)}</div></section>${renderCardsSaveButton()}`;
  attachFilterEvents(() => renderPack(packTitle, activeSubpack));
  attachSubpackEvents(packData.id);
  attachCardEvents(() => renderPack(packTitle, activeSubpack), { rerenderOnToggle: false });
  attachCardsInfiniteScroll(cards);
  attachCardsSaveButton();
}

export function renderPack(packTitle, subpack) {
  const app = document.getElementById("app");
  state.filters.pack = packTitle;
  if (!state.data?.cards?.length) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${t("pack.loadErrorTitle")}</h1><p>${t("pack.loadErrorText")}</p><p style="color: var(--muted); font-size: 12px;">${t("pack.loadErrorHint")}</p></section>`;
    return;
  }
  if (packTitle === "ALL") {
    const cards = applyFilters(state.data.cards);
    const ownedCount = state.data.cards.filter((card) => state.owned.has(formatCardId(card))).length;
    app.innerHTML = `<section class="pack-page">${renderFilters(renderAllPackGroup(), { showApplyButton: true })}<div><h1 class="section-title">${t("pack.allTitle")}</h1><p class="section-subtitle">${ownedCount}/${state.data.cards.length}</p>${renderBatchedCardGrid(cards)}</div></section>${renderCardsSaveButton()}`;
    attachFilterEvents(() => renderPack("ALL"), { deferApply: true });
    attachCardEvents(() => renderPack("ALL"), { rerenderOnToggle: false, root: app });
    attachCardsInfiniteScroll(cards);
    attachCardsSaveButton();
    return;
  }
  const packData = state.data.packs.find((pack) => pack.id === packTitle);
  if (!packData) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${packTitle}</h1><p>${t("pack.notAdded")}</p></section>`;
    return;
  }
  renderPackPage(packTitle, packData, subpack);
}
