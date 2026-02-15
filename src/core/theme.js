import { DEFAULT_LANGUAGE, DEFAULT_THEME, state } from "./state.js";

export function applyTheme() {
  const theme = state.ui.theme || DEFAULT_THEME;
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme !== "light");
}

export function normalizeUiSettings() {
  if (!state.ui.language) state.ui.language = DEFAULT_LANGUAGE;
  if (!state.ui.theme) state.ui.theme = DEFAULT_THEME;
  if (!state.ui.packsHomeMode) state.ui.packsHomeMode = "grid";
  if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
  if (!state.ui.gamePokedexPage) state.ui.gamePokedexPage = {};
  if (!state.ui.gamePokedexVersion) state.ui.gamePokedexVersion = {};
  if (state.ui.gamePokedexDirty === undefined) state.ui.gamePokedexDirty = false;
  if (state.ui.cardsDirty === undefined) state.ui.cardsDirty = false;
  if (state.ui.settingsDirty === undefined) state.ui.settingsDirty = false;
}
