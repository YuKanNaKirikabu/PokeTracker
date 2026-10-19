import { t } from "../core/i18n.js?v=20261019-4";
import { state } from "../core/state.js";
import { saveGamePokedexToFile } from "../core/storage.js";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";
import {
    ensureGamePokedexLoaded,
    invalidateGamePokedexData,
    loadGameDexCatalog,
    getGamePokedexConfig,
    getGamePokedexData,
    getGamePokedexMarks,
    getPokedexEntryByName,
    getPokedexIconPath,
    getPokedexList,
    getPokedexSpriteFallback,
    getPokemonArtwork,
    getPokemonDisplayName,
    normalizePokemonName,
    setGamePokedexMarks
} from "../features/pokedex.js";
import { renderPlaceholder } from "./placeholder.js";

let lastGamePokedexId = null;

function updateFoundCountText(element, found, total) {
  if (!element) return;
  element.textContent = t("gamePokedex.found", { found, total });
}

export async function renderGamePokedex(gameId) {
  const app = document.getElementById("app");
  if (!getGamePokedexConfig(gameId)) {
    try { await loadGameDexCatalog(); }
    catch (error) {
      renderPlaceholder(t("projects.pokedexesTitle"), `${t("common.gameDataError")} ${String(error.message || error)}`);
      return;
    }
  }
  const config = getGamePokedexConfig(gameId);
  if (!config) {
    renderPlaceholder(t("projects.pokedexesTitle"), t("gamePokedex.empty"));
    return;
  }

  if (!config.listPath && !config.dexes?.some((dex) => dex.entries.length)) {
    const roman = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
    const generation = `Generation ${roman[config.generation] || config.generation}`;
    const details = [generation];
    if (Number.isFinite(config.pokemonCount)) details.push(`${config.pokemonCount} Pokémon`);
    setBrandSubtitle(config.title);
    setPageTitle(config.title);
    setPokedexSearchVisible(false);
    app.innerHTML = `
      <section class="placeholder game-pokedex-placeholder">
        <h1 class="section-title">${config.title}</h1>
        <p class="section-subtitle">${details.join(" · ")}</p>
        <p>${config.status === "coming-soon" ? "Coming 2027" : t("gamePokedex.empty")}</p>
        <a class="settings-btn secondary" href="#/projects/pokedexes">${t("gamePokedex.back")}</a>
      </section>
    `;
    return;
  }

  getPokedexList();
  const data = getGamePokedexData(gameId);
  const list = data.list || [];

  if (!data.loaded) {
    app.innerHTML = `
      <section class="placeholder">
        <h1 class="section-title">${config.title}</h1>
        <p>Loading...</p>
      </section>
    `;
    ensureGamePokedexLoaded(gameId).then(() => {
      if (location.hash.startsWith(`#/projects/pokedexes/${gameId}`)) {
        renderGamePokedex(gameId);
      }
    });
    return;
  }

  setBrandSubtitle(config.title);
  setPageTitle(config.title);
  setPokedexSearchVisible(true);
  if (!list.length) {
    app.innerHTML = `
      <section class="placeholder">
        <h1 class="section-title">${config.title}</h1>
        <p>${t("gamePokedex.empty")}</p>
        <a class="settings-btn secondary" href="#/projects/pokedexes">${t("gamePokedex.back")}</a>
      </section>
    `;
    return;
  }

  const selectedVersion = state.ui.gamePokedexVersion?.[gameId] !== undefined
    ? state.ui.gamePokedexVersion[gameId]
    : 0;

  const marks = getGamePokedexMarks(gameId, selectedVersion);
  const foundKeys = new Set([...marks.blue, ...marks.red]);

  const pageSize = config.pageSize || 30;
  if (lastGamePokedexId !== gameId) {
    state.ui.gamePokedexPage[gameId] = 1;
    lastGamePokedexId = gameId;
  }
  const totalPages = config.fixedPages || Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, state.ui.gamePokedexPage?.[gameId] || 1));
  state.ui.gamePokedexPage[gameId] = currentPage;
  const start = (currentPage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  const foundCount = list.filter((entry) => foundKeys.has(normalizePokemonName(entry.nameEn))).length;
  const rangeStart = start + 1;
  const rangeEnd = Math.min(start + pageSize, list.length);
  const cardsHtml = pageItems.map((entry) => {
    const key = normalizePokemonName(entry.nameEn);
    const baseEntry = getPokedexEntryByName(entry.nameEn) || entry;
    const displayName = getPokemonDisplayName(baseEntry);
    const iconPath = getPokedexIconPath(baseEntry);
    const artwork = getPokemonArtwork(entry.nameEn);
    const spriteFallback = getPokedexSpriteFallback(baseEntry);
    const fallbackSrc = artwork || spriteFallback || "";
    const fallbackData = fallbackSrc ? ` data-fallback-src="${fallbackSrc}"` : "";
    const iconHtml = iconPath
      ? `<img src="${iconPath}" alt="${displayName}"${fallbackData} onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
      : artwork
        ? `<img src="${artwork}" alt="${displayName}" onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
      : `<span>${displayName.slice(0, 1)}</span>`;
    const isSelected = marks.blue.has(key);
    const isMatch = false;
    return `
      <div class="game-pokedex-item ${isSelected ? "active" : ""} ${isMatch ? "match" : ""}" data-game-entry="${key}">
        <div class="game-pokedex-icon">
          ${iconHtml}
        </div>
        <div class="game-pokedex-number">${entry.numberStr}</div>
        <div class="game-pokedex-name">${displayName}</div>
      </div>
    `;
  }).join("");

  app.innerHTML = `
    <section>
      <div class="game-pokedex-header ${config.icons && config.icons.length > 1 && config.dexes && config.dexes.length > 1 ? "has-game-versions-and-dexes" : ""}">
        <div class="game-pokedex-meta">
          <h1 class="section-title">${config.title}</h1>
          <div class="section-subtitle" id="gamePokedexFound">${t("gamePokedex.found", { found: foundCount, total: list.length })}</div>
        </div>
        <div class="game-pokedex-header-lines">
          <div class="game-pokedex-pagination inline">
            <button class="toggle-btn" data-page="prev" type="button">${t("common.back")}</button>
            <span class="stat-label">${t("gamePokedex.page", { page: currentPage, total: totalPages })}</span>
            <button class="toggle-btn" data-page="next" type="button">${t("common.next")}</button>
          </div>
          <div class="game-pokedex-range inline">
            ${t("gamePokedex.range", { start: rangeStart, end: rangeEnd })}
          </div>
        </div>
        ${config.dexes && config.dexes.length > 1 ? `
          <div class="game-pokedex-versions game-pokedex-dexes" id="gamePokedexDexes">
            ${config.dexes.map((dex) => `
              <button class="version-btn ${dex.id === (state.ui.gamePokedexDex?.[gameId] || config.activeDexId) ? "active" : ""}" data-dex-id="${dex.id}" type="button">
                ${dex.title}
              </button>
            `).join("")}
          </div>
        ` : ""}
        ${config.icons && config.icons.length > 1 ? `
          <div class="game-pokedex-versions" id="gamePokedexVersions">
            ${config.icons.map((icon, idx) => `
              <button class="version-btn ${idx === selectedVersion ? "active" : ""}" data-version="${idx}">
                <img src="${icon.src}" alt="${icon.alt}" />
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="game-pokedex-grid-wrap">
        <div class="game-pokedex-grid">
          ${cardsHtml}
        </div>
      </div>
    </section>
  `;

  const foundCountEl = app.querySelector("#gamePokedexFound");

  app.querySelectorAll(".game-pokedex-item").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const key = card.dataset.gameEntry;
      if (!key) return;
      const nextMarks = getGamePokedexMarks(gameId, selectedVersion);
      const wasFound = foundKeys.has(key);
      if (nextMarks.blue.has(key)) {
        nextMarks.blue.delete(key);
        card.classList.remove("active");
      } else {
        nextMarks.blue.add(key);
        card.classList.add("active");
      }
      if (nextMarks.blue.has(key)) {
        foundKeys.add(key);
      } else {
        foundKeys.delete(key);
      }
      setGamePokedexMarks(gameId, nextMarks, selectedVersion);
      saveGamePokedexToFile().catch((error) => console.error("Game Pokedex save failed:", error));
      if (wasFound !== foundKeys.has(key)) {
        updateFoundCountText(foundCountEl, foundKeys.size, list.length);
      }
    });
  });

  attachGamePokedexSearch(gameId, list, pageSize);

  app.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.dataset.page;
      let next = dir === "next" ? currentPage + 1 : currentPage - 1;
      if (next > totalPages) next = 1;
      if (next < 1) next = totalPages;
      state.ui.gamePokedexPage[gameId] = next;
      renderGamePokedex(gameId);
    });
  });

  app.querySelectorAll("[data-dex-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.ui.gamePokedexDex = state.ui.gamePokedexDex || {};
      state.ui.gamePokedexDex[gameId] = btn.dataset.dexId;
      invalidateGamePokedexData(gameId);
      renderGamePokedex(gameId);
    });
  });

  document.querySelectorAll(".version-btn[data-version]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const version = parseInt(btn.dataset.version, 10);
      state.ui.gamePokedexVersion = state.ui.gamePokedexVersion || {};
      state.ui.gamePokedexVersion[gameId] = version;
      renderGamePokedex(gameId);
    });
  });
}

