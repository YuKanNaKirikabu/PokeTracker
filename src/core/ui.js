import { t } from "./i18n.js";

export function setActiveNav() {
  const route = location.hash || "#/";
  const isMobileSection = route === "#/mobile" || route === "#/all" || route.startsWith("#/pack/");
  const isPokedexSection = route.startsWith("#/pokedex");
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === route || (isMobileSection && href === "#/mobile") || (isPokedexSection && href === "#/pokedex")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

export function setBrandSubtitle(text) {
  const subtitle = document.getElementById("brandSubtitle");
  if (subtitle) subtitle.textContent = text;
}

export function setPageTitle(text) {
  const title = document.getElementById("pageTitle");
  if (!title) return;
  title.textContent = text || "";
}

export function setPokedexSearchVisible(visible) {
  const wrap = document.getElementById("pokedexSearchWrap");
  if (!wrap) return;
  wrap.style.display = visible ? "flex" : "none";
}

export function setBrandMode(mode) {
  const logoImg = document.getElementById("brandLogoImg");
  const logoText = document.getElementById("brandLogoText");
  const link = document.getElementById("brandLink");

  if (!logoImg || !logoText || !link) return;

  if (mode === "physical") {
    logoImg.style.display = "none";
    logoText.style.display = "block";
    logoText.textContent = "TCG";
    link.setAttribute("href", "#/physical");
    setBrandSubtitle(t("brand.physicalSubtitle"));
    return;
  }

  if (mode === "mobile") {
    logoImg.style.display = "block";
    logoImg.src = "https://storage.yandexcloud.net/poketracker/Images/MainLogos/TCGM.png";
    logoImg.alt = t("brand.mobileAlt");
    logoText.style.display = "none";
    link.setAttribute("href", "#/mobile");
    setBrandSubtitle(t("brand.mobileSubtitle"));
    return;
  }

  logoImg.style.display = "block";
  logoImg.src = "https://storage.yandexcloud.net/poketracker/Images/MainLogos/TCGM.png";
  logoImg.alt = t("app.title");
  logoText.style.display = "none";
  link.setAttribute("href", "#/");
  setBrandSubtitle(t("brand.homeSubtitle"));
}

export function updateBrandLink() {
  const link = document.getElementById("brandLink");
  if (!link) return;

  link.setAttribute("href", "#/");
  link.setAttribute("aria-label", t("nav.home"));
}

export function setupSidePanel() {
  const toggle = document.getElementById("menuToggle");
  const panel = document.getElementById("sidePanel");
  const overlay = document.getElementById("sideOverlay");
  const closeBtn = document.getElementById("sideClose");

  if (!toggle || !panel || !overlay) return;

  const open = () => {
    panel.classList.add("is-open");
    overlay.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  };

  toggle.addEventListener("click", open);
  overlay.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  window.addEventListener("hashchange", close);
}

