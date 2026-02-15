import {
    ENERGY_TYPES,
    RARITY_ICONS,
    TRAINER_TYPES,
    TYPE_ICONS,
} from "../config/packs.js";
import { t } from "../core/i18n.js";
import { state } from "../core/state.js";

export function formatCardId(card) {
  return `${card.pack}-${card.number}`;
}

export function formatCardNumber(number) {
  return String(number).padStart(3, "0");
}

export function formatCardCode(card) {
  if (!card.code || !card.code.includes("#")) {
    return `${formatCardNumber(card.number)}`;
  }
  const base = card.code.split("#")[0].trim();
  return `${base} #${formatCardNumber(card.number)}`;
}

export function getCardCategory(card) {
  const type = String(card.type || "").trim().toUpperCase();
  if (ENERGY_TYPES.has(type)) return "POKEMON";
  if (TRAINER_TYPES.includes(type)) return type;
  return "OTHER";
}

export function renderCardTypeBadge(card) {
  const type = String(card.type || "").trim().toUpperCase();
  if (ENERGY_TYPES.has(type)) {
    const typeIcon = TYPE_ICONS[type] || TYPE_ICONS.COLORLESS;
    return `<span class="icon-badge type-badge"><img src="${typeIcon}" alt="${type}" /></span>`;
  }
  return `<span class="type-text-badge">${type || "UNKNOWN"}</span>`;
}

export function toggleOwned(cardId) {
  if (state.owned.has(cardId)) {
    state.owned.delete(cardId);
  } else {
    state.owned.add(cardId);
    if (state.wishlist.has(cardId)) {
      state.wishlist.delete(cardId);
    }
  }
  state.ui.cardsDirty = true;
}

export function toggleShowcase(cardId) {
  const active = getActiveShowcase();
  if (!active) return;
  toggleShowcaseCard(active.id, cardId);
}

export function toggleWishlist(cardId) {
  if (state.wishlist.has(cardId)) {
    state.wishlist.delete(cardId);
  } else {
    state.wishlist.add(cardId);
  }
  state.ui.cardsDirty = true;
}

export function renderCardGrid(cards, options = {}) {
  const {
    showWishlist = true,
    showShowcase = false,
    showcaseSet = new Set(),
  } = options;
  const scaleMap = { lg: 1.25, md: 1, sm: 0.85 };
  const scaleValue = scaleMap[state.filters.scale] || 1;
  const iconScaleMap = { lg: 1.05, md: 1, sm: 0.78 };
  const iconScale = iconScaleMap[state.filters.scale] || 1;
  return `
    <div class="cards-grid" style="--card-scale: ${scaleValue}; --icon-scale: ${iconScale}">
      ${cards
        .map((card) => {
          const cardId = formatCardId(card);
          const owned = state.owned.has(cardId);
          const wished = showWishlist ? (state.wishlist?.has(cardId) ?? false) : false;
          const inShowcase = showShowcase ? showcaseSet.has(cardId) : false;
          const safeId = cardId.replace(/[^a-z0-9_-]/gi, "");
          const gradientId = `heartGradient-${safeId}`;
          const heartFill = wished ? `url(#${gradientId})` : "none";
          const heartStroke = wished ? "rgba(255, 120, 160, 0.95)" : "rgba(255, 255, 255, 0.75)";
          const displayCode = formatCardCode(card);
          const rarityIcon = RARITY_ICONS[card.rarity] || "https://storage.yandexcloud.net/poketracker/Images/Rarity/DIAMOND1.png";
          const wishlistHtml = showWishlist && !owned
            ? `
              <button class="wishlist-heart ${wished ? "active" : ""}" data-card-id="${cardId}" aria-label="${t("wishlist.aria")}" type="button">
                <svg viewBox="0 0 24 24" class="heart-icon" aria-hidden="true" style="--heart-fill: ${heartFill}; --heart-stroke: ${heartStroke};">
                  <defs>
                    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#ff6b6b" />
                      <stop offset="100%" stop-color="#ff2e79" />
                    </linearGradient>
                  </defs>
                  <path d="M12 21s-7.5-4.35-9.5-8.35C1 9 3 5 6.8 5c2 0 3.4 1 4.2 2.3C11.8 6 13.2 5 15.2 5 19 5 21 9 21.5 12.65 19.5 16.65 12 21 12 21z" />
                </svg>
              </button>
            `
            : "";
          const pokeballHtml = showShowcase
            ? ""
            : `<div class="pokeball ${owned ? "collected" : ""}" data-card-id="${cardId}"></div>`;
          const showcaseHtml = showShowcase && owned
            ? `
              <button class="showcase-star ${inShowcase ? "active" : ""}" data-card-id="${cardId}" aria-label="${t("showcase.aria")}" type="button">
                <svg viewBox="0 0 24 24" class="star-icon" aria-hidden="true">
                  <path d="M12 3.4l2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.4z" />
                </svg>
              </button>
            `
            : "";
          return `
            <div class="card-item">
              ${pokeballHtml}
              ${wishlistHtml}
              ${showcaseHtml}
              <img src="${card.image}" alt="${card.name}" loading="lazy" decoding="async" />
              <div class="card-meta">
                <h3>${card.name}</h3>
                <span>${displayCode}</span>
                <div class="meta-icons">
                  <span class="icon-badge rarity-badge"><img src="${rarityIcon}" alt="${card.rarity}" /></span>
                  ${renderCardTypeBadge(card)}
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export function attachCardEvents(render, options = {}) {
  const { enableShowcase = false, showcaseId = null } = options;
  document.querySelectorAll(".pokeball").forEach((ball) => {
    ball.addEventListener("click", () => {
      const id = ball.dataset.cardId;
      toggleOwned(id);
      render();
    });
  });
  document.querySelectorAll(".wishlist-heart").forEach((heart) => {
    heart.addEventListener("click", () => {
      const id = heart.dataset.cardId;
      toggleWishlist(id);
      render();
    });
  });
  if (enableShowcase && showcaseId) {
    document.querySelectorAll(".showcase-star").forEach((star) => {
      star.addEventListener("click", () => {
        const id = star.dataset.cardId;
        toggleShowcaseCard(showcaseId, id);
        render();
      });
    });
  }
}

