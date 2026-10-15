import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { getPack, getSubpacks, resolveSubpack, filterPackCards } from "../core/packs.js";
import { attachCardEvents, formatCardId, renderCardGrid } from "../features/cards.js";
import { applyFilters, attachFilterEvents, renderAllPackGroup, renderFilters } from "../features/filters.js";

function renderSubpackSelector(pack, activeSubpack) {
  const children = getSubpacks(pack);
  if (!children.length) return "";
  const activeId = activeSubpack?.id || "all";
  return `
    <div class="filter-group">
      <h4>${pack.display || pack.id}</h4>
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

export function renderPack(packTitle, subpackValue) {
  const app = document.getElementById("app");
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
        ${renderFilters(renderAllPackGroup(), { showApplyButton: true })}
        <div><h1 class="section-title">${t("pack.allTitle")}</h1><p class="section-subtitle">${ownedCount}/${state.data.cards.length}</p>${renderCardGrid(cards)}</div>
      </section>`;
    attachFilterEvents(() => renderPack("ALL"), { deferApply: true });
    attachCardEvents(() => renderPack("ALL"), { rerenderOnToggle: false });
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
  const selector = renderSubpackSelector(pack, activeSubpack);
  const title = activeSubpack ? (activeSubpack.display || activeSubpack.id) : (pack.display || pack.id);

  app.innerHTML = `
    <section class="pack-page">
      ${renderFilters(selector)}
      <div>
        <div class="pack-header">${renderPackMedia(pack, activeSubpack)}</div>
        <h1 class="section-title">${title}</h1>
        <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
        ${renderCardGrid(cards)}
      </div>
    </section>`;
  attachFilterEvents(() => renderPack(pack.id, activeSubpack?.id || activeSubpack?.display));
  attachSubpackEvents(pack, activeSubpack);
  attachCardEvents(() => renderPack(pack.id, activeSubpack?.id || activeSubpack?.display), { rerenderOnToggle: false });
}
