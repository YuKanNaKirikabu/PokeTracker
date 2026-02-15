import {
    CELESTIAL_GUARDIANS_ID,
    CELESTIAL_GUARDIANS_SUBPACKS,
    GENETIC_APEX_ID,
    GENETIC_APEX_SUBPACKS,
    KNOWN_PACKS,
    MEGA_RISING_ID,
    MEGA_RISING_SUBPACKS,
    PACKS_ORDER,
    SPACE_TIME_SMACKDOWN_ID,
    SPACE_TIME_SMACKDOWN_SUBPACKS,
    WISDOM_SEA_SKY_ID,
    WISDOM_SEA_SKY_SUBPACKS,
} from "../config/packs.js";
import { formatCardsCount, t } from "../core/i18n.js";
import { state } from "../core/state.js";

export function renderPacksDropdown() {
  const dropdown = document.getElementById("packsDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  PACKS_ORDER.filter((item) => !item.id.startsWith("Series")).forEach((item) => {
    if (item.id === GENETIC_APEX_ID) {
      const geneticCards = state.data?.cards.filter((card) => card.pack === KNOWN_PACKS[GENETIC_APEX_ID]) || [];
      GENETIC_APEX_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        const count = geneticCards.filter((card) => card.subpacks?.includes(sub.name)).length;
        const link = document.createElement("a");
        link.className = "dropdown-pack";
        link.href = `#/pack/${encodeURIComponent(GENETIC_APEX_ID)}?sub=${encodeURIComponent(sub.key)}`;
        link.innerHTML = `
          <img src="${sub.artwork}" alt="${sub.label}" loading="lazy" decoding="async" />
          <div>
            <div>${sub.label}</div>
            <div class="pack-card-meta">${formatCardsCount(count)}</div>
          </div>
        `;
        dropdown.appendChild(link);
      });
      return;
    }
    if (item.id === MEGA_RISING_ID) {
      const megaCards = state.data?.cards.filter((card) => card.pack === KNOWN_PACKS[MEGA_RISING_ID]) || [];
      MEGA_RISING_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        const count = megaCards.filter((card) => card.subpacks?.includes(sub.name)).length;
        const link = document.createElement("a");
        link.className = "dropdown-pack";
        link.href = `#/pack/${encodeURIComponent(MEGA_RISING_ID)}?sub=${encodeURIComponent(sub.key)}`;
        link.innerHTML = `
          <img src="${sub.artwork}" alt="${sub.label}" loading="lazy" decoding="async" />
          <div>
            <div>${sub.label}</div>
            <div class="pack-card-meta">${formatCardsCount(count)}</div>
          </div>
        `;
        dropdown.appendChild(link);
      });
      return;
    }
    if (item.id === WISDOM_SEA_SKY_ID) {
      const seaSkyCards = state.data?.cards.filter((card) => card.pack === KNOWN_PACKS[WISDOM_SEA_SKY_ID]) || [];
      WISDOM_SEA_SKY_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        const count = seaSkyCards.filter((card) => card.subpacks?.includes(sub.name)).length;
        const link = document.createElement("a");
        link.className = "dropdown-pack";
        link.href = `#/pack/${encodeURIComponent(WISDOM_SEA_SKY_ID)}?sub=${encodeURIComponent(sub.key)}`;
        link.innerHTML = `
          <img src="${sub.artwork}" alt="${sub.label}" loading="lazy" decoding="async" />
          <div>
            <div>${sub.label}</div>
            <div class="pack-card-meta">${formatCardsCount(count)}</div>
          </div>
        `;
        dropdown.appendChild(link);
      });
      return;
    }
    if (item.id === CELESTIAL_GUARDIANS_ID) {
      const celestialCards = state.data?.cards.filter((card) => card.pack === KNOWN_PACKS[CELESTIAL_GUARDIANS_ID]) || [];
      CELESTIAL_GUARDIANS_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        const count = celestialCards.filter((card) => card.subpacks?.includes(sub.name)).length;
        const link = document.createElement("a");
        link.className = "dropdown-pack";
        link.href = `#/pack/${encodeURIComponent(CELESTIAL_GUARDIANS_ID)}?sub=${encodeURIComponent(sub.key)}`;
        link.innerHTML = `
          <img src="${sub.artwork}" alt="${sub.label}" loading="lazy" decoding="async" />
          <div>
            <div>${sub.label}</div>
            <div class="pack-card-meta">${formatCardsCount(count)}</div>
          </div>
        `;
        dropdown.appendChild(link);
      });
      return;
    }
    if (item.id === SPACE_TIME_SMACKDOWN_ID) {
      const spaceCards = state.data?.cards.filter((card) => card.pack === KNOWN_PACKS[SPACE_TIME_SMACKDOWN_ID]) || [];
      SPACE_TIME_SMACKDOWN_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        const count = spaceCards.filter((card) => card.subpacks?.includes(sub.name)).length;
        const link = document.createElement("a");
        link.className = "dropdown-pack";
        link.href = `#/pack/${encodeURIComponent(SPACE_TIME_SMACKDOWN_ID)}?sub=${encodeURIComponent(sub.key)}`;
        link.innerHTML = `
          <img src="${sub.artwork}" alt="${sub.label}" loading="lazy" decoding="async" />
          <div>
            <div>${sub.label}</div>
            <div class="pack-card-meta">${formatCardsCount(count)}</div>
          </div>
        `;
        dropdown.appendChild(link);
      });
      return;
    }
    const packData = state.data?.packs.find((p) => p.id === item.id);
    const displayTitle = item.id === "ALL" ? t("pack.allTitle") : item.title;
    const link = document.createElement("a");
    link.className = "dropdown-pack";
    link.href = item.id === "ALL" ? "#/all" : `#/pack/${encodeURIComponent(item.id)}`;
    link.innerHTML = `
      <img src="${packData?.artwork || "https://storage.yandexcloud.net/poketracker/Images/Artworks/ALL.png"}" alt="${displayTitle}" loading="lazy" decoding="async" />
      <div>
        <div>${displayTitle}</div>
        <div class="pack-card-meta">${packData ? formatCardsCount(packData.count) : t("common.soon")}</div>
      </div>
    `;
    dropdown.appendChild(link);
  });
}

