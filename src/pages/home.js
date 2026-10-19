import { compilerPages } from "../config/compiler-pages.js";
import { t } from "../core/i18n.js?v=20261019-5";
import { mountCompilerWidget } from "../widgets/compiler-widget/compiler-widget.js";

export function renderHome() {
  const app = document.getElementById("app");
  document.body.classList.add("home-route");
  app.innerHTML = `
    <section class="home-page">
      <h1 class="section-title">${t("home.title")}</h1>
      <div class="choice-grid">
        <a class="choice-card" href="#/mobile">
          <div class="choice-logo">
            <img src="https://storage.yandexcloud.net/poketracker/Images/MainLogos/TCGM.webp" alt="${t("home.mobileTitle")}" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">${t("home.mobileTitle")}</div>
          <div class="choice-desc">${t("home.mobileDesc")}</div>
        </a>
        <a class="choice-card" href="#/pokedex">
          <div class="choice-logo">
            <img src="https://storage.yandexcloud.net/poketracker/Images/MainLogos/pokedex.webp" alt="${t("home.pokedexTitle")}" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">${t("home.pokedexTitle")}</div>
          <div class="choice-desc">${t("home.pokedexDesc")}</div>
        </a>
        <a class="choice-card" href="#/projects">
          <div class="choice-logo">
            <img src="https://storage.yandexcloud.net/poketracker/Images/MainLogos/nintendo.webp" alt="${t("home.projectsTitle")}" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">${t("home.projectsTitle")}</div>
          <div class="choice-desc">${t("home.projectsDesc")}</div>
        </a>
        <a class="choice-card is-disabled" href="#/physical" aria-disabled="true">
          <div class="choice-logo choice-logo--plain">TCG</div>
          <div class="choice-title">${t("home.physicalTitle")}</div>
          <div class="choice-desc">${t("home.physicalDesc")}</div>
        </a>
      </div>
      <section class="compiler-mount" data-compiler-widget aria-label="Project documentation compiler"></section>
    </section>
  `;

  const compilerContainer = app.querySelector("[data-compiler-widget]");
  if (compilerContainer) {
    mountCompilerWidget(compilerContainer, compilerPages, {
    statusText: t("docs.status"),
    sidebarTitle: t("docs.files"),
    explorerLabel: t("docs.explorer"),
    txtTabsLabel: t("docs.txtTabs"),
    openFilesLabel: t("docs.openFiles"),
    initialPageId: "project",
    });
  }
}
