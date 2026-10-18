import { DEFAULT_LANGUAGE, DEFAULT_THEME, state } from "./state.js";

export async function loadAuth() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  state.user = data.authenticated ? { username: data.username, pokemonNumber: data.pokemon_number || 1 } : null;
  return state.user;
}

export async function authenticate(endpoint, username, password) {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.detail || "Authentication failed.");
  }
  state.user = { username: data.username, pokemonNumber: data.pokemon_number || 1 };
  return state.user;
}

export async function saveAvatar(pokemonNumber) {
  const response = await fetch("/api/auth/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pokemon_number: pokemonNumber }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || data.detail || "Could not save avatar.");
  if (state.user) state.user.pokemonNumber = data.pokemon_number;
  window.dispatchEvent(new Event("authstatechange"));
  return data;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  state.user = null;
  state.owned = new Set();
  state.wishlist = new Set();
  state.ui = {
    packsHomeMode: "grid", language: DEFAULT_LANGUAGE, theme: DEFAULT_THEME,
    gamePokedex: {}, gamePokedexPage: {}, gamePokedexVersion: {},
    gamePokedexDirty: false, cardsDirty: false, settingsDirty: false,
    packFiltersOpen: false, filterSectionsOpen: new Set(),
  };
  state.filters = {
    query: "", rarities: new Set(), types: new Set(), owned: "all", cardType: "all",
    sort: "number", sortDir: { number: "asc", name: "asc", rarity: "asc" },
    pack: "ALL", scale: "md", geneticApex: "all", megaRising: "all",
    wisdomSeaSky: "all", celestialGuardians: "all", spaceTimeSmackdown: "all",
    collectionMode: "packs", wishlistMode: "packs", packFilters: new Set(),
  };
}
