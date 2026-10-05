import { formatCardsCount, t } from "../core/i18n.js";
import { getPackSubpacks } from "../core/data.js";
import { state } from "../core/state.js";

export function renderPacksDropdown() {
  const dropdown = document.getElementById("packsDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  (state.data?.packs || []).forEach((packData) => {
    const displayTitle = packData.display || packData.id;
    const link = document.createElement("a");
    link.className = "dropdown-pack";
    link.href = `#/pack/${encodeURIComponent(packData.id)}`;
    link.innerHTML = `
      <img src="${packData.artwork || packData.logo || ""}" alt="${displayTitle}" loading="lazy" decoding="async" />
      <div>
        <div>${displayTitle}</div>
        <div class="pack-card-meta">${formatCardsCount(packData.count)}</div>
      </div>
    `;
    dropdown.appendChild(link);
  });
}

export function getMobilePackTiles() {
  const tiles = [];
  (state.data?.packs || []).forEach((packData) => {
    const subpacks = getPackSubpacks(packData.id);
    if (subpacks.length) {
      subpacks.forEach((sub) => tiles.push({
        href: `#/pack/${encodeURIComponent(packData.id)}?sub=${encodeURIComponent(sub.key)}`,
        artwork: sub.artwork || packData.artwork || packData.logo,
        label: sub.label,
      }));
      return;
    }
    tiles.push({
      href: `#/pack/${encodeURIComponent(packData.id)}`,
      artwork: packData.artwork || packData.logo,
      label: packData.display || packData.id,
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

