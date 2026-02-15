import {
    CARD_TYPE_FILTERS,
    RARITIES,
    RARITY_ICONS,
    TYPES,
    TYPE_ICONS,
} from "../config/packs.js";
import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import {
    formatCardCode,
    formatCardId,
    formatCardNumber,
    getCardCategory,
} from "./cards.js";

export function applyFilters(cards) {
  return cards
    .filter((card) => {
      if (state.filters.pack && state.filters.pack !== "ALL") {
        if (card.pack !== state.filters.pack) return false;
      }
      if (state.filters.pack === "ALL" && state.filters.packFilters && state.filters.packFilters.size) {
        if (!state.filters.packFilters.has(card.pack)) return false;
      }
      if (state.filters.query) {
        const q = state.filters.query.toLowerCase();
        const padded = formatCardNumber(card.number);
        const code = formatCardCode(card).toLowerCase();
        if (!card.name.toLowerCase().includes(q) && !padded.includes(q) && !String(card.number).includes(q) && !code.includes(q)) {
          return false;
        }
      }
      if (state.filters.rarities.size && !state.filters.rarities.has(card.rarity)) {
        return false;
      }
      if (state.filters.types.size && !state.filters.types.has(card.type)) {
        return false;
      }
      if (state.filters.cardType && state.filters.cardType !== "all") {
        const category = getCardCategory(card);
        if (state.filters.cardType === "POKEMON") {
          if (category !== "POKEMON") return false;
        } else if (category !== state.filters.cardType) {
          return false;
        }
      }
      if (state.filters.owned === "owned" && !state.owned.has(formatCardId(card))) {
        return false;
      }
      if (state.filters.owned === "missing" && state.owned.has(formatCardId(card))) {
        return false;
      }
      if (state.filters.owned === "wishlist") {
        const cardId = formatCardId(card);
        if (!state.wishlist.has(cardId)) return false;
        if (state.owned.has(cardId)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = state.filters.sortDir[state.filters.sort] === "desc" ? -1 : 1;
      let base = 0;
      if (state.filters.sort === "name") base = a.name.localeCompare(b.name, "ru") * dir;
      else if (state.filters.sort === "rarity") {
        const order = RARITIES;
        const aIndex = order.indexOf(a.rarity);
        const bIndex = order.indexOf(b.rarity);
        base = (aIndex - bIndex) * dir;
      } else {
        base = (a.number - b.number) * dir;
      }
      const deluxeId = "DELUXE PACK EX";
      if (a.name === b.name && a.rarity === b.rarity && a.pack !== b.pack) {
        if (a.pack === deluxeId) return 1;
        if (b.pack === deluxeId) return -1;
      }
      if (base !== 0) return base;
      if (state.filters.sort === "rarity") {
        const order = RARITIES;
        const aIndex = order.indexOf(a.rarity);
        const bIndex = order.indexOf(b.rarity);
        return (aIndex - bIndex) * dir;
      }
      return (a.number - b.number) * dir;
    });
}

export function renderFilters(extraGroups = "", options = {}) {
  const { showApplyButton = false } = options;
  const arrows = {
    asc: "▲",
    desc: "▼",
  };
  const activeArrow = arrows[state.filters.sortDir[state.filters.sort]];
  return `
    <div class="filters">
      ${extraGroups}
      <div class="filter-group">
        <h4>${t("filters.scale")}</h4>
        <div class="scale-group" id="scaleGroup">
          <button class="scale-btn ${state.filters.scale === "lg" ? "active" : ""}" data-scale="lg">
            <span class="scale-preview scale-lg">
              <span></span>
              <span></span>
            </span>
          </button>
          <button class="scale-btn ${state.filters.scale === "md" ? "active" : ""}" data-scale="md">
            <span class="scale-preview scale-md">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <button class="scale-btn ${state.filters.scale === "sm" ? "active" : ""}" data-scale="sm">
            <span class="scale-preview scale-sm">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>
      <div class="filter-group">
        <h4>${t("filters.search")}</h4>
        <input type="text" id="searchInput" placeholder="${t("filters.searchPlaceholder")}" value="${state.filters.query}" />
      </div>
      <div class="filter-group">
        <h4>${t("filters.sort")}</h4>
        <div class="toggle-group" id="sortGroup">
          <button class="toggle-btn ${state.filters.sort === "number" ? "active" : ""}" data-sort="number">
            <span class="sort-label">${t("filters.sortNumber")}</span>
            <span class="sort-arrow">${state.filters.sort === "number" ? activeArrow : ""}</span>
          </button>
          <button class="toggle-btn ${state.filters.sort === "name" ? "active" : ""}" data-sort="name">
            <span class="sort-label">${t("filters.sortName")}</span>
            <span class="sort-arrow">${state.filters.sort === "name" ? activeArrow : ""}</span>
          </button>
          <button class="toggle-btn ${state.filters.sort === "rarity" ? "active" : ""}" data-sort="rarity">
            <span class="sort-label">${t("filters.sortRarity")}</span>
            <span class="sort-arrow">${state.filters.sort === "rarity" ? activeArrow : ""}</span>
          </button>
        </div>
      </div>
      <div class="filter-group">
        <h4>${t("filters.owned")}</h4>
        <div class="toggle-group" id="ownedGroup">
          <button class="toggle-btn ${state.filters.owned === "all" ? "active" : ""}" data-owned="all">${t("filters.ownedAll")}</button>
          <button class="toggle-btn ${state.filters.owned === "owned" ? "active" : ""}" data-owned="owned">${t("filters.ownedHave")}</button>
          <button class="toggle-btn ${state.filters.owned === "missing" ? "active" : ""}" data-owned="missing">${t("filters.ownedMissing")}</button>
          <button class="toggle-btn ${state.filters.owned === "wishlist" ? "active" : ""}" data-owned="wishlist">${t("filters.ownedWishlist")}</button>
        </div>
      </div>
      <div class="filter-group">
        <h4>${t("filters.cardType")}</h4>
        <div class="toggle-group" id="cardTypeGroup">
          ${CARD_TYPE_FILTERS.map(
            (item) => `
              <button class="toggle-btn ${state.filters.cardType === item.id ? "active" : ""}" data-card-type="${item.id}">${t(item.labelKey)}</button>
            `
          ).join("")}
        </div>
      </div>
      <div class="filter-group">
        <h4>${t("filters.rarity")}</h4>
        <div class="filter-pills" id="rarityPills">
          ${RARITIES.map(
            (rarity) => `
              <button class="icon-pill ${state.filters.rarities.has(rarity) ? "active" : ""}" data-rarity="${rarity}">
                <img src="${RARITY_ICONS[rarity]}" alt="${rarity}" />
              </button>
            `
          ).join(" ")}
        </div>
      </div>
      <div class="filter-group">
        <h4>${t("filters.type")}</h4>
        <div class="filter-pills" id="typePills">
          ${TYPES.map(
            (type) => `
              <button class="icon-pill ${state.filters.types.has(type) ? "active" : ""}" data-type="${type}">
                <img src="${TYPE_ICONS[type]}" alt="${type}" />
              </button>
            `
          ).join(" ")}
        </div>
      </div>
      ${showApplyButton ? `
        <div class="filter-actions">
          <button class="toggle-btn filter-reset" id="filtersReset" type="button">${t("common.reset")}</button>
          <button class="toggle-btn filter-apply" id="filtersApply" type="button">${t("common.apply")}</button>
        </div>
      ` : ""}
    </div>
  `;
}

function getFilterSignature() {
  const sortDir = state.filters.sortDir || {};
  return JSON.stringify({
    pack: state.filters.pack,
    packFilters: [...(state.filters.packFilters || [])].sort(),
    query: state.filters.query || "",
    rarities: [...(state.filters.rarities || [])].sort(),
    types: [...(state.filters.types || [])].sort(),
    owned: state.filters.owned,
    cardType: state.filters.cardType,
    sort: state.filters.sort,
    sortDir: {
      number: sortDir.number,
      name: sortDir.name,
      rarity: sortDir.rarity,
    },
    scale: state.filters.scale,
  });
}

function resetAllPackFilters() {
  state.filters.query = "";
  state.filters.rarities = new Set();
  state.filters.types = new Set();
  state.filters.owned = "all";
  state.filters.cardType = "all";
  state.filters.sort = "number";
  state.filters.sortDir = {
    number: "asc",
    name: "asc",
    rarity: "asc",
  };
  state.filters.scale = "md";
  state.filters.packFilters = new Set();
}

export function renderAllPackGroup() {
  const packs = state.data?.packs || [];
  if (!packs.length) return "";
  const isOpen = !!state.ui.packFiltersOpen;
  return `
    <div class="filter-group">
      <button class="filter-toggle" id="packFilterToggle" type="button" aria-expanded="${isOpen}">
        <span>${t("filters.packs")}</span>
        <span class="filter-toggle-icon">${isOpen ? "▲" : "▼"}</span>
      </button>
      <div class="filter-collapsible ${isOpen ? "is-open" : ""}" id="packFilterWrap">
        <div class="toggle-group" id="packGroup">
          ${packs.map((pack) => {
            const active = state.filters.packFilters?.has(pack.id);
            return `<button class="toggle-btn ${active ? "active" : ""}" data-pack="${pack.id}">${pack.display}</button>`;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

export function attachFilterEvents(render, options = {}) {
  const { deferApply = false } = options;
  const searchInput = document.getElementById("searchInput");
  const scaleGroup = document.getElementById("scaleGroup");
  const sortGroup = document.getElementById("sortGroup");
  const ownedGroup = document.getElementById("ownedGroup");
  const cardTypeGroup = document.getElementById("cardTypeGroup");
  const rarityPills = document.getElementById("rarityPills");
  const typePills = document.getElementById("typePills");
  const packGroup = document.getElementById("packGroup");
  const packToggle = document.getElementById("packFilterToggle");
  const packWrap = document.getElementById("packFilterWrap");
  const applyButton = document.getElementById("filtersApply");
  const resetButton = document.getElementById("filtersReset");

  let lastAppliedSignature = getFilterSignature();
  const setPending = (isPending) => {
    if (!applyButton) return;
    applyButton.classList.toggle("is-pending", isPending);
    applyButton.disabled = !isPending;
  };
  const updatePending = () => {
    if (!deferApply) return;
    setPending(getFilterSignature() !== lastAppliedSignature);
  };

  const updateSortButtons = () => {
    if (!sortGroup) return;
    const arrows = { asc: "▲", desc: "▼" };
    const activeArrow = arrows[state.filters.sortDir[state.filters.sort]];
    sortGroup.querySelectorAll(".toggle-btn").forEach((btn) => {
      const sortType = btn.dataset.sort;
      const isActive = sortType === state.filters.sort;
      btn.classList.toggle("active", isActive);
      const arrow = btn.querySelector(".sort-arrow");
      if (arrow) arrow.textContent = isActive ? activeArrow : "";
    });
  };

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.filters.query = event.target.value;
      if (!deferApply) {
        const cursor = event.target.selectionStart || 0;
        render();
        requestAnimationFrame(() => {
          const freshInput = document.getElementById("searchInput");
          if (freshInput) {
            freshInput.focus();
            freshInput.setSelectionRange(cursor, cursor);
          }
        });
      } else {
        updatePending();
      }
    });
  }
  if (scaleGroup) {
    scaleGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".scale-btn");
      if (!btn) return;
      state.filters.scale = btn.dataset.scale;
      if (deferApply) {
        scaleGroup.querySelectorAll(".scale-btn").forEach((item) => {
          item.classList.toggle("active", item === btn);
        });
        updatePending();
      } else {
        render();
      }
    });
  }
  if (sortGroup) {
    sortGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".toggle-btn");
      if (!btn) return;
      const sortType = btn.dataset.sort;
      if (state.filters.sort === sortType) {
        state.filters.sortDir[sortType] = state.filters.sortDir[sortType] === "asc" ? "desc" : "asc";
      } else {
        state.filters.sort = sortType;
      }
      if (deferApply) {
        updateSortButtons();
        updatePending();
      } else {
        render();
      }
    });
  }
  if (ownedGroup) {
    ownedGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".toggle-btn");
      if (!btn) return;
      state.filters.owned = btn.dataset.owned;
      if (deferApply) {
        ownedGroup.querySelectorAll(".toggle-btn").forEach((item) => {
          item.classList.toggle("active", item === btn);
        });
        updatePending();
      } else {
        render();
      }
    });
  }
  if (cardTypeGroup) {
    cardTypeGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".toggle-btn");
      if (!btn) return;
      state.filters.cardType = btn.dataset.cardType || "all";
      if (deferApply) {
        cardTypeGroup.querySelectorAll(".toggle-btn").forEach((item) => {
          item.classList.toggle("active", item === btn);
        });
        updatePending();
      } else {
        render();
      }
    });
  }
  if (rarityPills) {
    rarityPills.addEventListener("click", (event) => {
      const pill = event.target.closest(".icon-pill");
      if (!pill) return;
      const rarity = pill.dataset.rarity;
      if (state.filters.rarities.has(rarity)) {
        state.filters.rarities.delete(rarity);
        pill.classList.remove("active");
      } else {
        state.filters.rarities.add(rarity);
        pill.classList.add("active");
      }
      if (!deferApply) {
        render();
      } else {
        updatePending();
      }
    });
  }
  if (typePills) {
    typePills.addEventListener("click", (event) => {
      const pill = event.target.closest(".icon-pill");
      if (!pill) return;
      const type = pill.dataset.type;
      if (state.filters.types.has(type)) {
        state.filters.types.delete(type);
        pill.classList.remove("active");
      } else {
        state.filters.types.add(type);
        pill.classList.add("active");
      }
      if (!deferApply) {
        render();
      } else {
        updatePending();
      }
    });
  }
  if (packGroup) {
    packGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".toggle-btn");
      if (!btn) return;
      const packId = btn.dataset.pack;
      if (!packId) return;
      if (state.filters.packFilters.has(packId)) {
        state.filters.packFilters.delete(packId);
        btn.classList.remove("active");
      } else {
        state.filters.packFilters.add(packId);
        btn.classList.add("active");
      }
      if (!deferApply) {
        render();
      } else {
        updatePending();
      }
    });
  }
  if (packToggle && packWrap) {
    packToggle.addEventListener("click", () => {
      state.ui.packFiltersOpen = !state.ui.packFiltersOpen;
      packWrap.classList.toggle("is-open", state.ui.packFiltersOpen);
      packToggle.setAttribute("aria-expanded", state.ui.packFiltersOpen ? "true" : "false");
      const icon = packToggle.querySelector(".filter-toggle-icon");
      if (icon) icon.textContent = state.ui.packFiltersOpen ? "▲" : "▼";
    });
  }

  if (applyButton) {
    applyButton.addEventListener("click", () => {
      lastAppliedSignature = getFilterSignature();
      setPending(false);
      render();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetAllPackFilters();
      render();
    });
  }

  updatePending();
}
