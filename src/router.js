import { applyTranslations, t } from "./core/i18n.js";
import { state } from "./core/state.js";
import { setActiveNav, setBrandMode, setPageTitle, setPokedexSearchVisible, updateBrandLink } from "./core/ui.js";
import { renderCollection } from "./pages/collection.js";
import { renderGamePokedex } from "./pages/game-pokedex.js";
import { renderHome } from "./pages/home.js";
import { renderMobileHome } from "./pages/mobile.js";
import { renderPack } from "./pages/pack.js";
import { renderPlaceholder } from "./pages/placeholder.js";
import { renderPokedex } from "./pages/pokedex.js";
import { renderNintPokedexesHome, renderProjects } from "./pages/projects.js";
import { renderSettings } from "./pages/settings.js";
import { renderWishlist } from "./pages/wishlist.js";

export function renderRoute() {
  applyTranslations();
  setActiveNav();
  setPageTitle("");
  setPokedexSearchVisible(false);
  const hash = location.hash || "#/";

  if (hash === "#/") {
    setBrandMode("home");
    updateBrandLink();
    renderHome();
    return;
  }
  if (hash === "#/mobile") {
    setBrandMode("mobile");
    updateBrandLink();
    renderMobileHome();
    return;
  }
  if (hash === "#/physical") {
    setBrandMode("physical");
    renderPlaceholder(t("physical.title"), t("physical.desc"));
    return;
  }
  if (hash === "#/wishlist") {
    setBrandMode("mobile");
    updateBrandLink();
    renderWishlist();
    return;
  }
  if (hash === "#/showcase") {
    setBrandMode("mobile");
    state.ui.showcaseExpanded = false;
    renderShowcase();
    return;
  }
  if (hash === "#/collection") {
    setBrandMode("mobile");
    updateBrandLink();
    renderCollection();
    return;
  }
  if (hash === "#/settings") {
    setBrandMode("home");
    renderSettings();
    return;
  }
  if (hash.startsWith("#/pokedex")) {
    setBrandMode("mobile");
    const [, queryString] = hash.split("?");
    const params = new URLSearchParams(queryString || "");
    const rawNo = params.get("no");
    const parsed = rawNo ? Number(rawNo) : null;
    if (parsed && !Number.isNaN(parsed)) {
      state.ui.pokedexSelected = parsed;
    } else {
      state.ui.pokedexSelected = 1;
      state.ui.pokedexListScroll = 0;
      state.ui.pokedexCardScroll = 0;
      state.ui.pokedexGender = "common";
    }
    renderPokedex();
    return;
  }
  if (hash.startsWith("#/projects/pokedexes")) {
    setBrandMode("home");
    const path = hash.replace("#/projects/pokedexes", "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length) {
      const gameId = parts[0];
      state.ui.gamePokedexPage = state.ui.gamePokedexPage || {};
      state.ui.gamePokedexPage[gameId] = 1;
      renderGamePokedex(gameId);
    } else {
      renderNintPokedexesHome();
    }
    return;
  }
  if (hash === "#/projects") {
    setBrandMode("home");
    renderProjects();
    return;
  }
  if (hash === "#/all") {
    setBrandMode("mobile");
    updateBrandLink();
    renderPack("ALL");
    return;
  }
  if (hash.startsWith("#/pack/")) {
    setBrandMode("mobile");
    updateBrandLink();
    const packed = hash.replace("#/pack/", "");
    const [rawName, queryString] = packed.split("?");
    const packName = decodeURIComponent(rawName);
    const params = new URLSearchParams(queryString || "");
    const sub = params.get("sub");
    renderPack(packName, sub);
    return;
  }
  renderHome();
}