function attachGamePokedexSearch(gameId, list, pageSize) {
  const input = document.getElementById("pokedexSearchInput");
  if (!input) return;
  input.value = state.ui.gamePokedexSearch || "";
  input.placeholder = t("header.searchPlaceholder");
  if (input._pokedexHandler) input.removeEventListener("input", input._pokedexHandler);
  if (input._gamePokedexHandler) input.removeEventListener("input", input._gamePokedexHandler);

  const handler = () => {
    state.ui.gamePokedexSearch = input.value;
    const raw = input.value.trim().toLowerCase();
    document.querySelectorAll(".game-pokedex-item.search-pulse, .game-pokedex-item.match").forEach((item) => {
      item.classList.remove("search-pulse", "match");
    });
    if (!raw) return;
    const matchIndex = getGamePokedexMatchIndex(raw, list);
    if (matchIndex < 0) return;
    const nextPage = Math.floor(matchIndex / pageSize) + 1;
    const currentPage = state.ui.gamePokedexPage?.[gameId] || 1;
    if (nextPage !== currentPage) {
      state.ui.gamePokedexPage[gameId] = nextPage;
      renderGamePokedex(gameId).then(() => pulseSearchMatch(gameId, list[matchIndex]));
      return;
    }
    const key = normalizePokemonName(list[matchIndex].nameEn);
    const target = document.querySelector(`.game-pokedex-item[data-game-entry="${key}"]`);
    if (target) pulseSearchTarget(target);
  };
  input.addEventListener("input", handler);
  input._gamePokedexHandler = handler;
}

