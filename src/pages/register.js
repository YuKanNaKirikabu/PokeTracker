import { authenticate } from "../core/auth.js";
import { t } from "../core/i18n.js?v=20261019-5";

export function renderRegister() {
  document.body.classList.add("register-page");
  const app = document.getElementById("app");
  const isLogin = new URLSearchParams((location.hash.split("?")[1] || "")).get("mode") === "login";
  app.innerHTML = `
    <section class="register-shell">
      <div class="register-card">
        <h1 class="section-title">${t(isLogin ? "profile.loginTitle" : "profile.registerTitle")}</h1>
        <form id="registerForm">
          <input class="settings-input" name="username" minlength="3" maxlength="32" placeholder="${t("profile.username")}" required />
          <div class="password-field">
            <input class="settings-input" id="registerPassword" name="password" type="password" minlength="8" placeholder="${t("profile.password")}" required />
            <button class="password-toggle" id="passwordToggle" type="button" aria-label="${t("profile.showPassword")}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
            </button>
          </div>
          <div class="settings-actions">
            <button class="settings-btn primary" type="submit">${t(isLogin ? "profile.login" : "profile.registerSubmit")}</button>
          </div>
          <p class="auth-switch">${t(isLogin ? "profile.noAccount" : "profile.registerExisting")} <a href="#/register?mode=${isLogin ? "register" : "login"}">${t(isLogin ? "profile.register" : "profile.registerLogin")}</a></p>
          <p class="settings-desc" id="registerError" role="alert"></p>
        </form>
      </div>
    </section>
  `;
  const form = app.querySelector("#registerForm");
  const error = app.querySelector("#registerError");
  const password = app.querySelector("#registerPassword");
  const passwordToggle = app.querySelector("#passwordToggle");
  const renderPasswordIcon = (visible) => {
    passwordToggle.innerHTML = visible
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.1 3.8M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  };
  passwordToggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    renderPasswordIcon(!visible);
    passwordToggle.setAttribute("aria-label", t(visible ? "profile.showPassword" : "profile.hidePassword"));
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      await authenticate(isLogin ? "login" : "register", data.get("username"), data.get("password"));
      await import("../core/storage.js").then(async ({ loadBootstrapFromFile, loadDataFromFile }) => {
        await loadBootstrapFromFile();
        await loadDataFromFile();
      });
      const { normalizeUiSettings, applyTheme } = await import("../core/theme.js");
      const { applyTranslations } = await import("../core/i18n.js?v=20261019-5");
      normalizeUiSettings();
      applyTheme();
      applyTranslations();
      window.dispatchEvent(new Event("authstatechange"));
      location.hash = "#/";
    } catch (registerError) {
      error.textContent = registerError.message;
    }
  });
}
