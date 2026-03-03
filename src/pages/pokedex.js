import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";
import { attachCardEvents } from "../features/cards.js";
import {
    formatDexNumber,
    getPokedexIconPath,
    getPokedexList,
    getPokedexRegion,
    getPokedexSpriteFallback,
    getPokemonArtwork,
    getPokemonDisplayName,
    getPokemonTypes,
    renderGameIcons,
    renderPokedexDetail,
    renderPokemonTypeIcons,
} from "../features/pokedex.js";

export function renderPokedex() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("pokedex.title"));
  setPageTitle(t("pokedex.title"));
  setPokedexSearchVisible(true);
  const list = getPokedexList();
  if (!list.length) {
    app.innerHTML = `
      <section class="placeholder">
        <h1 class="section-title">${t("pokedex.title")}</h1>
        <p>${t("pokedex.empty")}</p>
      </section>
    `;
    return;
  }
  const selectedNumber = state.ui.pokedexSelected || 1;
  const selected = list.find((entry) => entry.number === selectedNumber) || list[0];
  state.ui.pokedexSelected = selected.number;
  const listHtml = list
    .map((entry) => {
      const displayName = getPokemonDisplayName(entry);
      const region = getPokedexRegion(entry.number);
      const types = getPokemonTypes(entry.nameEn);
      const iconPath = getPokedexIconPath(entry);
      const artwork = getPokemonArtwork(entry.nameEn);
      const spriteFallback = getPokedexSpriteFallback(entry);
      const fallbackSrc = artwork || spriteFallback || "";
      const fallbackData = fallbackSrc ? ` data-fallback-src="${fallbackSrc}"` : "";
      const iconHtml = iconPath
        ? `<img src="${iconPath}" alt="${displayName}"${fallbackData} onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
        : artwork
          ? `<img src="${artwork}" alt="${displayName}" onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
          : `<span>${displayName.slice(0, 1)}</span>`;
      return `
        <button class="pokedex-item ${entry.number === selected.number ? "active" : ""}" data-dex="${entry.number}" type="button">
          <div class="pokedex-icon">
            ${iconHtml}
          </div>
          <div class="pokedex-info">
            <div class="pokedex-title">
              <span class="pokedex-number">${formatDexNumber(entry.number)}</span>
              <span class="pokedex-name">${displayName}</span>
            </div>
            <div class="pokedex-subline">
              <span class="pokedex-region">${region}</span>
              <span class="pokedex-types">${renderPokemonTypeIcons(types, "icon-xs")}</span>
            </div>
            ${renderGameIcons(entry.nameEn)}
          </div>
        </button>
      `;
    })
    .join("");

  app.innerHTML = `
    <section class="pokedex-page">
      <div class="pokedex-layout">
        <aside class="pokedex-list">
          ${listHtml}
        </aside>
        ${renderPokedexDetail(selected)}
      </div>
    </section>
  `;
  const listEl = app.querySelector(".pokedex-list");
  if (listEl && Number.isFinite(state.ui.pokedexListScroll)) {
    requestAnimationFrame(() => {
      listEl.scrollTop = state.ui.pokedexListScroll;
    });
  }
  const stripEl = app.querySelector("#pokedexCardStrip");
  if (stripEl && Number.isFinite(state.ui.pokedexCardScroll)) {
    requestAnimationFrame(() => {
      stripEl.scrollLeft = state.ui.pokedexCardScroll;
    });
  }
  attachPokedexSearch(list);
  attachPokedexEvents(selected.number);
}

function attachPokedexSearch(list) {
  const input = document.getElementById("pokedexSearchInput");
  if (!input) return;
  if (input._pokedexHandler) {
    input.removeEventListener("input", input._pokedexHandler);
  }
  if (input._gamePokedexHandler) {
    input.removeEventListener("input", input._gamePokedexHandler);
  }
  const handler = () => {
    const listEl = document.querySelector(".pokedex-list");
    if (!listEl) return;
    const raw = input.value.trim().toLowerCase();
    listEl.querySelectorAll(".pokedex-item.match").forEach((item) => {
      item.classList.remove("match");
    });
    if (!raw) return;
    const isNumber = /^\d+$/.test(raw);
    const match = list.find((entry) => {
      if (isNumber) {
        return entry.numberStr.startsWith(raw.padStart(Math.min(4, raw.length), "0"));
      }
      return (
        getPokemonDisplayName(entry).toLowerCase().includes(raw)
        || entry.nameEn.toLowerCase().includes(raw)
      );
    });
    if (!match) return;
    const target = listEl.querySelector(`.pokedex-item[data-dex="${match.number}"]`);
    if (target) {
      target.classList.add("match");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  input.addEventListener("input", handler);
  input._pokedexHandler = handler;
}

function attachPokedexEvents(selectedNumber) {
  const saveScrollState = () => {
    const listEl = document.querySelector(".pokedex-list");
    const stripEl = document.getElementById("pokedexCardStrip");
    if (listEl) {
      state.ui.pokedexListScroll = listEl.scrollTop;
    }
    if (stripEl) {
      state.ui.pokedexCardScroll = stripEl.scrollLeft;
    }
  };
  document.querySelectorAll(".pokedex-item").forEach((item) => {
    item.addEventListener("click", () => {
      const dex = Number(item.dataset.dex);
      if (!dex) return;
      saveScrollState();
      state.ui.pokedexSelected = dex;
      state.ui.pokedexGender = "common";
      location.hash = `#/pokedex?no=${formatDexNumber(dex)}`;
    });
  });
  document.querySelectorAll(".gender-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.ui.pokedexGender = btn.dataset.gender;
      renderPokedex();
    });
  });
  const strip = document.getElementById("pokedexCardStrip");
  const prev = document.getElementById("pokedexScrollPrev");
  const next = document.getElementById("pokedexScrollNext");
  if (strip && prev && next) {
    prev.addEventListener("click", () => {
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      const atStart = strip.scrollLeft <= 4;
      if (atStart) {
        strip.scrollTo({ left: maxScroll, behavior: "smooth" });
        return;
      }
      strip.scrollBy({ left: -420, behavior: "smooth" });
    });
    next.addEventListener("click", () => {
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      const atEnd = strip.scrollLeft >= maxScroll - 4;
      if (atEnd) {
        strip.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      strip.scrollBy({ left: 420, behavior: "smooth" });
    });
  }
  const renderWithScroll = () => {
    saveScrollState();
    renderPokedex();
  };
  attachCardEvents(renderWithScroll);
  document.querySelectorAll(".pokedex-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".wishlist-heart") || event.target.closest(".pokeball")) return;
      const pack = card.dataset.pack;
      if (!pack) return;
      location.hash = `#/pack/${encodeURIComponent(pack)}`;
    });
  });
}
