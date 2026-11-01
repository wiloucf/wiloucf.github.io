// WiLO site. Content lives in the data/ folder and is edited through Pages CMS.
// This script only reads those files; nothing here needs changing for routine updates.

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const load = name => fetch(`data/${name}.json`, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const CHIP = {Social:"social", Professional:"pro", Outreach:"out", Summit:"pro"};
const placeholder = label => `<div class="ph"><span>${esc(label)}</span></div>`;
const img = (src, alt) => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;

function parseDay(d){ // "2026-11-13" -> local Date at midnight
  const [y,m,dd] = String(d || "").split("-").map(Number);
  return y ? new Date(y, (m||1)-1, dd||1) : null;
}

function renderEvents(list){
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = (list || [])
    .map(e => ({...e, _d: parseDay(e.date)}))
    .filter(e => e._d && e._d >= today)
    .sort((a,b) => a._d - b._d)
    .slice(0, 6);
  $("#home-events").innerHTML = upcoming.length ? upcoming.map(e => `
    <article class="event">
      <div class="date"><span class="m">${MONTHS[e._d.getMonth()]}</span><span class="d">${String(e._d.getDate()).padStart(2,"0")}</span></div>
      <div style="min-width:0"><h3>${esc(e.title)}</h3>
        <div class="meta">${esc(e._d.toLocaleDateString("en-US",{weekday:"short"}))} · ${esc(e.time)} · ${esc(e.location)}</div>
        ${e.description ? `<p class="desc">${esc(e.description)}</p>` : ""}</div>
      <span class="chip ${CHIP[e.category] || ""}">${esc(e.category || "Event")}</span>
    </article>`).join("")
    : `<p class="empty">No upcoming events are posted yet. Check back soon.</p>`;
}

let GALLERY = [];
function renderGallery(cat){
  const items = GALLERY.filter(g => cat === "All" || g.category === cat);
  $("#gallery-grid").innerHTML = items.length ? items.map(g => `
    <figure>${g.image ? img(g.image, g.caption) : `<div class="ph" style="height:240px"><span>Photo coming soon</span></div>`}
      <figcaption><span>${esc(g.caption)}</span><small>${esc(g.semester)}</small></figcaption></figure>`).join("")
    : `<p class="empty">No photos in this category yet.</p>`;
}
function setupGallery(list){
  GALLERY = list || [];
  const cats = ["All", ...new Set(GALLERY.map(g => g.category).filter(Boolean))];
  $("#filters").innerHTML = cats.map((c,i) => `<button type="button" id="f-${esc(c)}" data-cat="${esc(c)}" aria-pressed="${i===0}">${esc(c)}</button>`).join("");
  $("#filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#filters button").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderGallery(b.dataset.cat);
  };
  renderGallery("All");
  // Home page strip: photos marked "Show on home page", up to 5
  let feat = GALLERY.filter(g => g.featured);
  if (feat.length < 5) feat = feat.concat(GALLERY.filter(g => !g.featured)).slice(0, 5);
  $("#strip").innerHTML = feat.slice(0,5).map(g => g.image ? `<div>${img(g.image, g.caption)}</div>` : placeholder(g.caption)).join("");
}

function renderBoard(list){
  $("#board").innerHTML = (list || []).map(m => `
    <div class="member"><div class="avatar">${m.photo ? img(m.photo, m.name) : placeholder("Headshot")}</div>
      <div><div class="role">${esc(m.role)}</div><div class="name">${esc(m.name)}</div></div>
      ${m.bio ? `<p class="bio">${esc(m.bio)}</p>` : ""}</div>`).join("");
}

function renderSchedule(list){
  $("#schedule").innerHTML = (list || []).map(r =>
    `<tr class="${r.kind === "Talk" ? "talk" : r.kind === "Break" ? "brk" : ""}"><td>${esc(r.time)}</td><td>${esc(r.session)}</td></tr>`).join("");
}

