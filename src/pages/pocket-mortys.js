import { state } from "../core/state.js";
import { t } from "../core/i18n.js?v=20261019-5";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";

const ROOT = "https://storage.yandexcloud.net/poketracker/Images/PocketMortys";
let catalogPromise;
const pad = (n) => String(Number(n) || 0).padStart(3, "0");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function loadCatalog() {
  if (!catalogPromise) catalogPromise = fetch("/api/pocket-mortys").then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(data => {
    if (!Array.isArray(data)) throw new Error("PocketMortys.json must contain an array of entries.");
    return data.sort((a,b) => Number(a.number)-Number(b.number));
  }).catch(e => { catalogPromise = null; throw e; });
  return catalogPromise;
}
function rarityUrl(e) { return ["Common","Epic","Exotic","Rare"].includes(e.rarity) ? ROOT+"/Rarity/"+e.rarity+".webp" : (e.rarityImage || ""); }
function typeUrl(e) { return ["Paper","Rock","Scissors"].includes(e.type) ? ROOT+"/Types/"+e.type+".webp" : (e.typeImage || ""); }
function mortyUrl(e) { return e.image || ROOT+"/Mortys/"+encodeURIComponent(e.name)+".webp"; }

export async function renderPocketMortys() {
  const app = document.getElementById("app");
  setBrandSubtitle(t("pocket.title")); setPageTitle(""); setPokedexSearchVisible(false);
  app.innerHTML = `<section class="pocket-mortys-page">
    <div class="pocket-mortys-workspace">
      <div class="pocket-mortys-list-panel">
        <div class="pocket-mortys-search"><input id="pocketMortysSearch" type="search" placeholder="${t("pocket.search")}" aria-label="${t("pocket.searchAria")}" autocomplete="off"></div>
        <div class="pocket-mortys-list" id="pocketMortysList"><div class="pocket-mortys-message">${t("pocket.loading")}</div></div>
      </div>
      <aside class="pocket-mortys-detail" id="pocketMortysDetail"><div class="pocket-mortys-message">${t("pocket.choose")}</div></aside>
    </div>
  </section>`;
  const list = document.getElementById("pocketMortysList"), detail = document.getElementById("pocketMortysDetail");
  const search = document.getElementById("pocketMortysSearch");
  let entries, owned = new Set(), selected = null;
  try {
    entries = await loadCatalog();
    if (state.user) {
      const r = await fetch("/api/pocket-mortys-collection");
      if (!r.ok) throw new Error("HTTP " + r.status);
      owned = new Set((await r.json()).owned || []);
    }
  } catch (e) { list.innerHTML = '<div class="pocket-mortys-message">'+esc(t("pocket.loadError"))+esc(e.message || e)+'</div>'; return; }

  async function setOwned(key, value) {
    if (!state.user) { location.hash = "#/register?mode=login"; return false; }
    const next = new Set(owned); value ? next.add(key) : next.delete(key);
    const r = await fetch("/api/pocket-mortys-collection", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({owned:[...next]})});
    if (!r.ok) throw new Error("HTTP "+r.status);
    owned = next; return true;
  }
  function statusMarkup(has) {
    return `<span class="pocket-mortys-status ${has?"is-owned":"is-missing"}">${has?t("pocket.caught"):t("pocket.missing")}</span>`;
  }
  function renderDetail(e) {
    if (!e) return;
    const key=pad(e.number), has=owned.has(key);
    const fields=[[t("pocket.type"),e.type],[t("pocket.rarity"),e.rarity],[t("pocket.baseXp"),e.baseXP],[t("pocket.baseHp"),e.baseHP],[t("pocket.baseAtk"),e.baseATK],[t("pocket.baseDef"),e.baseDEF],[t("pocket.baseSpd"),e.baseSPD],[t("pocket.statTotal"),e.statTotal],[t("pocket.toEvolve"),e.toEvolve],[t("pocket.badgesRequired"),e.badgesRequired],[t("pocket.whereFound"),Array.isArray(e.whereFound)?e.whereFound.join(", "):e.whereFound],[t("pocket.clubRickPools"),Array.isArray(e.clubRickDimensionPools)?e.clubRickDimensionPools.join(", "):e.clubRickDimensionPools]].filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=="");
    detail.innerHTML=`<div class="pocket-mortys-detail-top">
      <div class="pocket-mortys-art"><img src="${esc(mortyUrl(e))}" alt="${esc(e.name)}" loading="eager" decoding="async"></div>
      <div class="pocket-mortys-info"><div class="pocket-mortys-title-line"><span class="pocket-mortys-detail-number">#${key}</span><h2>${esc(e.name)}</h2>${statusMarkup(has)}</div>
        <div class="pocket-mortys-stats">${fields.map(([k,v])=>`<div class="pocket-mortys-stat"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>
      </div></div>
      <footer class="pocket-mortys-footnote"><img src="${ROOT}/Logo/Logo.webp" alt=""><span>${esc(t("pocket.description"))}</span></footer>`;
  }
  function renderRows(query="") {
    const q=query.trim().toLocaleLowerCase().replace(/^#/,"");
    const filtered=entries.filter(e=>!q||String(e.name||"").toLocaleLowerCase().includes(q)||pad(e.number).includes(q)||String(e.number)===q);
    list.innerHTML=filtered.length?filtered.map(e=>{
      const key=pad(e.number),has=owned.has(key),rarity=rarityUrl(e),type=typeUrl(e);
      return `<div class="pocket-mortys-row ${selected===Number(e.number)?"is-selected":""}" data-number="${Number(e.number)}" tabindex="0" role="button">
        <span class="pocket-mortys-index">#${key}</span><span class="pocket-mortys-name" title="${esc(e.name)}">${esc(e.name)}</span>
        <span class="pocket-mortys-icon-slot">${rarity?`<img src="${esc(rarity)}" alt="${esc(e.rarity||t("pocket.rarity"))}" loading="lazy">`:""}</span>
        <span class="pocket-mortys-icon-slot">${type?`<img src="${esc(type)}" alt="${esc(e.type||t("pocket.type"))}" loading="lazy">`:""}</span>
        <button type="button" class="pocket-mortys-row-check ${has?"is-owned":""}" data-toggle="${key}" aria-label="${has?t("pocket.ownedRemove"):t("pocket.ownedAdd")}" aria-pressed="${has}">${has?"✓":""}</button></div>`;
    }).join(""):`<div class="pocket-mortys-message">${esc(t("pocket.noResults"))}</div>`;
    list.querySelectorAll("[data-number]").forEach(row=>{const choose=()=>{selected=Number(row.dataset.number);const e=entries.find(x=>Number(x.number)===selected);renderRows(search.value);renderDetail(e);};row.onclick=ev=>{if(!ev.target.closest("[data-toggle]"))choose();};row.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();choose();}};});
    list.querySelectorAll("[data-toggle]").forEach(btn=>btn.onclick=async()=>{try{const key=btn.dataset.toggle;await setOwned(key,!owned.has(key));renderRows(search.value);if(selected!==null)renderDetail(entries.find(e=>Number(e.number)===selected));}catch(e){console.error("Pocket Mortys save failed",e);}});
  }
  search.addEventListener("input",()=>renderRows(search.value));
  renderRows();
  if(entries.length){selected=Number(entries[0].number);renderRows();renderDetail(entries[0]);}
}
