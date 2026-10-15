import { authenticate, logout } from "../core/auth.js";
import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { renderRoute } from "../router.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function renderPreviewCards(cardIds) {
  const cards = (state.data?.cards || [])
    .filter((card) => cardIds.has(`${card.pack}-${card.number}`))
    .slice(0, 5);
  if (!cards.length) return `<p class="profile-empty">${t("profile.noCards")}</p>`;
  return `
    <div class="profile-card-preview">
      ${cards.map((card) => `
        <div class="profile-card-preview-item">
          <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}" loading="lazy" decoding="async" />
          <span>${escapeHtml(card.name)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderProfile() {
  const app = document.getElementById("app");
  if (state.user) {
    app.innerHTML = `
      <section class="settings-container">
        <div class="settings-section">
          <div class="profile-heading">
            <div>
              <h1 class="section-title">${t("profile.title")}</h1>
              <p class="settings-desc">${t("profile.loggedInAs")}: <strong>${escapeHtml(state.user.username)}</strong></p>
            </div>
            <button class="profile-logout" id="logoutButton" type="button">
              <span aria-hidden="true">↪</span>
              ${t("profile.logout")}
            </button>
          </div>
          <div class="profile-data-section">
            <div class="profile-data-heading">
              <h2>${t("profile.collectionLink")}</h2>
              <a class="profile-all-link" href="#/collection">${t("profile.viewAll")}</a>
            </div>
            ${renderPreviewCards(state.owned)}
          </div>
          <div class="profile-data-section">
            <div class="profile-data-heading">
              <h2>${t("profile.wishlistLink")}</h2>
              <a class="profile-all-link" href="#/wishlist">${t("profile.viewAll")}</a>
            </div>
            ${renderPreviewCards(state.wishlist)}
          </div>
        </div>
      </section>
    `;
    app.querySelector("#logoutButton").addEventListener("click", async () => {
      await logout();
      location.hash = "#/";
    });
    return;
  }

  app.innerHTML = `
    <section class="settings-container">
      <div class="settings-section">
        <h1 class="section-title">${t("profile.title")}</h1>
        <form id="authForm">
          <input class="settings-input" name="username" minlength="3" maxlength="32" placeholder="${t("profile.username")}" required />
          <input class="settings-input" name="password" type="password" minlength="8" placeholder="${t("profile.password")}" required />
          <div class="settings-actions">
            <button class="settings-btn primary" type="submit">${t("profile.login")}</button>
            <a class="settings-btn secondary" href="#/register">${t("profile.register")}</a>
          </div>
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
      await import("../core/storage.js").then(({ loadDataFromFile }) => loadDataFromFile());
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
