import { applyTranslations, getCurrentLanguage, LANGUAGE_OPTIONS, t } from "../core/i18n.js";
import { DEFAULT_LANGUAGE, DEFAULT_THEME, state } from "../core/state.js";
import { saveDataToFile, saveSettingsToFile } from "../core/storage.js";
import { applyTheme, normalizeUiSettings } from "../core/theme.js";
import { setPageTitle } from "../core/ui.js";
import { renderRoute } from "../router.js";

function setSettingsDirty(isDirty) {
  state.ui.settingsDirty = isDirty;
  const button = document.getElementById("settingsSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

export function renderSettings() {
  const app = document.getElementById("app");
  setPageTitle(t("settings.title"));
  const packsMode = state.ui.packsHomeMode || "grid";
  const packsGridClass = packsMode === "grid" ? "primary" : "secondary";
  const packsArcClass = packsMode === "arc" ? "primary" : "secondary";
  const theme = state.ui.theme || DEFAULT_THEME;
  const themeDarkClass = theme === "dark" ? "primary" : "secondary";
  const themeLightClass = theme === "light" ? "primary" : "secondary";
  const language = getCurrentLanguage();
  app.innerHTML = `
    <div class="settings-container">
      <div class="settings-section">
        <h2>${t("settings.themeTitle")}</h2>
        <div class="settings-actions">
          <button class="settings-btn ${themeDarkClass}" type="button" data-theme="dark">${t("settings.themeDark")}</button>
          <button class="settings-btn ${themeLightClass}" type="button" data-theme="light">${t("settings.themeLight")}</button>
        </div>
        <p class="settings-desc">${t("settings.themeDesc")}</p>
      </div>

      <div class="settings-section">
        <h2>${t("settings.languageTitle")}</h2>
        <div class="settings-actions grid">
          ${LANGUAGE_OPTIONS.map((option) => {
            const buttonClass = option.code === language ? "primary" : "secondary";
            return `<button class="settings-btn ${buttonClass}" type="button" data-language="${option.code}">${option.label}</button>`;
          }).join("")}
        </div>
        <p class="settings-desc">${t("settings.languageDesc")}</p>
      </div>

      <div class="settings-section">
        <h2>${t("settings.homeTitle")}</h2>
        <div class="settings-actions">
          <button class="settings-btn ${packsGridClass}" type="button" data-pack-home-mode="grid">${t("settings.homePacks")}</button>
          <button class="settings-btn ${packsArcClass}" type="button" data-pack-home-mode="arc">${t("settings.homeArc")}</button>
        </div>
        <p class="settings-desc">${t("settings.homeDesc")}</p>
      </div>

      <div class="settings-section">
        <h2>${t("settings.dataTitle")}</h2>
        <div class="settings-actions">
          <button class="settings-btn secondary" type="button" data-reset="all">${t("settings.resetButton")}</button>
        </div>
        <p class="settings-desc">${t("settings.resetDesc")}</p>
      </div>

      <button class="game-pokedex-save-btn left" id="settingsSaveBtn" type="button" disabled>
        ${t("gamePokedex.save")}
      </button>
    </div>
  `;

  const modeButtons = app.querySelectorAll("[data-pack-home-mode]");
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-pack-home-mode");
      if (!mode) return;
      state.ui.packsHomeMode = mode;
      setSettingsDirty(true);
      renderSettings();
    });
  });

  app.querySelectorAll("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.getAttribute("data-theme");
      if (!nextTheme) return;
      state.ui.theme = nextTheme;
      applyTheme();
      setSettingsDirty(true);
      renderSettings();
    });
  });

  app.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.getAttribute("data-language");
      if (!nextLanguage) return;
      state.ui.language = nextLanguage;
      applyTranslations();
      setSettingsDirty(true);
      renderRoute();
    });
  });

  const saveButton = app.querySelector("#settingsSaveBtn");
  saveButton?.addEventListener("click", async () => {
    await saveSettingsToFile();
    setSettingsDirty(false);
  });

  setSettingsDirty(Boolean(state.ui.settingsDirty));

  const resetButton = app.querySelector("[data-reset]");
  resetButton?.addEventListener("click", async () => {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    state.owned = new Set();
    state.wishlist = new Set();
    if (state.ui.arcCleanup) {
      state.ui.arcCleanup();
    }
    state.ui = {
      packsHomeMode: "grid",
      language: DEFAULT_LANGUAGE,
      theme: DEFAULT_THEME,
      gamePokedex: {},
      gamePokedexPage: {},
    };
    normalizeUiSettings();
    applyTheme();
    applyTranslations();
    await saveDataToFile();
    await saveSettingsToFile();
    renderRoute();
  });
}