export function getMobilePackTiles() {
  const tiles = [];
  PACKS_ORDER.forEach((item) => {
    if (item.id === "Series A" || item.id === "Series B") return;
    if (item.id === GENETIC_APEX_ID) {
      GENETIC_APEX_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        tiles.push({
          href: `#/pack/${encodeURIComponent(GENETIC_APEX_ID)}?sub=${encodeURIComponent(sub.key)}`,
          artwork: sub.artwork,
          label: sub.label,
        });
      });
      return;
    }
    if (item.id === MEGA_RISING_ID) {
      MEGA_RISING_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        tiles.push({
          href: `#/pack/${encodeURIComponent(MEGA_RISING_ID)}?sub=${encodeURIComponent(sub.key)}`,
          artwork: sub.artwork,
          label: sub.label,
        });
      });
      return;
    }
    if (item.id === WISDOM_SEA_SKY_ID) {
      WISDOM_SEA_SKY_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        tiles.push({
          href: `#/pack/${encodeURIComponent(WISDOM_SEA_SKY_ID)}?sub=${encodeURIComponent(sub.key)}`,
          artwork: sub.artwork,
          label: sub.label,
        });
      });
      return;
    }
    if (item.id === CELESTIAL_GUARDIANS_ID) {
      CELESTIAL_GUARDIANS_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        tiles.push({
          href: `#/pack/${encodeURIComponent(CELESTIAL_GUARDIANS_ID)}?sub=${encodeURIComponent(sub.key)}`,
          artwork: sub.artwork,
          label: sub.label,
        });
      });
      return;
    }
    if (item.id === SPACE_TIME_SMACKDOWN_ID) {
      SPACE_TIME_SMACKDOWN_SUBPACKS.filter((sub) => sub.key !== "all").forEach((sub) => {
        tiles.push({
          href: `#/pack/${encodeURIComponent(SPACE_TIME_SMACKDOWN_ID)}?sub=${encodeURIComponent(sub.key)}`,
          artwork: sub.artwork,
          label: sub.label,
        });
      });
      return;
    }
    const packData = state.data?.packs.find((p) => p.id === item.id);
    const artwork = packData?.artwork || item.artwork || "https://storage.yandexcloud.net/poketracker/Images/Artworks/ALL.png";
    const href = item.id === "ALL" ? "#/all" : `#/pack/${encodeURIComponent(item.id)}`;
    const label = item.id === "ALL" ? t("pack.allTitle") : item.title;
    tiles.push({
      href,
      artwork,
      label,
    });
  });
  return tiles;
}

