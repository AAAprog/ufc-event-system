// Inspired upgrades (fight-night-ui-patterns + mobile-ui-inspiration-21st skills),
// layered on app.js without changing its look:
// flip countdown + main event on home, booking button loading/success,
// ticket card with QR, countdown on my account, admin KPI icons + fill ring,
// and a floating glass bottom tab bar on phones.

const MAIN_EVENTS = {
  1: "Karim Haddad vs Marco Silva",
  2: "Ivan Petrov vs Dele Okafor",
  3: "Omar Nasser vs Jake Turner"
};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

Object.assign(ICON_PATHS, {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  home: '<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
});

function nextEvent() {
  return [...state.events]
    .filter((e) => infoFor(e).date && e.quota > e.registered)
    .sort((a, b) => infoFor(a).date.localeCompare(infoFor(b).date))[0];
}

/* ---------- Countdown (split-flap digits) ---------- */
function cdParts(iso) {
  const ms = Math.max(0, new Date(iso) - Date.now());
  return [["Days", Math.floor(ms / 864e5)], ["Hrs", Math.floor(ms / 36e5) % 24], ["Min", Math.floor(ms / 6e4) % 60], ["Sec", Math.floor(ms / 1e3) % 60]];
}
function countdown(iso, cls = "") {
  const p = cdParts(iso);
  return `<div class="cd ${cls}" data-cd="${iso}">
    ${p.map(([l, v]) => `<div aria-hidden="true"><b>${String(v).padStart(2, "0")}</b><span>${l}</span></div>`).join("")}
    <span class="sr-only" data-cd-text>${p[0][1]} days, ${p[1][1]} hours to go</span>
  </div>`;
}
setInterval(() => {
  document.querySelectorAll("[data-cd]").forEach((el) => {
    const p = cdParts(el.dataset.cd);
    el.querySelectorAll("b").forEach((b, i) => {
      const v = String(p[i][1]).padStart(2, "0");
      if (b.textContent === v) return;
      b.textContent = v;
      if (!reduceMotion) { b.classList.remove("flip"); void b.offsetWidth; b.classList.add("flip"); }
    });
  });
}, 1000);
setInterval(() => {
  document.querySelectorAll("[data-cd]").forEach((el) => {
    const p = cdParts(el.dataset.cd);
    el.querySelector("[data-cd-text]").textContent = `${p[0][1]} days, ${p[1][1]} hours to go`;
  });
}, 60000);

/* ---------- Home ---------- */
const renderHomeBase = renderHome;
renderHome = function renderHomePlus() {
  renderHomeBase();
  const copy = document.querySelector("#screen-home .hero-copy");
  copy.querySelector(".hero-next")?.remove();
  const ev = nextEvent();
  if (!ev) return;
  const info = infoFor(ev);
  copy.querySelector(".action-row").insertAdjacentHTML("beforebegin", `
    <div class="hero-next">
      <p class="hero-next-label"><span class="live-dot" aria-hidden="true"></span>Next up · ${ev.name}</p>
      ${MAIN_EVENTS[ev.id] ? `<p class="hero-next-fight">${MAIN_EVENTS[ev.id].replace(" vs ", ' <i>vs</i> ')}</p>` : ""}
      ${countdown(info.date)}
    </div>`);
};

