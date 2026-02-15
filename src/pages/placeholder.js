export function renderPlaceholder(title, text) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="placeholder">
      <h1 class="section-title">${title}</h1>
      <p>${text}</p>
    </section>
  `;
}
