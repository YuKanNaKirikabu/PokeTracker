import {
    CELESTIAL_GUARDIANS_ID,
    CELESTIAL_GUARDIANS_SUBPACKS,
    GENETIC_APEX_ID,
    GENETIC_APEX_SUBPACKS,
    MEGA_RISING_ID,
    MEGA_RISING_SUBPACKS,
    PACKS_ORDER,
    SPACE_TIME_SMACKDOWN_ID,
    SPACE_TIME_SMACKDOWN_SUBPACKS,
    WISDOM_SEA_SKY_ID,
    WISDOM_SEA_SKY_SUBPACKS,
} from "../config/packs.js";
import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { saveDataToFile } from "../core/storage.js";
import { attachCardEvents, formatCardId, renderCardGrid } from "../features/cards.js";
import { applyFilters, attachFilterEvents, renderAllPackGroup, renderFilters } from "../features/filters.js";

function renderCardsSaveButton() {
  return `
    <button class="game-pokedex-save-btn left" id="cardsSaveBtn" type="button" disabled>
      ${t("gamePokedex.save")}
    </button>
  `;
}

function setCardsDirty(isDirty) {
  state.ui.cardsDirty = isDirty;
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.disabled = !isDirty;
  button.classList.toggle("is-dirty", isDirty);
}

function attachCardsSaveButton() {
  const button = document.getElementById("cardsSaveBtn");
  if (!button) return;
  button.addEventListener("click", async () => {
    await saveDataToFile();
    setCardsDirty(false);
  });
  setCardsDirty(Boolean(state.ui.cardsDirty));
}

function normalizeMegaShineLogoUrl(url) {
  if (!url) return "";
  return String(url)
    .replace("/PacksLogos/Mega-Shine.webp", "/PacksLogos/Mega%20Shine.png")
    .replace("/PacksLogos/Mega Shine.png", "/PacksLogos/Mega%20Shine.png");
}

function renderPackLogoImage(logoUrl, altText) {
  const primaryLogo = normalizeMegaShineLogoUrl(logoUrl);
  return `<img src="${primaryLogo}" alt="${altText}" class="pack-logo" loading="lazy" decoding="async" />`;
}

function normalizeGeneticSubpack(raw) {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "charizard" || value === "mewtwo" || value === "pikachu") return value;
  return "all";
}

function renderGeneticApexGroup(activeKey) {
  return `
    <div class="filter-group">
      <h4>Genetic Apex</h4>
      <div class="toggle-group" id="geneticGroup">
        ${GENETIC_APEX_SUBPACKS.map(
          (sub) => `
            <button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.key === "all" ? t("common.all") : sub.label}</button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function attachGeneticApexEvents() {
  const group = document.getElementById("geneticGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;
    const subpack = btn.dataset.subpack;
    const query = subpack && subpack !== "all" ? `?sub=${encodeURIComponent(subpack)}` : "";
    location.hash = `#/pack/${encodeURIComponent(GENETIC_APEX_ID)}${query}`;
  });
}

function normalizeMegaRisingSubpack(raw) {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "gyarados" || value === "blaziken" || value === "altaria") return value;
  return "all";
}

function renderMegaRisingGroup(activeKey) {
  return `
    <div class="filter-group">
      <h4>Mega Rising</h4>
      <div class="toggle-group" id="megaRisingGroup">
        ${MEGA_RISING_SUBPACKS.map(
          (sub) => `
            <button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.key === "all" ? t("common.all") : sub.label}</button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function attachMegaRisingEvents() {
  const group = document.getElementById("megaRisingGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;
    const subpack = btn.dataset.subpack;
    const query = subpack && subpack !== "all" ? `?sub=${encodeURIComponent(subpack)}` : "";
    location.hash = `#/pack/${encodeURIComponent(MEGA_RISING_ID)}${query}`;
  });
}

function normalizeWisdomSeaSkySubpack(raw) {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "ho-oh" || value === "lugia") return value;
  return "all";
}

function renderWisdomSeaSkyGroup(activeKey) {
  return `
    <div class="filter-group">
      <h4>Wisdom of Sea and Sky</h4>
      <div class="toggle-group" id="wisdomSeaSkyGroup">
        ${WISDOM_SEA_SKY_SUBPACKS.map(
          (sub) => `
            <button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.key === "all" ? t("common.all") : sub.label}</button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function attachWisdomSeaSkyEvents() {
  const group = document.getElementById("wisdomSeaSkyGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;
    const subpack = btn.dataset.subpack;
    const query = subpack && subpack !== "all" ? `?sub=${encodeURIComponent(subpack)}` : "";
    location.hash = `#/pack/${encodeURIComponent(WISDOM_SEA_SKY_ID)}${query}`;
  });
}

function normalizeCelestialGuardiansSubpack(raw) {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "solgaleo" || value === "lunala") return value;
  return "all";
}