/* ---------- Ticket card with QR ---------- */
function qr(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let cells = "";
  for (let y = 0; y < 21; y += 1) for (let x = 0; x < 21; x += 1) {
    const f = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (f) { const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else { h = (h * 1103515245 + 12345) >>> 0; on = (h >>> 16) % 2 === 0; }
    if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg class="qr" viewBox="-1 -1 23 23" role="img" aria-label="Ticket QR code">${cells}</svg>`;
}

function ticketCard(user, ev) {
  const info = infoFor(ev);
  const ref = `UFC-${String(user.id).padStart(2, "0")}${String(ev.id).padStart(2, "0")}${user.username.length}`;
  const when = info.date ? new Date(info.date).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "To be announced";
  return `
    <article class="ticket">
      <div class="ticket-main">
        <p class="ticket-ref">${icon("ticket")}${ref}</p>
        <h3>${ev.name}</h3>
        ${MAIN_EVENTS[ev.id] ? `<p class="ticket-fight">${MAIN_EVENTS[ev.id]}</p>` : ""}
        <dl>
          <div><dt>Date</dt><dd>${when}</dd></div>
          <div><dt>Venue</dt><dd>${info.venue}${info.city ? `, ${info.city}` : ""}</dd></div>
          <div><dt>Holder</dt><dd>${user.username}</dd></div>
        </dl>
      </div>
      <div class="ticket-stub">${qr(ref)}<span>Admit one</span></div>
    </article>`;
}

const renderBookingBase = renderBooking;
renderBooking = function renderBookingPlus() {
  renderBookingBase();
  const user = currentUser();
  const ev = eventById(user.registeredEvent);
  const box = document.getElementById("bookingConfirmation");
  box.querySelector(".ticket")?.remove();
  box.classList.toggle("has-ticket", Boolean(ev));
  if (ev) box.insertAdjacentHTML("beforeend", ticketCard(user, ev));
};

/* Booking button: loading → success before the real booking runs */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-book]");
  if (!btn || btn.dataset.go) return;
  const user = currentUser();
  if (user.registeredEvent === Number(btn.dataset.book)) return; // let app.js show its message
  e.preventDefault();
  e.stopImmediatePropagation();
  document.querySelectorAll("[data-book]").forEach((b) => { b.disabled = true; });
  btn.classList.add("is-loading");
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>Reserving…`;
  setTimeout(() => {
    btn.dataset.go = "1";
    btn.disabled = false;
    btn.click();
    document.getElementById("bookingConfirmation").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    const t = document.querySelector("#bookingConfirmation .ticket");
    if (t && !reduceMotion) t.classList.add("is-new");
  }, reduceMotion ? 0 : 750);
}, true);

/* ---------- My account ---------- */
const renderMemberBase = renderMember;
renderMember = function renderMemberPlus() {
  renderMemberBase();
  const card = document.getElementById("metricBooking").parentElement;
  card.querySelector(".cd")?.remove();
  const ev = eventById(currentUser().registeredEvent);
  if (ev && infoFor(ev).date) card.insertAdjacentHTML("beforeend", countdown(infoFor(ev).date, "cd-sm"));
};

/* ---------- Admin KPI icons + fill ring ---------- */
const KPI_ICONS = { adminUsers: "users", adminBooked: "ticket", adminEvents: "grid", adminSeats: "seat" };
const renderAdminBase = renderAdmin;
renderAdmin = function renderAdminPlus() {
  renderAdminBase();
  Object.entries(KPI_ICONS).forEach(([id, name]) => {
    const label = document.getElementById(id)?.previousElementSibling;
    if (label && !label.querySelector(".ic")) label.insertAdjacentHTML("afterbegin", icon(name));
  });
  const cap = state.events.reduce((s, e) => s + e.quota, 0);
  const sold = state.events.reduce((s, e) => s + e.registered, 0);
  const pct = cap ? Math.round((sold / cap) * 100) : 0;
  const list = document.getElementById("adminCapacity");
  list.parentElement.querySelector(".fill-ring")?.remove();
  list.insertAdjacentHTML("beforebegin", `
    <div class="fill-ring">
      <div class="ring" style="--p:${pct}" role="img" aria-label="${pct}% of all seats sold"><b>${pct}%</b></div>
      <div><strong>${sold} of ${cap} seats sold</strong><span>Across ${state.events.length} events</span></div>
    </div>`);
};

/* ---------- Phone: floating glass tab bar with sliding pill ---------- */
const TABS = [["home", "home", "Home"], ["booking", "ticket", "Events"], ["login", "user", "Account"]];
document.body.insertAdjacentHTML("beforeend", `
  <nav class="tabbar" aria-label="Main">
    <span class="tabbar-pill" aria-hidden="true"></span>
    ${TABS.map(([s, i, l]) => `<button class="nav-trigger" data-screen="${s}" type="button">${icon(i)}<span>${l}</span></button>`).join("")}
  </nav>`);

function moveTabPill() {
  const bar = document.querySelector(".tabbar");
  const screen = document.querySelector(".screen.is-active")?.id.replace("screen-", "");
  const tab = screen === "home" ? "home" : screen === "booking" ? "booking" : ["login", "register", "memberDashboard", "profile"].includes(screen) ? "login" : null;
  const active = tab && bar.querySelector(`[data-screen="${tab}"]`);
  const pill = bar.querySelector(".tabbar-pill");
  bar.querySelectorAll("button").forEach((b) => b.classList.toggle("is-current", b === active));
  if (!active) { pill.style.opacity = 0; return; }
  pill.style.opacity = 1;
  pill.style.width = `${active.offsetWidth}px`;
  pill.style.transform = `translateX(${active.offsetLeft - 6}px)`;
}

const navigateBase = navigate;
navigate = function navigatePlus(screen) {
  navigateBase(screen);
  requestAnimationFrame(moveTabPill);
};
window.addEventListener("resize", moveTabPill);

render();
requestAnimationFrame(moveTabPill);
