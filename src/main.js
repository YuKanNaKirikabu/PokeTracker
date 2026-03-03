import { loadData } from "./core/data.js";
import { applyTranslations, t } from "./core/i18n.js";
import { initStorage, loadBootstrapFromFile } from "./core/storage.js";
import { applyTheme, normalizeUiSettings } from "./core/theme.js";
import { setupSidePanel } from "./core/ui.js";
import { loadPokedexNamesFromFile } from "./features/pokedex.js";
import { renderRoute } from "./router.js";

function setupImageErrorDiagnostics() {
  window.__pokedexHandleImgError = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    const fallback = img.dataset.fallbackSrc || "";
    const alreadyTried = img.dataset.fallbackTried === "1";

    if (fallback && !alreadyTried) {
      img.dataset.fallbackTried = "1";
      img.src = fallback;
      return;
    }

    const parent = img.parentElement;
    if (parent && !parent.querySelector(".pokedex-icon-missing")) {
      const marker = document.createElement("span");
      marker.className = "pokedex-icon-missing";
      marker.textContent = "?";
      parent.appendChild(marker);
    }
    img.remove();
  };

  window.addEventListener("error", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const src = target.currentSrc || target.src || "";
    if (!src.includes("/Images/Pokedex/")) return;
    const dexNode = target.closest("[data-dex]");
    const gameNode = target.closest("[data-game-entry]");
    const dexNo = dexNode?.getAttribute("data-dex") || null;
    const gameEntry = gameNode?.getAttribute("data-game-entry") || null;
    console.warn("[Pokedex icon load failed]", {
      hash: location.hash,
      src,
      dexNo,
      gameEntry,
      alt: target.getAttribute("alt") || "",
    });
  }, true);
}

async function init() {
  try {
    initStorage();
    await loadData();
    await loadBootstrapFromFile();
    await loadPokedexNamesFromFile();
    normalizeUiSettings();
    applyTheme();
    applyTranslations();
    setupImageErrorDiagnostics();
    setupSidePanel();
    renderRoute();
    window.addEventListener("hashchange", renderRoute);
  } catch (err) {
    console.error("Init error:", err);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `<div class="placeholder">${t("errors.init")}</div>`;
    }
  }
}

init();
