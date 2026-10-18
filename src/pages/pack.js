import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveDataToFile } from "../core/storage.js";
import { setPokedexSearchVisible } from "../core/ui.js";
import { getPack, getSubpacks, resolveSubpack, filterPackCards } from "../core/packs.js";
import { attachCardEvents, formatCardId, renderCardGrid } from "../features/cards.js";
import { applyFilters, attachFilterEvents, renderAllPackGroup, renderFilters } from "../features/filters.js";

function renderSubpackSelector(pack, activeSubpack, count) {
  const children = getSubpacks(pack);
  if (!children.length) return "";
  const activeId = activeSubpack?.id || "all";
  return `
    <div class="filter-group filter-subpack-group">
      <div class="filter-context-title">
        <strong>${pack.display || pack.id}</strong>
        <span>${count}</span>
      </div>
      <div class="toggle-group" id="subpackGroup">
        <button class="toggle-btn ${activeId === "all" ? "active" : ""}" data-subpack="all" type="button">${t("common.all")}</button>
        ${children.map((subpack) => {
          const id = subpack.id || subpack.display;
          return `<button class="toggle-btn ${id === activeId ? "active" : ""}" data-subpack="${id}" type="button">${subpack.display || id}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}

function attachSubpackEvents(pack, activeSubpack) {
  const group = document.getElementById("subpackGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-subpack]");
    if (!button) return;
    const value = button.dataset.subpack;
    const query = value && value !== "all" ? `?sub=${encodeURIComponent(value)}` : "";
    location.hash = `#/pack/${encodeURIComponent(pack.id)}${query}`;
  });
}

function renderPackMedia(pack, activeSubpack) {
  if (pack.kind === "collection") {
    const subpacks = getSubpacks(pack);
    const selected = activeSubpack ? [activeSubpack] : subpacks;
    return `<div class="pack-children-media">${selected.map((sub) => {
      const url = sub.logo || sub.artwork || "";
      return url ? `<img src="${url}" alt="${sub.display || sub.id}" class="pack-logo" loading="lazy" decoding="async" />` : "";
    }).join("")}</div>`;
  }
  const url = pack.logo || pack.artwork || "";
  return url ? `<img src="${url}" alt="${pack.display || pack.id}" class="pack-logo" loading="lazy" decoding="async" />` : "";
}

function renderPackHeaderContext(media) {
  const context = document.getElementById("packHeaderContext");
  if (!context) return;
  context.innerHTML = media || "";
  context.hidden = false;
}

function renderPackScaleControl() {
  const control = document.getElementById("packScaleControl");
  if (!control) return;
  const labels = { lg: "Крупные", md: "Средние", sm: "Мелкие" };
  control.innerHTML = `
    <span class="pack-scale-label">Размер карт</span>
    <div class="scale-group" id="packScaleGroup" role="group" aria-label="Размер карт">
      ${Object.entries(labels).map(([value, label]) => `
        <button class="scale-btn ${state.filters.scale === value ? "active" : ""}" data-scale="${value}" type="button" aria-label="${label}" title="${label}">${label}</button>
      `).join("")}
    </div>
  `;
  control.hidden = false;
}

