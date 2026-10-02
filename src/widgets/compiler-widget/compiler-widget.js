function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withLineNumbers(title, content) {
  const normalized = [title, "", content].join("\n").trimEnd();
  const lines = normalized.split("\n");

  return lines
    .map((line, index) => {
      const lineNo = String(index + 1).padStart(2, "0");
      return `${lineNo}  ${line}`;
    })
    .join("\n");
}

function moveFocus(items, currentItem, direction) {
  const currentIndex = items.indexOf(currentItem);
  if (currentIndex === -1) return;

  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items[nextIndex].focus();
}

let widgetCount = 0;

export function mountCompilerWidget(container, pages, options = {}) {
  if (!container || !Array.isArray(pages) || pages.length === 0) {
    return;
  }

  widgetCount += 1;
  const widgetId = `compiler-widget-${widgetCount}`;
  const safePages = pages.filter((page) => page && page.id && page.fileName);

  if (safePages.length === 0) {
    return;
  }

  const statusText = options.statusText || "PokeTracker Docs: READY";
  const sidebarTitle = options.sidebarTitle || "Project Files";
  const initialPageId = options.initialPageId && safePages.some((p) => p.id === options.initialPageId)
    ? options.initialPageId
    : safePages[0].id;

  const fileButtons = safePages
    .map((page) => {
      const isActive = page.id === initialPageId;
      const tabId = `${widgetId}-tab-${page.id}`;
      const panelId = `${widgetId}-panel-${page.id}`;

      return `
        <li>
          <button class="compiler-widget-file-btn ${isActive ? "active" : ""}" role="tab" aria-selected="${isActive}" aria-controls="${panelId}" id="${tabId}" data-target="${page.id}">${escapeHtml(page.fileName)}</button>
        </li>
      `;
    })
    .join("");

  const topTabs = safePages
    .map((page) => {
      const isActive = page.id === initialPageId;
      const panelId = `${widgetId}-panel-${page.id}`;

      return `
        <button class="compiler-widget-tab ${isActive ? "active" : ""}" type="button" role="tab" aria-selected="${isActive}" aria-controls="${panelId}" data-target="${page.id}">${escapeHtml(page.fileName)}</button>
      `;
    })
    .join("");

  const panels = safePages
    .map((page) => {
      const isActive = page.id === initialPageId;
      const panelId = `${widgetId}-panel-${page.id}`;
      const codeText = withLineNumbers(page.title || "", page.content || "");

      return `
        <article class="compiler-widget-panel ${isActive ? "active" : ""}" id="${panelId}" role="tabpanel" data-panel="${page.id}">
          <pre><code>${escapeHtml(codeText)}</code></pre>
        </article>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="compiler-widget-shell">
      <div class="compiler-widget-topbar">
        <div class="compiler-widget-controls" aria-hidden="true">
          <span class="compiler-widget-dot compiler-widget-dot-red"></span>
          <span class="compiler-widget-dot compiler-widget-dot-yellow"></span>
          <span class="compiler-widget-dot compiler-widget-dot-green"></span>
        </div>
        <p class="compiler-widget-status">${escapeHtml(statusText)}</p>
      </div>

      <div class="compiler-widget-body">
        <aside class="compiler-widget-sidebar" aria-label="Explorer">
          <p class="compiler-widget-title">${escapeHtml(sidebarTitle)}</p>
          <ul class="compiler-widget-file-list" role="tablist" aria-label="TXT tabs">
            ${fileButtons}
          </ul>
        </aside>

        <div class="compiler-widget-editor">
          <div class="compiler-widget-tabs" role="tablist" aria-label="Open files">
            ${topTabs}
          </div>
          ${panels}
        </div>
      </div>
    </div>
  `;

  const sideButtons = Array.from(container.querySelectorAll(".compiler-widget-file-btn"));
  const editorTabs = Array.from(container.querySelectorAll(".compiler-widget-tab"));
  const editorPanels = Array.from(container.querySelectorAll(".compiler-widget-panel"));

  function openPanel(target) {
    sideButtons.forEach((btn) => {
      const isActive = btn.dataset.target === target;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });

    editorTabs.forEach((tab) => {
      const isActive = tab.dataset.target === target;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    editorPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  }

  sideButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      openPanel(btn.dataset.target);
    });

    btn.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(sideButtons, btn, 1);
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(sideButtons, btn, -1);
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPanel(btn.dataset.target);
      }
    });
  });

  editorTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      openPanel(tab.dataset.target);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(editorTabs, tab, 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(editorTabs, tab, -1);
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPanel(tab.dataset.target);
      }
    });
  });
}