function renderCelestialGuardiansGroup(activeKey) {
  return `
    <div class="filter-group">
      <h4>Celestial Guardians</h4>
      <div class="toggle-group" id="celestialGuardiansGroup">
        ${CELESTIAL_GUARDIANS_SUBPACKS.map(
          (sub) => `
            <button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.key === "all" ? t("common.all") : sub.label}</button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function attachCelestialGuardiansEvents() {
  const group = document.getElementById("celestialGuardiansGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;
    const subpack = btn.dataset.subpack;
    const query = subpack && subpack !== "all" ? `?sub=${encodeURIComponent(subpack)}` : "";
    location.hash = `#/pack/${encodeURIComponent(CELESTIAL_GUARDIANS_ID)}${query}`;
  });
}

function normalizeSpaceTimeSmackdownSubpack(raw) {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "dialga" || value === "palkia") return value;
  return "all";
}

function renderSpaceTimeSmackdownGroup(activeKey) {
  return `
    <div class="filter-group">
      <h4>Space-Time Smackdown</h4>
      <div class="toggle-group" id="spaceTimeSmackdownGroup">
        ${SPACE_TIME_SMACKDOWN_SUBPACKS.map(
          (sub) => `
            <button class="toggle-btn ${activeKey === sub.key ? "active" : ""}" data-subpack="${sub.key}">${sub.key === "all" ? t("common.all") : sub.label}</button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function attachSpaceTimeSmackdownEvents() {
  const group = document.getElementById("spaceTimeSmackdownGroup");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;
    const subpack = btn.dataset.subpack;
    const query = subpack && subpack !== "all" ? `?sub=${encodeURIComponent(subpack)}` : "";
    location.hash = `#/pack/${encodeURIComponent(SPACE_TIME_SMACKDOWN_ID)}${query}`;
  });
}

function resolvePackLogo(pack) {
  const orderItem = PACKS_ORDER.find((item) => item.id === pack?.id);
  return (
    pack?.logo
    || pack?.artwork
    || orderItem?.artwork
    || "https://storage.yandexcloud.net/poketracker/Images/Artworks/ALL.png"
  );
}

