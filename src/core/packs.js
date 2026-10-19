import { state } from "./state.js";

export function getPacks() {
  return state.data?.packs || [];
}

export function getPack(id) {
  const key = normalizeKey(id);
  if (!key) return null;
  return getPacks().find((pack) => [pack.id, pack.display, pack.name].some((value) => normalizeKey(value) === key)) || null;
}

export function getSubpacks(pack) {
  return Array.isArray(pack?.subpacks) ? pack.subpacks : [];
}

export function getPackPrimaryMedia(pack) {
  if (pack?.logo || pack?.artwork) return pack.logo || pack.artwork;
  if (pack?.kind !== "collection") return "";
  const display = String(pack.display || pack.id || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return display
    ? `https://storage.yandexcloud.net/poketracker/Images/PacksLogos/${encodeURIComponent(display)}.webp`
    : "";
}

function packKeys(pack) {
  return [pack?.id, pack?.display, pack?.name].filter(Boolean).map(normalizeKey);
}

export function getTopLevelPacks() {
  const packs = getPacks();
  const childKeys = new Set(packs.flatMap((pack) => getSubpacks(pack).flatMap(packKeys)));
  return packs.filter((pack) => !childKeys.has(normalizeKey(pack.id)) && !childKeys.has(normalizeKey(pack.display)));
}

export function getCardsForPack(cards, pack) {
  const keys = new Set([normalizeKey(pack?.id), normalizeKey(pack?.display), ...getSubpacks(pack).flatMap(packKeys)]);
  return (cards || []).filter((card) => keys.has(normalizeKey(card.pack)));
}

function normalizeKey(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

export function resolveSubpack(pack, value) {
  if (!value || normalizeKey(value) === "all") return null;
  return getSubpacks(pack).find((subpack) =>
    [subpack.id, subpack.display, subpack.name].some((candidate) => normalizeKey(candidate) === normalizeKey(value))
  ) || null;
}

export function filterPackCards(cards, pack, subpack = null) {
  const base = (cards || []).filter((card) => card.pack === pack?.id);
  if (!subpack) return base;
  const membership = subpack.id || subpack.display || subpack.name;
  return base.filter((card) => Array.isArray(card.subpacks) && card.subpacks.some((name) => normalizeKey(name) === normalizeKey(membership)));
}

export function countSubpackCards(cards, pack, subpack) {
  return filterPackCards(cards, pack, subpack).length;
}

export function getPackTiles() {
  const tiles = [];
  for (const pack of getPacks()) {
    if (pack.kind === "collection" && getSubpacks(pack).length) {
      for (const subpack of getSubpacks(pack)) {
        tiles.push({
          href: `#/pack/${encodeURIComponent(pack.id)}?sub=${encodeURIComponent(subpack.id || subpack.display)}`,
          artwork: subpack.artwork || subpack.logo || "",
          logo: subpack.logo || subpack.artwork || "",
          label: subpack.display || subpack.id,
          packId: pack.id,
          subpackId: subpack.id || subpack.display,
          count: countSubpackCards(state.data?.cards, pack, subpack),
          series: pack.series,
        });
      }
    } else {
      tiles.push({
        href: `#/pack/${encodeURIComponent(pack.id)}`,
        artwork: pack.artwork || pack.logo || "",
        logo: pack.logo || pack.artwork || "",
        label: pack.display || pack.id,
        packId: pack.id,
        count: pack.count,
        series: pack.series,
      });
    }
  }
  return tiles;
}

export function getPackMediaHtml(pack, className = "pack-logo") {
  if (pack?.kind === "collection") {
    const children = getSubpacks(pack);
    return `<span class="pack-children-media">${children.map((subpack) =>
      `<img class="${className}" src="${subpack.logo || subpack.artwork || ""}" alt="${subpack.display || subpack.id}" loading="lazy" decoding="async" />`
    ).join("")}</span>`;
  }
  const url = getPackPrimaryMedia(pack);
  return url ? `<img src="${url}" alt="${pack?.display || pack?.id || ""}" class="${className}" loading="lazy" decoding="async" />` : "";
}
