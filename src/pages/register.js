import { authenticate } from "../core/auth.js";
import { t } from "../core/i18n.js";
import { renderRoute } from "../router.js";

export function renderRegister() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="settings-container">
      <div class="settings-section">
        <h1 class="section-title">${t("profile.registerTitle")}</h1>
        <form id="registerForm">
          <input class="settings-input" name="username" minlength="3" maxlength="32" placeholder="${t("profile.username")}" required />
          <input class="settings-input" name="password" type="password" minlength="8" placeholder="${t("profile.password")}" required />
          <div class="settings-actions">
            <button class="settings-btn primary" type="submit">${t("profile.registerSubmit")}</button>
            <a class="settings-btn secondary" href="#/profile">${t("profile.registerLogin")}</a>
          </div>
          <p class="settings-desc" id="registerError" role="alert"></p>
        </form>
      </div>
    </section>
  `;
  const form = app.querySelector("#registerForm");
  const error = app.querySelector("#registerError");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      await authenticate("register", data.get("username"), data.get("password"));
      await import("../core/storage.js").then(({ loadDataFromFile }) => loadDataFromFile());
      window.dispatchEvent(new Event("authstatechange"));
      location.hash = "#/";
    } catch (registerError) {
      error.textContent = registerError.message;
    }
  });
}
