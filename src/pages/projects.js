import { GAME_POKEDEXES } from "../config/pokedex.js";
import { t } from "../core/i18n.js";
import { setBrandSubtitle, setPageTitle } from "../core/ui.js";

export function renderProjects() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("projects.title"));
  setPageTitle(t("projects.title"));
  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("projects.title")}</h1>
      <p class="section-subtitle">${t("projects.desc")}</p>
      <div class="choice-grid">
        <a class="choice-card" href="#/projects/pokedexes">
          <div class="choice-logo choice-logo--row">
            <img src="https://storage.yandexcloud.net/poketracker/Images/Pokedex/GameIcons/Sword.jpg" alt="Sword" loading="lazy" decoding="async" />
            <img src="https://storage.yandexcloud.net/poketracker/Images/Pokedex/GameIcons/Shield.jpg" alt="Shield" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">${t("projects.nintTitle")}</div>
          <div class="choice-desc">${t("projects.nintDesc")}</div>
        </a>
      </div>
    </section>
  `;
}

export function renderNintPokedexesHome() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("projects.pokedexesTitle"));
  setPageTitle(t("projects.pokedexesTitle"));
  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("projects.pokedexesTitle")}</h1>
      <p class="section-subtitle">${t("projects.pokedexesSubtitle")}</p>
      <div class="choice-grid">
        ${GAME_POKEDEXES.map((game) => {
          const logoClass = game.icons.length > 1 ? "choice-logo choice-logo--row" : "choice-logo";
          const logos = game.icons
            .map(
              (icon) => `<img src="${icon.src}" alt="${icon.alt}" loading="lazy" decoding="async" />`
            )
            .join("");
          return `
            <a class="choice-card" href="#/projects/pokedexes/${game.id}">
              <div class="${logoClass}">
                ${logos}
              </div>
              <div class="choice-title">${game.title}</div>
              <div class="choice-desc">${t("projects.open")}</div>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
