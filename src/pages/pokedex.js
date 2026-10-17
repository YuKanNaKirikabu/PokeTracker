import { t } from "../core/i18n.js";
import { state } from "../core/state.js";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";
import { attachCardEvents } from "../features/cards.js";
import {
    formatDexNumber,
    getPokedexIconPath,
    getPokedexList,
    getPokedexRegion,
    getPokemonDisplayName,
    getPokemonTypes,
    renderPokemonTypeIcons,
    getGamePokedexData,
    loadGameDexCatalog,
    getGamePokedexConfig,
    ensureGamePokedexLoaded,
    getPokedexDescription,
    getPokemonCardMatches,
    renderPokedexDetail,
} from "../features/pokedex.js";

export function renderPokedex() {
  const app = document.getElementById("app");
  document.body.classList.add("route-pokedex");
  setBrandSubtitle(t("pokedex.title"));
  setPageTitle("");
  setPokedexSearchVisible(false);
  const list = getPokedexList();
  if (!list.length) {
    app.innerHTML = `<section class="placeholder"><h1 class="section-title">${t("pokedex.title")}</h1><p>${t("pokedex.empty")}</p></section>`;
    return;
  }
  const selectedNumber = state.ui.pokedexSelected || 1;
  const selected = list.find((entry) => entry.number === selectedNumber) || list[0];
  state.ui.pokedexSelected = selected.number;
  const listHtml = list.map((entry) => {
    const displayName = getPokemonDisplayName(entry);
    const types = getPokemonTypes(entry.nameEn);
    const iconPath = getPokedexIconPath(entry);
    const iconHtml = iconPath
      ? `<img src="${iconPath}" alt="" onerror="window.__pokedexHandleImgError(this)" loading="lazy" decoding="async" />`
      : `<span>${displayName.slice(0, 1)}</span>`;
    return `<button class="pokedex-item ${entry.number === selected.number ? "active" : ""}" data-dex="${entry.number}" type="button">
      <span class="pokedex-icon">${iconHtml}</span>
      <span class="pokedex-info"><span class="pokedex-title"><span class="pokedex-number">#${formatDexNumber(entry.number)}</span><span class="pokedex-name">${displayName}</span></span>
      <span class="pokedex-list-types">${renderPokemonTypeIcons(types, "icon-xs")}</span></span>
      <span class="pokedex-item-chevron" aria-hidden="true">›</span>
    </button>`;
  }).join("");
  const regionNames = ["Канто","Джото","Хоэнн","Синно","Юнова","Калос","Алола","Галар","Палдея"];
  app.innerHTML = `<section class="pokedex-page">
    <div class="pokedex-toolbar"><div><span class="eyebrow">NATIONAL DATABASE</span><h1 class="section-title">Pokédex <span class="dex-count">1,025</span></h1></div>
      <label class="pokedex-inline-search"><span aria-hidden="true">⌕</span><input id="pokedexListSearch" type="search" placeholder="Поиск по имени или номеру" autocomplete="off" aria-label="Поиск покемонов"></label>
    </div>
    <div class="pokedex-workspace">
      <aside class="pokedex-sidebar"><div class="pokedex-sidebar-head"><span>ПОКЕМОНЫ</span><span>1025</span></div><div class="pokedex-list" role="listbox" aria-label="Список покемонов">${listHtml}</div></aside>
      <section class="pokedex-center" aria-label="Карточка покемона"><div id="pokedexDetailMount" class="pokedex-detail"><p class="pokedex-empty">${t("common.loading")}</p></div></section>
      <aside class="pokedex-world">
        <section class="pokedex-world-panel"><div class="pokedex-panel-heading"><span class="panel-symbol">◎</span><div><h2>Регионы</h2><p>Порядок по поколениям</p></div></div><div class="pokedex-region-grid" id="pokedexRegions">${regionNames.map((name,i)=>`<div class="pokedex-region-chip" data-region="${name}" data-order="${i}"><span class="region-index">${String(i+1).padStart(2,"0")}</span><span>${name}</span></div>`).join("")}</div></section>
        <section class="pokedex-world-panel"><div class="pokedex-panel-heading"><span class="panel-symbol">◉</span><div><h2>Доступно в играх</h2><p id="pokedexGamesCount">Проверка доступности…</p></div></div><div class="pokedex-games-grid" id="pokedexGames"><div class="pokedex-loading">Загружаем каталог игр…</div></div></section>
      </aside>
    </div>
  </section>`;
  const listEl = app.querySelector(".pokedex-list");
  if (listEl && Number.isFinite(state.ui.pokedexListScroll)) requestAnimationFrame(() => { listEl.scrollTop = state.ui.pokedexListScroll; });
  const search = document.getElementById("pokedexListSearch");
  search.value = state.ui.pokedexSearch || "";
  search.addEventListener("input", () => {
    state.ui.pokedexSearch = search.value;
    const raw = search.value.trim().toLowerCase();
    let first = null;
    listEl.querySelectorAll(".pokedex-item").forEach(item => {
      const entry = list.find(x => x.number === Number(item.dataset.dex));
      const match = !raw || (entry && (getPokemonDisplayName(entry).toLowerCase().includes(raw) || entry.nameEn.toLowerCase().includes(raw) || String(entry.number).includes(raw)));
      item.hidden = !match;
      if (match && !first) first = item;
    });
    if (raw && first) {
      listEl.querySelectorAll(".pokedex-item.match").forEach(item => item.classList.remove("match"));
      first.classList.add("match");
      const top = first.offsetTop - listEl.offsetTop;
      listEl.scrollTo({top:Math.max(0,top-listEl.clientHeight/2),behavior:"smooth"});
    }
  });
  if (search.value) search.dispatchEvent(new Event("input"));
  setTimeout(() => {
    const mount = document.getElementById("pokedexDetailMount");
    if (!mount) return;
    mount.innerHTML = renderPokedexDetail(selected);
    attachPokedexEvents(selected.number);
    attachDetailTabs(selected);
    renderPokedexWorld(selected, regionNames);
  }, 0);
}
function attachDetailTabs(entry) {
  const root = document.querySelector(".pokedex-center");
  const tabs = root?.querySelectorAll("[data-dex-tab]");
  if (!tabs?.length) return;
  let loaded = false;
  tabs.forEach(tab => tab.addEventListener("click", async () => {
    tabs.forEach(button => { const active = button === tab; button.classList.toggle("active",active); button.setAttribute("aria-selected",String(active)); });
    root.querySelectorAll("[data-dex-panel]").forEach(panel => { panel.hidden = panel.dataset.dexPanel !== tab.dataset.dexTab; });
    if (!loaded && tab.dataset.dexTab !== "cards") {
      loaded = true;
      await loadSupplementalPokemonData(entry, root);
    }
  }));
}
async function loadSupplementalPokemonData(entry, root) {
  const statsPanel = root.querySelector('[data-dex-panel="stats"]');
  const movesPanel = root.querySelector('[data-dex-panel="moves"]');
  const evolutionPanel = root.querySelector('[data-dex-panel="evolution"]');
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${entry.number}`);
    if (!response.ok) throw new Error("PokéAPI request failed");
    const pokemon = await response.json();
    if (!root.isConnected) return;
    const statNames = {hp:"HP",attack:"Атака",defense:"Защита","special-attack":"Спец. атака","special-defense":"Спец. защита",speed:"Скорость"};
    const stats = (pokemon.stats || []).map(stat => {
      const name = statNames[stat.stat.name] || stat.stat.name;
      const value = Number(stat.base_stat) || 0;
      return `<div class="pokedex-stat-row"><span>${name}</span><div class="pokedex-stat-track"><i style="width:${Math.min(100,value/255*100)}%"></i></div><strong>${value}</strong></div>`;
    }).join("");
    if (statsPanel) statsPanel.innerHTML = `<h3 class="pokedex-tab-heading">Базовые характеристики</h3><div class="pokedex-data-grid"><div class="pokedex-data-cell"><span>Рост</span><strong>${(pokemon.height/10).toLocaleString("ru-RU")} м</strong></div><div class="pokedex-data-cell"><span>Вес</span><strong>${(pokemon.weight/10).toLocaleString("ru-RU")} кг</strong></div><div class="pokedex-data-cell"><span>Базовый опыт</span><strong>${pokemon.base_experience ?? "—"}</strong></div><div class="pokedex-data-cell"><span>Способности</span><strong>${(pokemon.abilities||[]).map(a=>a.ability.name.replace(/-/g," ")).join(", ") || "—"}</strong></div></div><div class="pokedex-stats-list">${stats}</div>`;
    const moveNames = (pokemon.moves || []).map(item => item.move.name.replace(/-/g," ")).sort((a,b)=>a.localeCompare(b));
    if (movesPanel) movesPanel.innerHTML = `<h3 class="pokedex-tab-heading">Известные приёмы <span class="pokedex-tab-count">${moveNames.length}</span></h3><div class="pokedex-move-list">${moveNames.map(name=>`<span class="pokedex-move-chip">${name}</span>`).join("")}</div>`;
    if (evolutionPanel) await loadEvolutionChain(entry, evolutionPanel);
  } catch {
    [statsPanel,movesPanel,evolutionPanel].filter(Boolean).forEach(panel => {
      if (panel.querySelector(".pokedex-data-note")) panel.querySelector(".pokedex-data-note").textContent = "Не удалось загрузить дополнительные данные. Проверь подключение к интернету и повтори попытку.";
    });
  }
}
async function loadEvolutionChain(entry, panel) {
  const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${entry.number}`);
  if (!speciesResponse.ok) throw new Error("Species request failed");
  const species = await speciesResponse.json();
  const chainResponse = await fetch(species.evolution_chain.url);
  if (!chainResponse.ok) throw new Error("Evolution request failed");
  const chainData = await chainResponse.json();
  const chain = [];
  const walk = node => {
    if (!node) return;
    chain.push({name:node.species.name,id:Number((node.species.url.match(/pokemon-species\/(\d+)\//)||[])[1])||0});
    (node.evolves_to||[]).forEach(walk);
  };
  walk(chainData.chain);
  const known = chain.filter(item=>item.id>0);
  const index = known.findIndex(item=>item.id===entry.number);
  const relevant = index<0 ? known : known;
  panel.innerHTML = `<h3 class="pokedex-tab-heading">Эволюционная цепочка</h3><div class="pokedex-evolution-chain">${relevant.map((item,i)=>`<div class="pokedex-evolution-node ${item.id===entry.number?"current":""}"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.id}.png" alt="" loading="lazy"><span>#${String(item.id).padStart(4,"0")}</span><strong>${item.name.replace(/-/g," ")}</strong></div>${i<relevant.length-1?'<span class="pokedex-evolution-arrow" aria-hidden="true">→</span>':""}`).join("")}</div><p class="pokedex-data-note">Цепочка показывает предыдущие и последующие формы, включая текущую.</p>`;
}

async function renderPokedexWorld(entry, regionNames) {
  const regions = document.getElementById("pokedexRegions");
  const gamesRoot = document.getElementById("pokedexGames");
  if (!regions || !gamesRoot) return;
  try {
    await loadGameDexCatalog();
    const catalog = (await import("../config/pokedex.js")).GAME_POKEDEXES;
    const normalizedName = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const nameKey = normalizedName(entry.nameEn);
    const games = (await Promise.all(catalog.map(async (game,index) => {
      await ensureGamePokedexLoaded(game.id);
      const data = getGamePokedexData(game.id);
      const available = data.byName.has(nameKey) || data.list.some(p => normalizedName(p.nameEn || p.name || p) === nameKey);
      return {...game,index,available};
    }))).sort((a,b) => Number(b.available)-Number(a.available) || a.index-b.index);
    const regionOrder = [{ru:"Канто",en:"kanto"},{ru:"Джото",en:"johto"},{ru:"Хоэнн",en:"hoenn"},{ru:"Синно",en:"sinnoh"},{ru:"Юнова",en:"unova"},{ru:"Калос",en:"kalos"},{ru:"Алола",en:"alola"},{ru:"Галар",en:"galar"},{ru:"Палдея",en:"paldea"}];
    const availableRegions = new Set();
    for (const game of games) {
      for (const dex of (game.dexes || [])) {
        const exists = (dex.entries || []).some(p => normalizedName(p.nameEn || p.name || p) === nameKey);
        if (!exists) continue;
        const title = String(dex.title || "").toLowerCase();
        const found = regionOrder.find(region => title.includes(region.ru.toLowerCase()) || title.includes(region.en));
        if (found) availableRegions.add(found.ru);
      }
    }
    regions.querySelectorAll(".pokedex-region-chip").forEach(chip => {
      const available = availableRegions.has(chip.dataset.region);
      chip.classList.toggle("available",available);
      chip.classList.toggle("unavailable",!available);
      chip.style.order = (available ? 0 : 1) * 100 + Number(chip.dataset.order || 0);
    });
    if (!document.getElementById("pokedexGames")) return;
    gamesRoot.innerHTML = games.map(game => `<div class="pokedex-game-chip ${game.available?"available":"unavailable"}" title="${game.title}"><span class="game-chip-icons">${(game.icons||[]).slice(0,2).map(icon=>`<img src="${icon.src}" alt="" loading="lazy">`).join("")}</span><span class="game-chip-name">${game.title}</span></div>`).join("");
    const count = document.getElementById("pokedexGamesCount");
    if (count) count.textContent = `${games.filter(game=>game.available).length} из ${games.length} игр`;
  } catch {
    gamesRoot.innerHTML = `<p class="pokedex-loading">Каталог игр временно недоступен.</p>`;
  }
}

function attachPokedexSearch(list) {
  const input = document.getElementById("pokedexSearchInput");
  if (!input) return;
  input.placeholder = t("header.searchPlaceholder");
  input.value = state.ui.pokedexSearch || "";
  if (input._pokedexHandler) {
    input.removeEventListener("input", input._pokedexHandler);
  }
  if (input._gamePokedexHandler) {
    input.removeEventListener("input", input._gamePokedexHandler);
    input._gamePokedexHandler = null;
  }
  if (input._packHandler) {
    input.removeEventListener("input", input._packHandler);
    input._packHandler = null;
  }
  const handler = () => {
    state.ui.pokedexSearch = input.value;
    const listEl = document.querySelector(".pokedex-list");
    if (!listEl) return;
    const raw = input.value.trim().toLowerCase();
    listEl.querySelectorAll(".pokedex-item.match").forEach((item) => {
      item.classList.remove("match");
    });
    if (!raw) return;
    const isNumber = /^\d+$/.test(raw);
    const match = list.find((entry) => {
      if (isNumber) {
        return entry.numberStr.startsWith(raw.padStart(Math.min(4, raw.length), "0"));
      }
      return (
        getPokemonDisplayName(entry).toLowerCase().includes(raw)
        || entry.nameEn.toLowerCase().includes(raw)
      );
    });
    if (!match) return;
    const target = listEl.querySelector(`.pokedex-item[data-dex="${match.number}"]`);
    if (target) {
      target.classList.add("match");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  input.addEventListener("input", handler);
  input._pokedexHandler = handler;
}

function attachPokedexEvents(selectedNumber) {
  const saveScrollState = () => {
    const listEl = document.querySelector(".pokedex-list");
    const stripEl = document.getElementById("pokedexCardStrip");
    if (listEl) {
      state.ui.pokedexListScroll = listEl.scrollTop;
    }
    if (stripEl) {
      state.ui.pokedexCardScroll = stripEl.scrollLeft;
    }
  };
  document.querySelectorAll(".pokedex-item").forEach((item) => {
    item.addEventListener("click", () => {
      const dex = Number(item.dataset.dex);
      if (!dex) return;
      saveScrollState();
      state.ui.pokedexSelected = dex;
      state.ui.pokedexGender = "common";
      location.hash = `#/pokedex?no=${formatDexNumber(dex)}`;
    });
  });
  document.querySelectorAll(".gender-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.ui.pokedexGender = btn.dataset.gender;
      renderPokedex();
    });
  });
  const strip = document.getElementById("pokedexCardStrip");
  const prev = document.getElementById("pokedexScrollPrev");
  const next = document.getElementById("pokedexScrollNext");
  if (strip) {
    strip.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      strip.scrollLeft += event.deltaY;
    }, { passive: false });
  }
  if (strip && prev && next) {
    prev.addEventListener("click", () => {
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      const atStart = strip.scrollLeft <= 4;
      if (atStart) {
        strip.scrollTo({ left: maxScroll, behavior: "smooth" });
        return;
      }
      strip.scrollBy({ left: -420, behavior: "smooth" });
    });
    next.addEventListener("click", () => {
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      const atEnd = strip.scrollLeft >= maxScroll - 4;
      if (atEnd) {
        strip.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      strip.scrollBy({ left: 420, behavior: "smooth" });
    });
  }
  const renderWithScroll = () => {
    saveScrollState();
    renderPokedex();
  };
  attachCardEvents(renderWithScroll);
  document.querySelectorAll(".pokedex-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".wishlist-heart") || event.target.closest(".pokeball")) return;
      const pack = card.dataset.pack;
      if (!pack) return;
      location.hash = `#/pack/${encodeURIComponent(pack)}`;
    });
  });
}