function pulseSearchTarget(target) {
  target.classList.remove("match", "search-pulse");
  const scroller = document.querySelector(".content");
  if (scroller) {
    const viewport = scroller.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    const margin = Math.max(16, (viewport.height - item.height) / 2);
    if (item.top < viewport.top + margin) {
      scroller.scrollBy({ top: item.top - viewport.top - margin, behavior: "smooth" });
    } else if (item.bottom > viewport.bottom - margin) {
      scroller.scrollBy({ top: item.bottom - viewport.bottom + margin, behavior: "smooth" });
    }
  }
  target.classList.add("search-pulse");
  target.addEventListener("animationend", () => target.classList.remove("search-pulse"), { once: true });
}

function pulseSearchMatch(gameId, entry) {
  if (!location.hash.startsWith(`#/projects/pokedexes/${gameId}`)) return;
  const key = normalizePokemonName(entry.nameEn);
  const target = document.querySelector(`.game-pokedex-item[data-game-entry="${key}"]`);
  if (target) pulseSearchTarget(target);
}

function getGamePokedexMatchIndex(raw, list) {
  if (!raw) return -1;
  const isNumber = /^\d+$/.test(raw);
  if (isNumber) {
    const needle = raw.padStart(Math.min(3, raw.length), "0");
    return list.findIndex((entry) => String(entry.numberStr || "").startsWith(needle));
  }
  return list.findIndex((entry) => {
    const baseEntry = getPokedexEntryByName(entry.nameEn) || entry;
    const nameRu = String(getPokemonDisplayName(baseEntry)).toLowerCase();
    const nameEn = String(entry.nameEn || "").toLowerCase();
    return nameEn.includes(raw) || (nameRu && nameRu.includes(raw));
  });
}
