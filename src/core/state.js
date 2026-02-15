export const state = {
  data: null,
  owned: new Set(),
  wishlist: new Set(),
  ui: {
    packsHomeMode: "grid",
    language: "ru",
    theme: "dark",
    gamePokedex: {},
    gamePokedexPage: {},
    gamePokedexVersion: {},
    gamePokedexDirty: false,
    cardsDirty: false,
    settingsDirty: false,
    packFiltersOpen: false,
  },
  filters: {
    query: "",
    rarities: new Set(),
    types: new Set(),
    owned: "all",
    cardType: "all",
    sort: "number",
    sortDir: {
      number: "asc",
      name: "asc",
      rarity: "asc",
    },
    pack: "ALL",
    scale: "md",
    geneticApex: "all",
    megaRising: "all",
    wisdomSeaSky: "all",
    celestialGuardians: "all",
    spaceTimeSmackdown: "all",
    collectionMode: "packs",
    wishlistMode: "packs",
    packFilters: new Set(),
  },
};

export const DEFAULT_LANGUAGE = "ru";
export const DEFAULT_THEME = "dark";