export function renderPack(packTitle, subpackValue) {
  const app = document.getElementById("app");
  setPokedexSearchVisible(true);
  state.filters.pack = packTitle;

  if (!state.data?.cards?.length) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${t("pack.loadErrorTitle")}</h1><p>${t("pack.loadErrorText")}</p><p style="color:var(--muted);font-size:12px">${t("pack.loadErrorHint")}</p></section>`;
    return;
  }

  if (packTitle === "ALL") {
    const cards = applyFilters(state.data.cards);
    const ownedCount = state.data.cards.filter((card) => state.owned.has(formatCardId(card))).length;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(`<div class="filter-group filter-context-group"><div class="filter-context-title"><strong>${t("pack.allTitle")}</strong><span>${ownedCount}/${state.data.cards.length}</span></div>${renderAllPackGroup()}</div>`, { showApplyButton: true, showSearch: false })}
        <div><div class="pack-header-info"><button class="game-pokedex-save-btn left" id="collectionSaveBtn" type="button" disabled>${t("gamePokedex.save")}</button></div>${renderCardGrid(cards)}</div>
      </section>`;
    renderPackHeaderContext("");
    renderPackScaleControl();
    attachFilterEvents(() => renderPack("ALL"), { deferApply: true });
    attachCollectionSave();
    attachCardEvents(() => renderPack("ALL"), { rerenderOnToggle: false });
    attachHeaderPackSearch(() => renderPack("ALL"));
    attachMobileFilterToggle();
    return;
  }

  const pack = getPack(packTitle);
  if (!pack) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${packTitle}</h1><p>${t("pack.notAdded")}</p></section>`;
    return;
  }

  const activeSubpack = resolveSubpack(pack, subpackValue);
  const visibleCards = filterPackCards(state.data.cards, pack, activeSubpack);
  const cards = applyFilters(visibleCards);
  const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
  const selector = renderSubpackSelector(pack, activeSubpack, `${ownedCount}/${visibleCards.length}`);
  const title = activeSubpack ? (activeSubpack.display || activeSubpack.id) : (pack.display || pack.id);

  app.innerHTML = `
    <section class="pack-page">
      ${renderFilters(selector, { showApplyButton: true, showSearch: false })}
      <div>
        <div class="pack-header-info"><button class="game-pokedex-save-btn left" id="collectionSaveBtn" type="button" disabled>${t("gamePokedex.save")}</button></div>
        ${renderCardGrid(cards)}
      </div>
    </section>`;
  renderPackHeaderContext(renderPackMedia(pack, activeSubpack));
  renderPackScaleControl();
  attachFilterEvents(() => renderPack(pack.id, activeSubpack?.id || activeSubpack?.display), { deferApply: true });
  attachCollectionSave();
  attachMobileFilterToggle();
  attachSubpackEvents(pack, activeSubpack);
  attachCardEvents(() => renderPack(pack.id, activeSubpack?.id || activeSubpack?.display), { rerenderOnToggle: false });
  attachHeaderPackSearch(() => renderPack(pack.id, activeSubpack?.id || activeSubpack?.display));
}

function attachMobileFilterToggle() {
  const button = document.getElementById("mobileFiltersToggle");
  const filters = document.querySelector(".pack-page .filters");
  if (!button || !filters) return;
  button.style.display = "";
  button.addEventListener("click", () => {
    const open = filters.classList.toggle("mobile-open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function attachHeaderPackSearch(render) {
  const input = document.getElementById("pokedexSearchInput");
  if (!input) return;
  input.placeholder = t("filters.searchPlaceholder");
  if (input._pokedexHandler) input.removeEventListener("input", input._pokedexHandler);
  if (input._packHandler) input.removeEventListener("input", input._packHandler);
  input.value = state.ui.packSearch || "";
  const handler = (event) => {
    state.ui.packSearch = event.target.value;
    state.filters.query = state.ui.packSearch;
    render();
    const nextInput = document.getElementById("pokedexSearchInput");
    nextInput?.focus();
    if (nextInput) nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  };
  input.addEventListener("input", handler);
  input._packHandler = handler;
}

function attachCollectionSave() {
  const button = document.getElementById("collectionSaveBtn");
  if (!button) return;
  const refresh = () => {
    const current = document.getElementById("collectionSaveBtn");
    if (!current) return;
    current.disabled = !state.user || !state.ui.cardsDirty;
    current.classList.toggle("is-dirty", Boolean(state.ui.cardsDirty));
  };
  if (!window.__collectionSaveRefreshBound) {
    window.addEventListener("cardsdatachanged", () => {
      const current = document.getElementById("collectionSaveBtn");
      if (current) { current.disabled = !state.user || !state.ui.cardsDirty; current.classList.toggle("is-dirty", Boolean(state.ui.cardsDirty)); }
    });
    window.addEventListener("cardsdatasaved", () => {
      const current = document.getElementById("collectionSaveBtn");
      if (current) { current.disabled = !state.user || !state.ui.cardsDirty; current.classList.toggle("is-dirty", Boolean(state.ui.cardsDirty)); }
    });
    window.__collectionSaveRefreshBound = true;
  }
  refresh();
  button.addEventListener("click", async () => {
    if (!state.user) { location.hash = "#/register?mode=login"; return; }
    if (!state.ui.cardsDirty) return;
    button.disabled = true;
    try {
      await saveDataToFile();
      state.ui.cardsDirty = false;
      window.dispatchEvent(new CustomEvent("cardsdatasaved"));
    } catch (error) {
      button.disabled = false;
      window.alert("Не удалось сохранить коллекцию: " + error.message);
    }
    refresh();
  });
}
