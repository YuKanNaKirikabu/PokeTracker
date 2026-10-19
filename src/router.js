import { applyTranslations, t } from "./core/i18n.js?v=20261019-5";
import { state } from "./core/state.js";
import { setActiveNav, setBrandMode, setPageTitle, setPokedexSearchVisible, updateBrandLink } from "./core/ui.js?v=20261019-4";
import { renderCollection } from "./pages/collection.js?v=20261019-4";
import { renderGamePokedex } from "./pages/game-pokedex.js?v=20261019-5";
import { renderHome } from "./pages/home.js?v=20261019-4";
import { renderMobileHome } from "./pages/mobile.js";
import { renderPack } from "./pages/pack.js?v=20261019-5";
import { renderPlaceholder } from "./pages/placeholder.js";
import { renderPokedex } from "./pages/pokedex.js?v=20261019-4";
import { renderNintPokedexesHome, renderProjects } from "./pages/projects.js?v=20261019-5";
import { renderSettings } from "./pages/settings.js?v=20261019-4";
import { renderAuthRequired, renderProfile } from "./pages/profile.js?v=20261019-4";
import { renderRegister } from "./pages/register.js?v=20261019-4";
import { renderWishlist } from "./pages/wishlist.js?v=20261019-4";
import { renderPocketMortys } from "./pages/pocket-mortys.js?v=20261019-4";

export function renderRoute() {
  const packHeaderContext = document.getElementById("packHeaderContext");
  if (packHeaderContext) {
    packHeaderContext.hidden = true;
    packHeaderContext.replaceChildren();
  }
  const packScaleControl = document.getElementById("packScaleControl");
  if (packScaleControl) {
    packScaleControl.hidden = true;
    packScaleControl.replaceChildren();
  }
  document.body.classList.remove("register-page");
  document.body.classList.remove("home-route");
  const mobileFiltersToggle = document.getElementById("mobileFiltersToggle");
  if (mobileFiltersToggle) {
    mobileFiltersToggle.style.display = "none";
    mobileFiltersToggle.setAttribute("aria-expanded", "false");
  }
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
    if (state.user) renderWishlist();
    else renderAuthRequired("wishlist");
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
    if (state.user) renderCollection();
    else renderAuthRequired("collection");
    return;
  }
  if (hash === "#/settings") {
    setBrandMode("home");
    renderSettings();
    return;
  }
  if (hash === "#/profile") {
    setBrandMode("home");
    if (!state.user) {
      location.hash = "#/register?mode=login";
      return;
    }
    renderProfile();
    return;
  }
  if (hash.startsWith("#/register")) {
    setBrandMode("home");
    renderRegister();
    return;
  }
  if (hash.startsWith("#/pokedex")) {
    setBrandMode("home");
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
  if (hash === "#/projects/pocket-mortys") {
    setBrandMode("home");
    renderPocketMortys();
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
    let packName;
    try { packName = decodeURIComponent(rawName); }
    catch { packName = rawName; }
    const params = new URLSearchParams(queryString || "");
    const sub = params.get("sub");
    renderPack(packName, sub);
    return;
  }
  renderHome();
}
