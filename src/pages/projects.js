import { GAME_POKEDEXES } from "../config/pokedex.js";
import { t } from "../core/i18n.js?v=20261019-4";
import { setBrandSubtitle, setPageTitle } from "../core/ui.js";
import { loadGameDexCatalog } from "../features/pokedex.js";
import { state } from "../core/state.js";

async function getFavoriteGamePokedexes() {
  if (!state.user) return [];
  try {
    const response = await fetch("/api/game-favorites");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.favorites) ? payload.favorites.filter((id) => GAME_POKEDEXES.some((game) => game.id === id)) : [];
  } catch (error) {
    console.error("Could not load account game favorites:", error);
    return [];
  }
}

function getGenerationLabel(generation) {
  const roman = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
  return `Generation ${roman[generation] || generation}`;
}

function sortGamePokedexes(favorites) {
  return [...GAME_POKEDEXES].sort((a, b) => {
    const aFavoriteIndex = favorites.indexOf(a.id);
    const bFavoriteIndex = favorites.indexOf(b.id);
    if (aFavoriteIndex !== -1 && bFavoriteIndex !== -1) return aFavoriteIndex - bFavoriteIndex;
    if (aFavoriteIndex !== -1) return -1;
    if (bFavoriteIndex !== -1) return 1;
    return GAME_POKEDEXES.indexOf(a) - GAME_POKEDEXES.indexOf(b);
  });
}

export function renderProjects() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("projects.title"));
  setPageTitle(t("projects.title"));
  app.innerHTML = `
    <section>
      <p class="section-subtitle">${t("projects.desc")}</p>
      <div class="choice-grid">
        <a class="choice-card" href="#/projects/pokedexes">
          <div class="choice-logo choice-logo--row">
            <img src="https://storage.yandexcloud.net/poketracker/Images/Pokedex/GameIcons/Yellow.webp" alt="Yellow" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">${t("projects.nintTitle")}</div>
          <div class="choice-desc">${t("projects.nintDesc")}</div>
        </a>
        <a class="choice-card" href="#/projects/pocket-mortys">
          <div class="choice-logo">
            <img src="https://storage.yandexcloud.net/poketracker/Images/PocketMortys/Logo/Logo.webp" alt="Pocket Mortys" loading="lazy" decoding="async" />
          </div>
          <div class="choice-title">Pocket Mortys</div>
          <div class="choice-desc">${t("projects.pocketMortysDesc")}</div>
        </a>
      </div>
    </section>
  `;
}

export async function renderNintPokedexesHome() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("projects.pokedexesTitle"));
  setPageTitle(t("projects.pokedexesTitle"));

  try {
    if (!GAME_POKEDEXES.length) await loadGameDexCatalog();
  } catch (error) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${t("projects.pokedexesTitle")}</h1><p>${t("common.gameDataError")}</p><p>${String(error.message || error)}</p></section>`;
    return;
  }
  const favorites = await getFavoriteGamePokedexes();
  const sortedGames = sortGamePokedexes(favorites);

  app.innerHTML = `
    <section>
      <h1 class="section-title">${t("projects.pokedexesTitle")}</h1>
      <p class="section-subtitle">${t("projects.pokedexesSubtitle")}</p>
      <div class="choice-grid game-pokedex-choice-grid">
        ${sortedGames.map((game) => {
          const isFavorite = favorites.includes(game.id);
          const logoClass = game.icons.length > 1 ? "choice-logo choice-logo--row" : "choice-logo";
          const logos = game.icons
            .map((icon) => `<img src="${icon.src}" alt="${icon.alt}" loading="lazy" decoding="async" />`)
            .join("");
          const description = game.status === "coming-soon"
            ? "Coming 2027"
            : `${game.pokemonCount} Pokémon`;
          return `
            <div class="choice-card game-pokedex-choice-card">
              <a class="game-pokedex-choice-main" href="#/projects/pokedexes/${game.id}">
                <div class="${logoClass}">
                  ${logos}
                </div>
                <div class="choice-title">${game.title}</div>
                <div class="choice-desc game-pokedex-generation">${getGenerationLabel(game.generation)}</div>
                <div class="choice-desc game-pokedex-count">${description}</div>
              </a>
              <button
                class="game-pokedex-favorite ${isFavorite ? "is-favorite" : ""}"
                type="button"
                data-favorite-game="${game.id}"
                aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                aria-pressed="${isFavorite}"
                title="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
              >
                <svg viewBox="0 0 24 24" class="game-pokedex-star" aria-hidden="true">
                  <path d="M12 2.8l2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.2l-5.65 2.96 1.08-6.28-4.56-4.44 6.31-.92L12 2.8z"></path>
                </svg>
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;

  app.querySelectorAll("[data-favorite-game]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const gameId = button.dataset.favoriteGame;
      if (!state.user) { location.hash = "#/register?mode=login"; return; }
      const nextFavorites = await getFavoriteGamePokedexes();
      const currentIndex = nextFavorites.indexOf(gameId);
      if (currentIndex !== -1) {
        nextFavorites.splice(currentIndex, 1);
      } else {
        nextFavorites.unshift(gameId);
      }
      button.disabled = true;
      try {
        const response = await fetch("/api/game-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorites: nextFavorites }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error("Could not save account game favorites:", error);
        return;
      } finally {
        button.disabled = false;
      }

      const isFavorite = nextFavorites.includes(gameId);
      button.classList.toggle("is-favorite", isFavorite);
      button.setAttribute("aria-pressed", String(isFavorite));
      const label = isFavorite ? "Remove from favorites" : "Add to favorites";
      button.setAttribute("aria-label", label);
      button.title = label;

      const grid = app.querySelector(".game-pokedex-choice-grid");
      if (grid) {
        const cards = new Map([...grid.querySelectorAll("[data-favorite-game]")].map((item) => [item.dataset.favoriteGame, item.closest(".game-pokedex-choice-card")]));
        for (const game of sortGamePokedexes(nextFavorites)) {
          const card = cards.get(game.id);
          if (card) grid.append(card);
        }
      }
    });
  });
}