let SUMMIT = null, timer = null;
function tick(){
  if (!SUMMIT) return;
  const ms = SUMMIT - new Date();
  if (ms <= 0){ $("#countdown").innerHTML = ""; return; }
  const d = Math.floor(ms/864e5), h = Math.floor(ms/36e5)%24, m = Math.floor(ms/6e4)%60;
  $("#countdown").innerHTML = [[d,"days"],[h,"hours"],[m,"minutes"]].map(([v,l]) => `<div><b>${String(v).padStart(2,"0")}</b><span>${l}</span></div>`).join("")
    + `<div><b style="color:var(--muted)">·</b><span>to the summit</span></div>`;
}
// Pages an officer has switched off in Site settings
const HIDDEN = new Set();
function applyPageSwitches(st){
  HIDDEN.clear();
  for (const p of ["gallery","about","summit","outreach"]) if (st["show_" + p] === false) HIDDEN.add(p);
  // Hide every link to a switched-off page (nav, buttons); "#register" belongs to the summit page
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    let t = a.getAttribute("href").slice(1);
    if (t === "register") t = "summit";
    a.hidden = HIDDEN.has(t);
  });
  route();
}

function applySettings(st){
  st = st || {};
  applyPageSwitches(st);
  if (st.contact_email) document.querySelectorAll(".js-email").forEach(el => el.textContent = st.contact_email);
  const soc = [["Instagram", st.instagram_url], ["LinkedIn", st.linkedin_url]].filter(([,u]) => u);
  $("#socials").innerHTML = soc.map(([n,u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join(" · ");
  if (st.hero_image) $("#hero-photo").innerHTML = img(st.hero_image, "WiLO members");
  if (st.summit_date){
    const [dp, tp="00:00"] = st.summit_date.split("T");
    const day = parseDay(dp); const [hh,mm] = tp.split(":").map(Number);
    if (day){
      SUMMIT = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh||0, mm||0);
      $("#s-date").textContent = day.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
      $("#s-prog").textContent = `${day.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · ${st.summit_location || ""}`;
    }
  }
  if (st.summit_hours) $("#s-hours").textContent = st.summit_hours;
  if (st.summit_location) $("#s-loc").textContent = st.summit_location;
  if (st.registration_link){
    $("#reg-link").href = st.registration_link;
    $("#reg-external").hidden = false;
    $("#reg-form").hidden = true;
  }
  tick(); clearInterval(timer); timer = setInterval(tick, 30000);
}

// Built-in form is a fallback shown only when no registration link is set.
$("#reg-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, msg = $("#reg-msg");
  const bad = [...f.querySelectorAll("[required]")].find(el => !el.value.trim() || (el.type==="email" && !/^\S+@\S+\.\S+$/.test(el.value)));
  msg.hidden = false;
  if (bad){ msg.className = "note"; msg.textContent = `Please fill in “${bad.closest("label").childNodes[0].textContent.trim()}”.`; bad.focus(); return; }
  msg.className = "ok";
  msg.textContent = "Online registration isn't connected yet. Please email us to register.";
});

$("#copy-email").addEventListener("click", async e => {
  const t = $("#email-addr").textContent;
  try { await navigator.clipboard.writeText(t); e.target.textContent = "Copied"; }
  catch { const r = document.createRange(); r.selectNodeContents($("#email-addr")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  setTimeout(() => e.target.textContent = "Copy", 1600);
});

// Hash routing between pages
const PAGES = ["home","gallery","about","summit","outreach"];
function show(p, top){
  PAGES.forEach(x => document.getElementById("p-"+x).classList.toggle("active", x === p));
  document.querySelectorAll("nav.links a").forEach(a => {
    if (a.getAttribute("href") === "#"+p) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
  if (top) window.scrollTo(0,0);
}
function route(){
  const h = location.hash.slice(1);
  if (h === "register" && !HIDDEN.has("summit")){ show("summit"); requestAnimationFrame(() => document.getElementById("register").scrollIntoView()); return; }
  show(PAGES.includes(h) && !HIDDEN.has(h) ? h : "home", true);
}
addEventListener("hashchange", route);
route();

Promise.all(["events","gallery","board","schedule","settings"].map(load)).then(([ev, ga, bo, sc, st]) => {
  renderEvents(ev); setupGallery(ga); renderBoard(bo); renderSchedule(sc); applySettings(st);
});
