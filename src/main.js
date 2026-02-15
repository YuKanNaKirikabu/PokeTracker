import { loadData } from "./core/data.js";
import { applyTranslations, t } from "./core/i18n.js";
import { initStorage, loadBootstrapFromFile } from "./core/storage.js";
import { applyTheme, normalizeUiSettings } from "./core/theme.js";
import { setupSidePanel } from "./core/ui.js";
import { loadPokedexNamesFromFile } from "./features/pokedex.js";
import { renderRoute } from "./router.js";

async function init() {
  try {
    initStorage();
    await loadData();
    await loadBootstrapFromFile();
    await loadPokedexNamesFromFile();
    normalizeUiSettings();
    applyTheme();
    applyTranslations();
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
