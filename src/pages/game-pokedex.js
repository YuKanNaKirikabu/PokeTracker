import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveGamePokedexToFile } from "../core/storage.js";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";
import {
    ensureGamePokedexLoaded,
    getGamePokedexConfig,
    getGamePokedexData,
    getGamePokedexMarks,
    getPokedexEntryByName,
    getPokedexIconPath,
    getPokedexList,
    getPokemonDisplayName,
    normalizePokemonName,
    setGamePokedexMarks
} from "../features/pokedex.js";
import { renderPlaceholder } from "./placeholder.js";

let lastGamePokedexId = null;
let allowNavigation = false;
let pendingNavigation = null;

function setGamePokedexDirty(isDirty) {
  state.ui.gamePokedexDirty = isDirty;
  const button = document.getElementById("gamePokedexSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

function updateFoundCountText(element, found, total) {
  if (!element) return;
  element.textContent = t("gamePokedex.found", { found, total });
}

function openUnsavedModal() {
  const modal = document.getElementById("gamePokedexUnsavedModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeUnsavedModal() {
  const modal = document.getElementById("gamePokedexUnsavedModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function ensureGamePokedexGuard() {
  if (ensureGamePokedexGuard.bound) return;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#/']");
    if (!link) return;
    if (allowNavigation) return;
    if (!state.ui.gamePokedexDirty) return;
    if (!location.hash.startsWith("#/projects/pokedexes")) return;
    const target = link.getAttribute("href");
    if (!target || target === location.hash) return;
    event.preventDefault();
    pendingNavigation = target;
    openUnsavedModal();
  });
  ensureGamePokedexGuard.bound = true;
}

export function renderGamePokedex(gameId) {
  const app = document.getElementById("app");
  const config = getGamePokedexConfig(gameId);
  if (!config) {
    renderPlaceholder(t("projects.pokedexesTitle"), t("gamePokedex.empty"));
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
  const searchInput = document.getElementById("pokedexSearchInput");
  const searchRaw = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const matchIndex = getGamePokedexMatchIndex(searchRaw, list);
  const matchKey = matchIndex >= start && matchIndex < start + pageSize
    ? normalizePokemonName(list[matchIndex].nameEn)
    : null;

  const cardsHtml = pageItems.map((entry) => {
    const key = normalizePokemonName(entry.nameEn);
    const baseEntry = getPokedexEntryByName(entry.nameEn) || entry;
    const displayName = getPokemonDisplayName(baseEntry);
    const iconPath = getPokedexIconPath(baseEntry);
    const iconHtml = iconPath
      ? `<img src="${iconPath}" alt="${displayName}" loading="lazy" decoding="async" />`
      : `<span>${displayName.slice(0, 1)}</span>`;
    const isSelected = marks.blue.has(key);
    const isMatch = matchKey && key === matchKey;
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
      <div class="game-pokedex-header">
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
    <button class="game-pokedex-save-btn left" id="gamePokedexSaveBtn" type="button" disabled>
      ${t("gamePokedex.save")}
    </button>
    <div class="game-pokedex-unsaved" id="gamePokedexUnsavedModal" aria-hidden="true">
      <div class="game-pokedex-unsaved-backdrop" data-unsaved-backdrop></div>
      <div class="game-pokedex-unsaved-card" role="dialog" aria-modal="true" aria-labelledby="gamePokedexUnsavedTitle" aria-describedby="gamePokedexUnsavedText">
        <h2 id="gamePokedexUnsavedTitle">${t("gamePokedex.unsavedTitle")}</h2>
        <p id="gamePokedexUnsavedText">${t("gamePokedex.unsavedText")}</p>
        <div class="game-pokedex-unsaved-actions">
          <button class="settings-btn secondary" type="button" data-unsaved-stay>${t("gamePokedex.unsavedStay")}</button>
          <button class="settings-btn primary" type="button" data-unsaved-leave>${t("gamePokedex.unsavedLeave")}</button>
        </div>
      </div>
    </div>
  `;

  ensureGamePokedexGuard();
  setGamePokedexDirty(Boolean(state.ui.gamePokedexDirty));

  const foundCountEl = app.querySelector("#gamePokedexFound");
  const saveButton = app.querySelector("#gamePokedexSaveBtn");
  saveButton?.addEventListener("click", async () => {
    await saveGamePokedexToFile();
    setGamePokedexDirty(false);
  });

  const unsavedModal = app.querySelector("#gamePokedexUnsavedModal");
  const stayBtn = unsavedModal?.querySelector("[data-unsaved-stay]");
  const leaveBtn = unsavedModal?.querySelector("[data-unsaved-leave]");
  const backdrop = unsavedModal?.querySelector("[data-unsaved-backdrop]");
  stayBtn?.addEventListener("click", () => {
    pendingNavigation = null;
    closeUnsavedModal();
  });
  leaveBtn?.addEventListener("click", () => {
    const target = pendingNavigation;
    pendingNavigation = null;
    closeUnsavedModal();
    if (!target) return;
    allowNavigation = true;
    location.hash = target;
    allowNavigation = false;
  });
  backdrop?.addEventListener("click", () => {
    pendingNavigation = null;
    closeUnsavedModal();
  });

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
      setGamePokedexDirty(true);
      if (wasFound !== foundKeys.has(key)) {
        updateFoundCountText(foundCountEl, foundKeys.size, list.length);
      }
    });
  });

  attachGamePokedexSearch(gameId, list, pageSize);

  const matchEl = app.querySelector(".game-pokedex-item.match");
  if (matchEl) {
    requestAnimationFrame(() => {
      matchEl.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

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

  document.querySelectorAll(".version-btn").forEach((btn) => {
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
  if (input._pokedexHandler) {
    input.removeEventListener("input", input._pokedexHandler);
  }
  if (input._gamePokedexHandler) {
    input.removeEventListener("input", input._gamePokedexHandler);
  }
  const handler = () => {
    const raw = input.value.trim().toLowerCase();
    document.querySelectorAll(".game-pokedex-item.match").forEach((item) => {
      item.classList.remove("match");
    });
    if (!raw) return;
    const matchIndex = getGamePokedexMatchIndex(raw, list);
    if (matchIndex < 0) return;
    const nextPage = Math.floor(matchIndex / pageSize) + 1;
    const currentPage = state.ui.gamePokedexPage?.[gameId] || 1;
    if (nextPage !== currentPage) {
      state.ui.gamePokedexPage[gameId] = nextPage;
      renderGamePokedex(gameId);
      return;
    }
    const key = normalizePokemonName(list[matchIndex].nameEn);
    const target = document.querySelector(`.game-pokedex-item[data-game-entry="${key}"]`);
    if (target) {
      target.classList.add("match");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  input.addEventListener("input", handler);
  input._gamePokedexHandler = handler;
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
