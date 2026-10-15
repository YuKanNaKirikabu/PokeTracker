import { loadData } from "./core/data.js";
import { loadAuth } from "./core/auth.js";
import { applyTranslations, t } from "./core/i18n.js";
import { initStorage, loadBootstrapFromFile, loadDataFromFile, saveDataToFile } from "./core/storage.js";
import { applyTheme, normalizeUiSettings } from "./core/theme.js";
import { state } from "./core/state.js";
import { setupProfileMenu, setupSidePanel } from "./core/ui.js";
import { loadPokedexNamesFromFile, loadGamePokedexes } from "./features/pokedex.js";
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
    await loadAuth();
    const cardsPromise = loadData();
    const bootstrapPromise = loadBootstrapFromFile();
    let userDataPromise = Promise.resolve();
    if (state.user) {
      userDataPromise = loadDataFromFile()
        .then(() => window.dispatchEvent(new CustomEvent("userdataready")))
        .catch((error) => console.error("Ошибка загрузки коллекции:", error));
    }
    loadPokedexNamesFromFile().catch((error) => console.warn("Pokedex names unavailable:", error.message));
    loadGamePokedexes().catch((error) => console.warn("GameDex catalog unavailable:", error.message));
    normalizeUiSettings();
    applyTheme();
    applyTranslations();
    setupImageErrorDiagnostics();
    setupSidePanel();
    setupProfileMenu();
    renderRoute();
    let saveTimer = null;
    window.addEventListener("cardsdatachanged", () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          await saveDataToFile();
          state.ui.cardsDirty = false;
          window.dispatchEvent(new CustomEvent("cardsdatasaved"));
        } catch (error) {
          console.error("Ошибка автоматического сохранения коллекции:", error);
        }
      }, 400);
    });
    window.addEventListener("hashchange", renderRoute);
    window.addEventListener("cardsdataready", () => {
      if (
        location.hash.startsWith("#/pack/")
        || location.hash === "#/all"
        || location.hash === "#/collection"
        || location.hash === "#/wishlist"
        || location.hash === "#/profile"
        || location.hash.startsWith("#/pokedex")
      ) {
        renderRoute();
      }
    });
    window.addEventListener("userdataready", () => {
      if (location.hash === "#/collection" || location.hash === "#/wishlist" || location.hash === "#/profile") {
        renderRoute();
      }
    });
    bootstrapPromise
      .then(() => {
        normalizeUiSettings();
        applyTheme();
        applyTranslations();
        renderRoute();
      })
      .catch((error) => console.error("Ошибка загрузки настроек:", error));
    cardsPromise
      .then(() => {
        if (location.hash === "#/profile") renderRoute();
      })
      .catch((error) => console.error("Ошибка загрузки карточек:", error));
    userDataPromise.then(() => {
      if (location.hash === "#/profile") renderRoute();
    });
  } catch (err) {
    console.error("Init error:", err);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `<div class="placeholder">${t("errors.init")}</div>`;
    }
  }
}

init();
