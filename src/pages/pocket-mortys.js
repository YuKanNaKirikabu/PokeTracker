import { state } from "../core/state.js";
import { setBrandSubtitle, setPageTitle, setPokedexSearchVisible } from "../core/ui.js";

const ROOT = "https://storage.yandexcloud.net/poketracker/Images/PocketMortys";
let catalogPromise;
const pad = (n) => String(Number(n) || 0).padStart(3, "0");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function loadCatalog() {
  if (!catalogPromise) catalogPromise = fetch("/api/pocket-mortys").then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(data => {
    if (!Array.isArray(data)) throw new Error("PocketMortys.json должен быть массивом записей.");
    return data.sort((a,b) => Number(a.number)-Number(b.number));
  }).catch(e => { catalogPromise = null; throw e; });
  return catalogPromise;
}
function rarityUrl(e) { return ["Common","Epic","Exotic","Rare"].includes(e.rarity) ? ROOT+"/Rarity/"+e.rarity+".webp" : (e.rarityImage || ""); }
function typeUrl(e) { return ["Paper","Rock","Scissors"].includes(e.type) ? ROOT+"/Types/"+e.type+".webp" : (e.typeImage || ""); }
function mortyUrl(e) { return e.image || ROOT+"/Mortys/"+encodeURIComponent(e.name)+".webp"; }

