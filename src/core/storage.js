import { state } from "./state.js";

let autoSaveTimeout;
let autoSaveSettingsTimeout;

export function getStorageSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function saveStorageSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function initStorage() {
  // Storage is now server-only, no localStorage
}

export async function saveDataToFile() {
  const data = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    owned: [...state.owned].sort((a, b) => a.localeCompare(b, "en")),
    wishlist: [...state.wishlist].sort((a, b) => a.localeCompare(b, "en")),
  };

  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Unknown error");
    }

    return result;
  } catch (err) {
    throw new Error(`Save error: ${err.message}`);
  }
}

export async function saveGamePokedexToFile() {
  const pokedexData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    pokedexes: {},
  };

  console.log("Saving game pokedex. Current state.ui.gamePokedex:", state.ui.gamePokedex);

  if (state.ui.gamePokedex) {
    for (const [gameId, marks] of Object.entries(state.ui.gamePokedex)) {
      const cleanId = gameId.replace(/-v\d+$/, "");
      console.log(`Processing key "${gameId}" -> cleanId "${cleanId}"`);

      if (!pokedexData.pokedexes[cleanId]) {
        pokedexData.pokedexes[cleanId] = {
          versions: {},
          currentPage: state.ui.gamePokedexPage?.[cleanId] || 1,
          selectedVersion: state.ui.gamePokedexVersion?.[cleanId] || 0,
        };
      }

      const versionMatch = gameId.match(/-v(\d+)$/);
      const versionKey = versionMatch ? `v${versionMatch[1]}` : "v0";
      console.log(`  versionMatch=${versionMatch?.[1]}, versionKey="${versionKey}"`);

      const markedArray =
        marks.blue instanceof Set
          ? [...marks.blue]
          : Array.isArray(marks.blue)
            ? marks.blue
            : [];
      const unmarkedArray =
        marks.red instanceof Set
          ? [...marks.red]
          : Array.isArray(marks.red)
            ? marks.red
            : [];

      pokedexData.pokedexes[cleanId].versions[versionKey] = {
        marked: markedArray.sort((a, b) => a.localeCompare(b, "en")),
        unmarked: unmarkedArray.sort((a, b) => a.localeCompare(b, "en")),
      };
    }
  }

  console.log("Saving pokedex data:", pokedexData);

  try {
    const response = await fetch("/api/save-game-pokedex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pokedexData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Game pokedex save error: ${err.message}`);
  }
}

export async function loadGamePokedexFromFile() {
  try {
    const response = await fetch("/api/load-game-pokedex");
    if (!response.ok) {
      console.error(`Failed to load game pokedex: HTTP ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log("Loaded game pokedex data from file:", data);

    if (data.pokedexes) {
      if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
      if (!state.ui.gamePokedexPage) state.ui.gamePokedexPage = {};
      if (!state.ui.gamePokedexVersion) state.ui.gamePokedexVersion = {};

      for (const [gameId, pokedex] of Object.entries(data.pokedexes)) {
        state.ui.gamePokedexPage[gameId] = pokedex.currentPage || 1;
        state.ui.gamePokedexVersion[gameId] = pokedex.selectedVersion || 0;

        const versionEntries = Object.entries(pokedex.versions);

        for (const [versionKey, versionData] of versionEntries) {
          const versionNum = parseInt(versionKey.replace("v", "")) || 0;
          const stateKey = versionEntries.length > 1 ? `${gameId}-v${versionNum}` : gameId;

          state.ui.gamePokedex[stateKey] = {
            blue: new Set(versionData.marked || []),
            red: new Set(versionData.unmarked || []),
            sort: "found",
          };

          console.log(
            `Loaded state key "${stateKey}": marked=${versionData.marked?.length || 0}, unmarked=${versionData.unmarked?.length || 0}`
          );
        }
      }

      console.log("Final gamePokedex state:", state.ui.gamePokedex);
    }
  } catch (err) {
    console.error(`Game pokedex load error: ${err.message}`);
  }
}

export async function saveSettingsToFile() {
  const settings = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    ui: {},
  };

  const excludeKeys = ["gamePokedex", "gamePokedexPage", "gamePokedexVersion", "gamePokedexMode"];
  for (const [key, value] of Object.entries(state.ui)) {
    if (!excludeKeys.includes(key)) {
      settings.ui[key] = value;
    }
  }

  try {
    const response = await fetch("/api/save-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Unknown error");
    }

    return result;
  } catch (err) {
    console.error(`Settings save error: ${err.message}`);
  }
}

export async function loadDataFromFile() {
  try {
    const response = await fetch("/api/load");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    state.owned = new Set(data.owned || []);
    state.wishlist = new Set(data.wishlist || []);

    return {
      owned: data.owned?.length || 0,
      wishlist: data.wishlist?.length || 0,
      date: data.exportDate,
      method: "server",
    };
  } catch (err) {
    throw new Error(`Load error: ${err.message}`);
  }
}

export async function loadBootstrapFromFile() {
  try {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const collection = payload.collection || {};
    const settings = payload.settings || {};
    const gamePokedex = payload.gamePokedex || {};

    state.owned = new Set(collection.owned || []);
    state.wishlist = new Set(collection.wishlist || []);

    if (settings.ui) {
      state.ui = { ...state.ui, ...settings.ui };
    }

    if (gamePokedex.pokedexes) {
      if (!state.ui.gamePokedex) state.ui.gamePokedex = {};
      if (!state.ui.gamePokedexPage) state.ui.gamePokedexPage = {};
      if (!state.ui.gamePokedexVersion) state.ui.gamePokedexVersion = {};

      for (const [gameId, pokedex] of Object.entries(gamePokedex.pokedexes)) {
        state.ui.gamePokedexPage[gameId] = pokedex.currentPage || 1;
        state.ui.gamePokedexVersion[gameId] = pokedex.selectedVersion || 0;

        const versionEntries = Object.entries(pokedex.versions || {});

        for (const [versionKey, versionData] of versionEntries) {
          const versionNum = parseInt(versionKey.replace("v", "")) || 0;
          const stateKey = versionEntries.length > 1 ? `${gameId}-v${versionNum}` : gameId;

          state.ui.gamePokedex[stateKey] = {
            blue: new Set(versionData.marked || []),
            red: new Set(versionData.unmarked || []),
            sort: "found",
          };
        }
      }
    }

    return {
      owned: collection.owned?.length || 0,
      wishlist: collection.wishlist?.length || 0,
      date: collection.exportDate,
      method: "server-bootstrap",
    };
  } catch (err) {
    throw new Error(`Bootstrap load error: ${err.message}`);
  }
}

export async function loadSettingsFromFile() {
  try {
    const response = await fetch("/api/load-settings");
    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (data.ui) {
      state.ui = { ...state.ui, ...data.ui };
    }
  } catch (err) {
    console.error(`Settings load error: ${err.message}`);
  }
}

export async function autoSaveToServer() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

  autoSaveTimeout = setTimeout(async () => {
    try {
      await saveDataToFile();
      console.log("Auto-saved to server");
    } catch (err) {
      console.error("Auto-save failed:", err.message);
    }
  }, 1000);
}

export async function autoSaveSettings() {
  if (autoSaveSettingsTimeout) clearTimeout(autoSaveSettingsTimeout);

  autoSaveSettingsTimeout = setTimeout(async () => {
    try {
      await saveSettingsToFile();
      await saveGamePokedexToFile();
      console.log("Settings auto-saved");
    } catch (err) {
      console.error("Settings auto-save failed:", err.message);
    }
  }, 1000);
}
