import { DEFAULT_LANGUAGE, DEFAULT_THEME, state } from "./state.js";

export function applyTheme() {
  const theme = state.ui.theme || DEFAULT_THEME;
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme !== "light");
  const accent = state.ui.accentColor || "#ed2340";
  const darken = (hex) => { const value = String(hex).replace("#",""); if (!/^[0-9a-f]{6}$/i.test(value)) return "#ed2340"; const n = parseInt(value,16); return `#${[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.round(v*.82)).toString(16).padStart(2,"0")).join("")}`; };
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-strong", accent);
  document.documentElement.style.setProperty("--accent-border", `${accent}70`);
  document.documentElement.style.setProperty("--accent-soft", `${accent}20`);
}

export function normalizeUiSettings() {
  if (!state.ui.language) state.ui.language = DEFAULT_LANGUAGE;
  if (!state.ui.theme) state.ui.theme = DEFAULT_THEME;
  if (!state.ui.accentColor) state.ui.accentColor = "#ed2340";
  if (!state.ui.packsHomeMode) state.ui.packsHomeMode = "grid";
  if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
  if (!state.ui.gamePokedexPage) state.ui.gamePokedexPage = {};
  if (!state.ui.gamePokedexVersion) state.ui.gamePokedexVersion = {};
  if (state.ui.gamePokedexDirty === undefined) state.ui.gamePokedexDirty = false;
  if (state.ui.cardsDirty === undefined) state.ui.cardsDirty = false;
  if (state.ui.settingsDirty === undefined) state.ui.settingsDirty = false;
}