export async function renderPocketMortys() {
  if (!document.getElementById("pocketMortysFinalFixes")) { const style = document.createElement("style"); style.id = "pocketMortysFinalFixes"; style.textContent = ".pocket-mortys-list-head,.pocket-mortys-row{grid-template-columns:48px minmax(0,1fr) 42px 36px 26px!important;column-gap:4px!important;padding-left:8px!important;padding-right:8px!important} pocket-mortys-name{min-width:0} pocket-mortys-detail{display:block!important;overflow-y:auto} pocket-mortys-detail-top{grid-template-columns:minmax(0,1fr)!important;gap:10px!important} pocket-mortys-art{height:clamp(320px,55vh,540px)!important;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden} pocket-mortys-art img{display:block;width:100%;height:100%;object-fit:contain!important;object-position:center;padding:0!important} pocket-mortys-title-line{gap:6px!important;margin-bottom:8px!important} pocket-mortys-detail-footnote{display:flex;flex-direction:column;gap:5px;margin-top:12px;padding:10px 12px;border:1px solid var(--header-border);border-radius:9px;background:var(--panel-light);font-size:11px;line-height:1.45;color:var(--text)} pocket-mortys-detail-footnote strong{font-size:11px}\\n@media(min-width:901px){.pocket-mortys-detail-top{grid-template-columns:minmax(0,1fr)!important}.pocket-mortys-art{height:clamp(340px,53vh,500px)!important}.pocket-mortys-info{width:100%}.pocket-mortys-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}}"; document.head.appendChild(style); }
  const app = document.getElementById("app");
  setBrandSubtitle("Pocket Mortys"); setPageTitle("Pocket Mortys"); setPokedexSearchVisible(false);
  app.innerHTML = `<section class="pocket-mortys-page">
    <div class="pocket-mortys-workspace">
      <div class="pocket-mortys-list-panel">
        <div class="pocket-mortys-search"><input id="pocketMortysSearch" type="search" placeholder="Поиск по имени или номеру…" aria-label="Поиск по Pocket Mortys" autocomplete="off"></div>
        <div class="pocket-mortys-list-head"><span>Индекс</span><span>Имя</span><span>Редкость</span><span>Тип</span><span>Есть</span></div>
        <div class="pocket-mortys-list" id="pocketMortysList"><div class="pocket-mortys-message">Загрузка списка…</div></div>
      </div>
      <aside class="pocket-mortys-detail" id="pocketMortysDetail"><div class="pocket-mortys-message">Выберите Морти из списка.</div></aside>
    </div>
    <footer class="pocket-mortys-footnote"><img src="${ROOT}/Logo/Logo.webp" alt=""><span><strong>О Pocket Mortys.</strong> Мобильная ролевая игра по мультсериалу «Рик и Морти», построенная вокруг коллекционирования и сражений существ. Вышла 13 января 2016 года.</span></footer>
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
  } catch (e) { list.innerHTML = '<div class="pocket-mortys-message">Не удалось загрузить данные: '+esc(e.message || e)+'</div>'; return; }

  async function setOwned(key, value) {
    if (!state.user) { location.hash = "#/register?mode=login"; return false; }
    const next = new Set(owned); value ? next.add(key) : next.delete(key);
    const r = await fetch("/api/pocket-mortys-collection", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({owned:[...next]})});
    if (!r.ok) throw new Error("HTTP "+r.status);
    owned = next; return true;
  }
  function statusMarkup(has) {
    return `<span class="pocket-mortys-status ${has?"is-owned":"is-missing"}">${has?"Пойман":"Отсутствует"}</span>`;
  }
  function renderDetail(e) {
    if (!e) return;
    const key=pad(e.number), has=owned.has(key);
    const fields=[["Тип",e.type],["Редкость",e.rarity],["Base XP",e.baseXP],["Base HP",e.baseHP],["Base ATK",e.baseATK],["Base DEF",e.baseDEF],["Base SPD",e.baseSPD],["Stat Total",e.statTotal],["# to Evolve",e.toEvolve],["Badges Required",e.badgesRequired],["Where Found",Array.isArray(e.whereFound)?e.whereFound.join(", "):e.whereFound],["Club Rick Dimension Pools",Array.isArray(e.clubRickDimensionPools)?e.clubRickDimensionPools.join(", "):e.clubRickDimensionPools]].filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=="");
    detail.innerHTML=`<div class="pocket-mortys-detail-top">
      <div class="pocket-mortys-art"><img src="${esc(mortyUrl(e))}" alt="${esc(e.name)}" loading="eager" decoding="async"></div>
      <div class="pocket-mortys-info"><div class="pocket-mortys-title-line"><span class="pocket-mortys-detail-number">#${key}</span><h2>${esc(e.name)}</h2>${statusMarkup(has)}</div>
        <div class="pocket-mortys-stats">${fields.map(([k,v])=>`<div class="pocket-mortys-stat"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>
      </div></div>`;
    detail.insertAdjacentHTML("beforeend", `<footer class="pocket-mortys-detail-footnote"><strong>Об этом Морти</strong><span>${esc(e.description || e.info || e.lore || (e.name + " — персонаж Pocket Mortys. Характеристики и место получения указаны выше."))}</span></footer>`);
  }
  function renderRows(query="") {
    const q=query.trim().toLocaleLowerCase().replace(/^#/,"");
    const filtered=entries.filter(e=>!q||String(e.name||"").toLocaleLowerCase().includes(q)||pad(e.number).includes(q)||String(e.number)===q);
    list.innerHTML=filtered.length?filtered.map(e=>{
      const key=pad(e.number),has=owned.has(key),rarity=rarityUrl(e),type=typeUrl(e);
      return `<div class="pocket-mortys-row ${selected===Number(e.number)?"is-selected":""}" data-number="${Number(e.number)}" tabindex="0" role="button">
        <span class="pocket-mortys-index">#${key}</span><span class="pocket-mortys-name" title="${esc(e.name)}">${esc(e.name)}</span>
        <span class="pocket-mortys-icon-slot">${rarity?`<img src="${esc(rarity)}" alt="${esc(e.rarity||"Редкость")}" loading="lazy">`:""}</span>
        <span class="pocket-mortys-icon-slot">${type?`<img src="${esc(type)}" alt="${esc(e.type||"Тип")}" loading="lazy">`:""}</span>
        <button type="button" class="pocket-mortys-row-check ${has?"is-owned":""}" data-toggle="${key}" aria-label="${has?"Убрать из пойманных":"Отметить пойманным"}" aria-pressed="${has}">${has?"✓":""}</button></div>`;
    }).join(""):'<div class="pocket-mortys-message">Ничего не найдено.</div>';
    list.querySelectorAll("[data-number]").forEach(row=>{const choose=()=>{selected=Number(row.dataset.number);const e=entries.find(x=>Number(x.number)===selected);renderRows(search.value);renderDetail(e);};row.onclick=ev=>{if(!ev.target.closest("[data-toggle]"))choose();};row.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();choose();}};});
    list.querySelectorAll("[data-toggle]").forEach(btn=>btn.onclick=async()=>{try{const key=btn.dataset.toggle;await setOwned(key,!owned.has(key));renderRows(search.value);if(selected!==null)renderDetail(entries.find(e=>Number(e.number)===selected));}catch(e){console.error("Pocket Mortys save failed",e);}});
  }
  search.addEventListener("input",()=>renderRows(search.value));
  renderRows();
  if(entries.length){selected=Number(entries[0].number);renderRows();renderDetail(entries[0]);}
}
