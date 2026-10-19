import { authenticate, logout, saveAvatar } from "../core/auth.js?v=20261018-3";
import { t } from "../core/i18n.js?v=20261019-4";
import { state } from "../core/state.js";
import { renderRoute } from "../router.js?v=20261019-4";
import { getPokedexIconPath, getPokedexList, getPokemonDisplayName } from "../features/pokedex.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function renderPreviewCards(cardIds) {
  const cards = (state.data?.cards || [])
    .filter((card) => cardIds.has(`${card.pack}-${card.number}`))
    .slice(0, 8);
  if (!cards.length) return `<p class="profile-empty">${t("profile.noCards")}</p>`;
  return `
    <div class="profile-card-preview">
      ${cards.map((card) => `
        <div class="profile-card-preview-item">
          <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}" loading="lazy" decoding="async" />
          <span>${escapeHtml(card.name)}</span>
            <small>${escapeHtml(card.pack)} · #${escapeHtml(card.number)}</small>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderProfile() {
  const app = document.getElementById("app");
  if (state.user) {
    const avatarEntry = getPokedexList().find((entry) => entry.number === (state.user.pokemonNumber || 1)) || getPokedexList()[0];
    const ownedCount = state.owned.size;
    const wishlistCount = state.wishlist.size;
    const totalCards = state.data?.cards?.length || 0;
    const completion = totalCards ? Math.round((ownedCount / totalCards) * 100) : 0;
    app.innerHTML = `
      <section class="profile-page">
        <div class="profile-hero">
          <button class="profile-hero-avatar" id="profileAvatarButton" type="button" aria-label="${t("profile.chooseAvatar")}">
            <img src="${getPokedexIconPath(avatarEntry)}" alt="" />
          </button>
          <div class="profile-hero-copy">
            <span class="profile-eyebrow">${t("profile.title")}</span>
            <h1>${escapeHtml(state.user.username)}</h1>
            <p>${t("profile.loggedInAs")}</p>
          </div>
          <div class="profile-stat-grid">
            <a class="profile-stat-card profile-stat-card--accent" href="#/collection">
              <span class="profile-stat-icon" aria-hidden="true">▣</span>
              <span class="profile-stat-label">${t("profile.collectionLink")}</span>
              <strong>${ownedCount}</strong>
              <small>${completion}% ${t("profile.complete")}</small>
            </a>
            <a class="profile-stat-card" href="#/wishlist">
              <span class="profile-stat-icon" aria-hidden="true">♡</span>
              <span class="profile-stat-label">${t("profile.wishlistLink")}</span>
              <strong>${wishlistCount}</strong>
              <small>${t("profile.savedCards")}</small>
            </a>
            <div class="profile-stat-card">
              <span class="profile-stat-icon" aria-hidden="true">◈</span>
              <span class="profile-stat-label">${t("profile.catalog")}</span>
              <strong>${totalCards}</strong>
              <small>${t("profile.cardsAvailable")}</small>
            </div>
          </div>
          <button class="profile-logout" id="logoutButton" type="button">
            <span aria-hidden="true">↪</span>${t("profile.logout")}
          </button>
        </div>
        <div class="profile-content-grid">
          <section class="profile-data-section">
            <div class="profile-data-heading">
              <div><span class="profile-section-kicker">${t("profile.collectionLink")}</span><h2>${t("profile.recentCollection")}</h2></div>
              <a class="profile-all-link" href="#/collection">${t("profile.viewAll")}</a>
            </div>
            ${renderPreviewCards(state.owned)}
          </section>
          <section class="profile-data-section">
            <div class="profile-data-heading">
              <div><span class="profile-section-kicker">${t("profile.wishlistLink")}</span><h2>${t("profile.wishlistPreview")}</h2></div>
              <a class="profile-all-link" href="#/wishlist">${t("profile.viewAll")}</a>
            </div>
            ${renderPreviewCards(state.wishlist)}
          </section>
        </div>
      </section>
    `;
    attachAvatarPicker(app);
    app.querySelector("#logoutButton").addEventListener("click", async () => {
      await logout();
      const { applyTheme, normalizeUiSettings } = await import("../core/theme.js");
      const { applyTranslations } = await import("../core/i18n.js?v=20261019-4");
      normalizeUiSettings();
      applyTheme();
      applyTranslations();
      window.dispatchEvent(new Event("authstatechange"));
      location.hash = "#/";
    });
    return;
  }

  function attachAvatarPicker(app) {
    const button = app.querySelector("#profileAvatarButton");
    if (!button) return;
    const entries = getPokedexList();
    const renderPicker = (query = "") => {
      const normalized = query.trim().toLowerCase();
      const filtered = entries.filter((entry) => !normalized
        || entry.nameEn.toLowerCase().includes(normalized)
        || getPokemonDisplayName(entry).toLowerCase().includes(normalized));
      return filtered.map((entry) => `<button class="avatar-picker-item" type="button" data-pokemon-number="${entry.number}" aria-label="${escapeHtml(getPokemonDisplayName(entry))}"><img src="${getPokedexIconPath(entry)}" alt="" loading="lazy" /></button>`).join("");
    };
    const close = () => app.querySelector("#avatarPicker")?.remove();
    button.addEventListener("click", () => {
      if (app.querySelector("#avatarPicker")) return;
      const modal = document.createElement("div");
      modal.id = "avatarPicker";
      modal.className = "avatar-picker-backdrop";
      modal.innerHTML = `<section class="avatar-picker" role="dialog" aria-modal="true" aria-label="${t("profile.chooseAvatar")}">
        <div class="avatar-picker-head"><input id="avatarPickerSearch" type="search" placeholder="${t("profile.avatarSearch")}" autocomplete="off" /><button id="avatarPickerClose" type="button" aria-label="${t("profile.close")}">×</button></div>
        <div class="avatar-picker-grid">${renderPicker()}</div>
      </section>`;
      app.appendChild(modal);
      const search = modal.querySelector("#avatarPickerSearch");
      const grid = modal.querySelector(".avatar-picker-grid");
      search.focus();
      search.addEventListener("input", () => { grid.innerHTML = renderPicker(search.value); });
      modal.querySelector("#avatarPickerClose").addEventListener("click", close);
      modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
      grid.addEventListener("click", async (event) => {
        const item = event.target.closest("[data-pokemon-number]");
        if (!item) return;
        item.disabled = true;
        try {
          await saveAvatar(Number(item.dataset.pokemonNumber));
          close();
          renderProfile();
        } catch (error) {
          console.error("Не удалось сохранить аватар:", error);
          item.disabled = false;
        }
      });
    });
  }

  app.innerHTML = `
    <section class="settings-container profile-page">
      <div class="settings-section">
        <h1 class="section-title">${t("profile.title")}</h1>
        <form id="authForm">
          <input class="settings-input" name="username" minlength="3" maxlength="32" placeholder="${t("profile.username")}" required />
          <input class="settings-input" name="password" type="password" minlength="8" placeholder="${t("profile.password")}" required />
          <div class="settings-actions">
            <button class="settings-btn primary" type="submit">${t("profile.login")}</button>
          </div>
          <p class="auth-switch">${t("profile.noAccount")} <a href="#/register">${t("profile.register")}</a></p>
          <p class="settings-desc" id="authError" role="alert"></p>
        </form>
      </div>
    </section>
  `;
  const form = app.querySelector("#authForm");
  const error = app.querySelector("#authError");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      await authenticate("login", data.get("username"), data.get("password"));
      await import("../core/storage.js").then(async ({ loadBootstrapFromFile, loadDataFromFile }) => {
        await loadBootstrapFromFile();
        await loadDataFromFile();
      });
      const { normalizeUiSettings, applyTheme } = await import("../core/theme.js");
      const { applyTranslations } = await import("../core/i18n.js?v=20261019-4");
      normalizeUiSettings();
      applyTheme();
      applyTranslations();
      window.dispatchEvent(new Event("authstatechange"));
      location.hash = "#/";
    } catch (authError) {
      error.textContent = authError.message;
    }
  });
}

export function renderAuthRequired(target) {
  const app = document.getElementById("app");
  const title = target === "wishlist" ? t("wishlist.title") : t("collection.title");
  app.innerHTML = `
    <section class="settings-container">
      <div class="settings-section auth-required">
        <h1 class="section-title">${title}</h1>
        <p class="settings-desc">${t("profile.authRequired")}</p>
        <div class="settings-actions">
          <a class="settings-btn primary" href="#/profile">${t("profile.login")}</a>
          <a class="settings-btn secondary" href="#/register">${t("profile.register")}</a>
        </div>
      </div>
    </section>
  `;
}