export function setupPacksArc(container, tiles) {
  if (!container) return () => {};

  const track = document.createElement("div");
  track.className = "pack-arc-track";
  container.appendChild(track);

  const items = [];
  tiles.forEach((tileData) => {
    const item = document.createElement("a");
    item.className = "pack-arc-item";
    item.href = tileData.href;
    item.innerHTML = `<img src="${tileData.artwork}" alt="${tileData.label}" loading="lazy" decoding="async" />`;
    track.appendChild(item);
    items.push(item);
  });

  let minAngle = -40;
  let maxAngle = 220;
  let visibleMin = 10;
  let visibleMax = 170;
  const stateArc = state.ui.arc || {
    speed: 0.03,
    direction: -1,
    raf: null,
    phases: items.map((_, i) => i / items.length),
    hoverIndex: null,
    pointerX: 0,
    pointerY: 0,
    lastInputAt: 0,
  };
  if (!stateArc.phases || stateArc.phases.length !== items.length) {
    stateArc.phases = items.map((_, i) => i / items.length);
  }
  state.ui.arc = stateArc;

  const total = items.length;
  const packWidth = 180;
  let radiusX = 0;
  let radiusY = 260;

  const computeLayout = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(1, height);
    const aspectClamped = Math.min(2.4, Math.max(1.2, aspect));
    const extra = Math.max(0, aspect - 1.7);

    const visibleRange = Math.max(90, Math.min(160, 120 + (aspectClamped - 1.6) * 60));
    visibleMin = 90 - visibleRange / 2;
    visibleMax = 90 + visibleRange / 2;

    minAngle = visibleMin - 55;
    maxAngle = visibleMax + 55;

    radiusX = Math.max(120, width / 2 + packWidth * (0.25 + extra * 0.05));
    radiusY = 320 / (1 + extra * 0.08);
  };

  computeLayout();

  const update = () => {
    computeLayout();
    const now = Date.now();
    if (now - stateArc.lastInputAt > 120) {
      stateArc.speed = Math.max(0.03, stateArc.speed * 0.986);
    }
    const range = Math.max(1, maxAngle - minAngle);
    const phaseDelta = (stateArc.speed / range) * stateArc.direction;
    for (let i = 0; i < total; i += 1) {
      let nextPhase = stateArc.phases[i] + phaseDelta;
      if (nextPhase >= 1) nextPhase -= 1;
      if (nextPhase < 0) nextPhase += 1;
      stateArc.phases[i] = nextPhase;
    }

    let hoveredElement = null;
    if (stateArc.pointerX || stateArc.pointerY) {
      hoveredElement = document.elementFromPoint(stateArc.pointerX, stateArc.pointerY);
    }

    let hoveredIndex = null;
    if (hoveredElement) {
      const hoveredItem = hoveredElement.closest?.(".pack-arc-item");
      if (hoveredItem) {
        hoveredIndex = items.indexOf(hoveredItem);
      }
    }

    for (let i = 0; i < total; i += 1) {
      const angle = minAngle + stateArc.phases[i] * range;
      const radians = (angle * Math.PI) / 180;

      const x = Math.cos(radians) * radiusX;
      const y = Math.sin(radians) * radiusY;
      const scale = 0.85 + Math.sin(radians) * 0.15;
      const rotateY = (angle - 90) * 0.25;
      const rotateZ = (90 - angle) * 0.15;
      const zIndex = Math.round(1000 + Math.sin(radians) * 100);
      const isVisible = angle >= visibleMin && angle <= visibleMax;

      items[i].style.transform = `translate(-50%, -50%) translate3d(${x}px, ${-y}px, 0) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      items[i].style.zIndex = zIndex;
      items[i].style.opacity = isVisible ? 1 : 0;
      if (i === hoveredIndex) {
        items[i].classList.add("is-hover");
      } else {
        items[i].classList.remove("is-hover");
      }
    }

    stateArc.raf = requestAnimationFrame(update);
  };

  const baseSpeed = 0.03;
  const maxSpeed = 0.35;

  const onWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY;
    const nextDirection = delta > 0 ? -1 : 1;
    if (stateArc.direction !== nextDirection) {
      stateArc.speed = Math.max(baseSpeed, stateArc.speed * 0.6);
      stateArc.direction = nextDirection;
    }
    stateArc.speed = Math.min(stateArc.speed + 0.05, maxSpeed);
    stateArc.lastInputAt = Date.now();
    clearTimeout(stateArc.slowdownTimer);
    stateArc.slowdownTimer = setTimeout(() => {
      stateArc.lastInputAt = Date.now() - 1000;
    }, 220);
  };

  const onMouseMove = (event) => {
    stateArc.pointerX = event.clientX;
    stateArc.pointerY = event.clientY;
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("mousemove", onMouseMove);
  update();

  return () => {
    container.removeEventListener("wheel", onWheel);
    window.removeEventListener("mousemove", onMouseMove);
    if (stateArc.raf) cancelAnimationFrame(stateArc.raf);
  };
}