export function renderPack(packTitle, subpack) {
  const app = document.getElementById("app");
  state.filters.pack = packTitle;

  if (!state.data || !state.data.cards || state.data.cards.length === 0) {
    app.innerHTML = `
      <section class="placeholder">
        <h1 class="section-title">${t("pack.loadErrorTitle")}</h1>
        <p>${t("pack.loadErrorText")}</p>
        <p style="color: var(--muted); font-size: 12px;">${t("pack.loadErrorHint")}</p>
      </section>
    `;
    return;
  }

  const packName = packTitle === "ALL" ? "ALL" : packTitle;
  const packData = state.data.packs.find((p) => p.id === packName);

  if (packTitle === "ALL") {
    const cards = applyFilters(state.data.cards);
    const ownedCount = state.data.cards.filter((card) => state.owned.has(formatCardId(card))).length;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderAllPackGroup(), { showApplyButton: true })}
        <div>
          <h1 class="section-title">${t("pack.allTitle")}</h1>
          <p class="section-subtitle">${ownedCount}/${state.data.cards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack("ALL"), { deferApply: true });
    attachCardEvents(() => renderPack("ALL"), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (packTitle === GENETIC_APEX_ID && packData) {
    const activeSubpack = normalizeGeneticSubpack(subpack);
    state.filters.geneticApex = activeSubpack;
    const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
    const subpackName = GENETIC_APEX_SUBPACKS.find((sub) => sub.key === activeSubpack)?.name;
    const visibleCards = activeSubpack === "all"
      ? baseCards
      : baseCards.filter((card) => card.subpacks?.includes(subpackName));
    const cards = applyFilters(visibleCards);
    const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
    const logo = GENETIC_APEX_SUBPACKS.find((sub) => sub.key === activeSubpack)?.logo || packData.logo;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderGeneticApexGroup(activeSubpack))}
        <div>
          <div class="pack-header">
            ${renderPackLogoImage(logo, packData.display)}
          </div>
          <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack(GENETIC_APEX_ID, activeSubpack));
    attachGeneticApexEvents();
    attachCardEvents(() => renderPack(GENETIC_APEX_ID, activeSubpack), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (packTitle === MEGA_RISING_ID && packData) {
    const activeSubpack = normalizeMegaRisingSubpack(subpack);
    state.filters.megaRising = activeSubpack;
    const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
    const subpackName = MEGA_RISING_SUBPACKS.find((sub) => sub.key === activeSubpack)?.name;
    const visibleCards = activeSubpack === "all"
      ? baseCards
      : baseCards.filter((card) => card.subpacks?.includes(subpackName));
    const cards = applyFilters(visibleCards);
    const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
    const logo = MEGA_RISING_SUBPACKS.find((sub) => sub.key === activeSubpack)?.logo || packData.logo;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderMegaRisingGroup(activeSubpack))}
        <div>
          <div class="pack-header">
            ${renderPackLogoImage(logo, packData.display)}
          </div>
          <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack(MEGA_RISING_ID, activeSubpack));
    attachMegaRisingEvents();
    attachCardEvents(() => renderPack(MEGA_RISING_ID, activeSubpack), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (packTitle === WISDOM_SEA_SKY_ID && packData) {
    const activeSubpack = normalizeWisdomSeaSkySubpack(subpack);
    state.filters.wisdomSeaSky = activeSubpack;
    const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
    const subpackName = WISDOM_SEA_SKY_SUBPACKS.find((sub) => sub.key === activeSubpack)?.name;
    const visibleCards = activeSubpack === "all"
      ? baseCards
      : baseCards.filter((card) => card.subpacks?.includes(subpackName));
    const cards = applyFilters(visibleCards);
    const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
    const logo = WISDOM_SEA_SKY_SUBPACKS.find((sub) => sub.key === activeSubpack)?.logo || packData.logo;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderWisdomSeaSkyGroup(activeSubpack))}
        <div>
          <div class="pack-header">
            ${renderPackLogoImage(logo, packData.display)}
          </div>
          <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack(WISDOM_SEA_SKY_ID, activeSubpack));
    attachWisdomSeaSkyEvents();
    attachCardEvents(() => renderPack(WISDOM_SEA_SKY_ID, activeSubpack), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (packTitle === CELESTIAL_GUARDIANS_ID && packData) {
    const activeSubpack = normalizeCelestialGuardiansSubpack(subpack);
    state.filters.celestialGuardians = activeSubpack;
    const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
    const subpackName = CELESTIAL_GUARDIANS_SUBPACKS.find((sub) => sub.key === activeSubpack)?.name;
    const visibleCards = activeSubpack === "all"
      ? baseCards
      : baseCards.filter((card) => card.subpacks?.includes(subpackName));
    const cards = applyFilters(visibleCards);
    const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
    const logo = CELESTIAL_GUARDIANS_SUBPACKS.find((sub) => sub.key === activeSubpack)?.logo || packData.logo;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderCelestialGuardiansGroup(activeSubpack))}
        <div>
          <div class="pack-header">
            ${renderPackLogoImage(logo, packData.display)}
          </div>
          <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack(CELESTIAL_GUARDIANS_ID, activeSubpack));
    attachCelestialGuardiansEvents();
    attachCardEvents(() => renderPack(CELESTIAL_GUARDIANS_ID, activeSubpack), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (packTitle === SPACE_TIME_SMACKDOWN_ID && packData) {
    const activeSubpack = normalizeSpaceTimeSmackdownSubpack(subpack);
    state.filters.spaceTimeSmackdown = activeSubpack;
    const baseCards = state.data.cards.filter((card) => card.pack === packData.id);
    const subpackName = SPACE_TIME_SMACKDOWN_SUBPACKS.find((sub) => sub.key === activeSubpack)?.name;
    const visibleCards = activeSubpack === "all"
      ? baseCards
      : baseCards.filter((card) => card.subpacks?.includes(subpackName));
    const cards = applyFilters(visibleCards);
    const ownedCount = visibleCards.filter((card) => state.owned.has(formatCardId(card))).length;
    const logo = SPACE_TIME_SMACKDOWN_SUBPACKS.find((sub) => sub.key === activeSubpack)?.logo || packData.logo;
    app.innerHTML = `
      <section class="pack-page">
        ${renderFilters(renderSpaceTimeSmackdownGroup(activeSubpack))}
        <div>
          <div class="pack-header">
            ${renderPackLogoImage(logo, packData.display)}
          </div>
          <p class="section-subtitle">${ownedCount}/${visibleCards.length}</p>
          ${renderCardGrid(cards)}
        </div>
      </section>
      ${renderCardsSaveButton()}
    `;
    attachFilterEvents(() => renderPack(SPACE_TIME_SMACKDOWN_ID, activeSubpack));
    attachSpaceTimeSmackdownEvents();
    attachCardEvents(() => renderPack(SPACE_TIME_SMACKDOWN_ID, activeSubpack), { rerenderOnToggle: false });
    attachCardsSaveButton();
    return;
  }

  if (!packData) {
    app.innerHTML = `
      <section class="placeholder">
        <h1 class="section-title">${packTitle}</h1>
        <p>${t("pack.notAdded")}</p>
      </section>
    `;
    return;
  }

  const cards = applyFilters(state.data.cards.filter((card) => card.pack === packData.id));
  const ownedCount = state.data.cards.filter(
    (card) => card.pack === packData.id && state.owned.has(formatCardId(card))
  ).length;
  const logo = resolvePackLogo(packData);
  app.innerHTML = `
    <section class="pack-page">
      ${renderFilters()}
      <div>
        <div class="pack-header">
          <img src="${logo}" alt="${packData.display}" class="pack-logo" loading="lazy" decoding="async" />
        </div>
        <p class="section-subtitle">${ownedCount}/${packData.count}</p>
        ${renderCardGrid(cards)}
      </div>
    </section>
    ${renderCardsSaveButton()}
  `;
  attachFilterEvents(() => renderPack(packTitle));
  attachCardEvents(() => renderPack(packTitle), { rerenderOnToggle: false });
  attachCardsSaveButton();
}
