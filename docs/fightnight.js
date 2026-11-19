// Patterns from the fight-night-ui-patterns skill, layered on top of the existing screens:
// split-flap countdown, full fight card with Main card / Prelims tabs and symmetric bout rows,
// sticky event bar, Add to Wallet, ticket tilt, and a filter for the admin bookings table.

/* ---------- Fight card data (fictional fighters) ---------- */
const BOUTS = {
  1: [
    { card: "main", weight: "Lightweight title", red: ["Karim Haddad", "🇸🇦", "C"], blue: ["Marco Silva", "🇧🇷", "#1"] },
    { card: "main", weight: "Welterweight", red: ["Yousef Al-Amri", "🇦🇪", "#4"], blue: ["Liam Carter", "🇺🇸", "#6"] },
    { card: "main", weight: "Bantamweight", red: ["Rami Saleh", "🇯🇴", "#8"], blue: ["Kenji Mori", "🇯🇵", "#10"] },
    { card: "prelim", weight: "Featherweight", red: ["Tariq Bakr", "🇪🇬", ""], blue: ["Diego Ruiz", "🇲🇽", ""] },
    { card: "prelim", weight: "Flyweight", red: ["Sami Khoury", "🇱🇧", ""], blue: ["Arman Seitov", "🇰🇿", ""] }
  ],
  2: [
    { card: "main", weight: "Heavyweight", red: ["Ivan Petrov", "🇧🇬", "#3"], blue: ["Dele Okafor", "🇳🇬", "#5"] },
    { card: "main", weight: "Middleweight", red: ["Faisal Otaibi", "🇸🇦", "#7"], blue: ["Tom Becker", "🇩🇪", "#9"] },
    { card: "prelim", weight: "Lightweight", red: ["Hamza Idrissi", "🇲🇦", ""], blue: ["Luca Romano", "🇮🇹", ""] }
  ],
  3: [
    { card: "main", weight: "Lightweight", red: ["Omar Nasser", "🇦🇪", "#11"], blue: ["Jake Turner", "🇬🇧", "#12"] },
    { card: "prelim", weight: "Bantamweight", red: ["Ali Rahimi", "🇮🇶", ""], blue: ["Pedro Alves", "🇵🇹", ""] }
  ]
};
let cardTab = "main";

function boutRow(b) {
  const side = ([name, flag, rank], corner) => `
    <div class="bout-f bout-${corner}">
      <span class="bout-av" aria-hidden="true">${initials(name)}</span>
      <span class="bout-name">${rank ? `<small>${rank === "C" ? "Champion" : rank}</small>` : ""}<b>${name}</b><em>${flag}</em></span>
    </div>`;
  return `
    <li class="bout">
      <p class="bout-weight">${b.weight}</p>
      <div class="bout-row">
        ${side(b.red, "red")}
        <span class="bout-vs" aria-label="versus">VS</span>
        ${side(b.blue, "blue")}
      </div>
    </li>`;
}

function fightCardHtml(eventId) {
  const bouts = BOUTS[eventId];
  if (!bouts) return "";
  const shown = bouts.filter((b) => b.card === cardTab);
  const count = (c) => bouts.filter((b) => b.card === c).length;
  return `
    <section class="home-section fightcard" id="fightCard">
      <div class="home-section-head"><h2>Fight card</h2></div>
      <div class="fc-tabs" role="tablist" aria-label="Fight card">
        ${[["main", "Main card"], ["prelim", "Prelims"]].map(([id, label]) => `
          <button type="button" role="tab" id="fc-tab-${id}" aria-controls="fc-panel" aria-selected="${cardTab === id}" tabindex="${cardTab === id ? 0 : -1}" data-card-tab="${id}">
            ${label}<span>${count(id)}</span></button>`).join("")}
      </div>
      <ol class="bouts" id="fc-panel" role="tabpanel" aria-labelledby="fc-tab-${cardTab}">${shown.map(boutRow).join("")}</ol>
    </section>`;
}

/* ---------- Sticky event bar ---------- */
function stickyBarHtml(event) {
  const m = metaFor(event);
  return `
    <div class="ev-sticky" id="evSticky" aria-hidden="true">
      <div class="ev-sticky-in">
        <span class="ev-sticky-txt"><b>${event.name}</b><small>${fmtDate(m.date, { day: "numeric", month: "short" })} · ${m.venue}</small></span>
        <button class="btn" type="button" data-start-booking="${event.id}" tabindex="-1">${ic("ticket")}Get tickets</button>
      </div>
    </div>`;
}

let stickyObserver = null;
const renderHomeV2 = renderHome;
renderHome = function renderHomeV3() {
  renderHomeV2();
  const root = document.getElementById("screen-home");
  const btn = root.querySelector(".home-cta [data-start-booking]");
  if (!btn) return;
  const id = Number(btn.dataset.startBooking);
  root.querySelector(".home-hero").insertAdjacentHTML("afterend", fightCardHtml(id));
  document.getElementById("evSticky")?.remove();
  document.body.insertAdjacentHTML("beforeend", stickyBarHtml(eventById(id)));
  stickyObserver?.disconnect();
  stickyObserver = new IntersectionObserver(([entry]) => {
    const bar = document.getElementById("evSticky");
    const show = !entry.isIntersecting && document.getElementById("screen-home").classList.contains("is-active");
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", String(!show));
    bar.querySelector("button").tabIndex = show ? 0 : -1;
  });
  stickyObserver.observe(btn);
  upgradeCountdowns();
};

/* ---------- Split-flap countdown ---------- */
// Visual digits are hidden from screen readers; a plain-text equivalent updates once a minute.
function upgradeCountdowns() {
  document.querySelectorAll(".cd:not(.cd-flip)").forEach((cd) => {
    cd.classList.add("cd-flip");
    cd.removeAttribute("role");
    cd.removeAttribute("aria-label");
    cd.querySelectorAll("div").forEach((d) => d.setAttribute("aria-hidden", "true"));
    cd.insertAdjacentHTML("beforeend", `<span class="sr-only" aria-live="off" data-cd-text></span>`);
  });
  updateCountdownText();
}

function updateCountdownText() {
  document.querySelectorAll(".cd-flip").forEach((cd) => {
    const p = countdownParts(cd.dataset.countdown);
    cd.querySelector("[data-cd-text]").textContent = `${p[0][1]} days, ${p[1][1]} hours and ${p[2][1]} minutes to go`;
  });
}

tickCountdowns = function tickFlip() {
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const parts = countdownParts(el.dataset.countdown);
    el.querySelectorAll("b").forEach((b, i) => {
      const next = String(parts[i][1]).padStart(2, "0");
      if (b.textContent === next) return;
      b.textContent = next;
      if (!reduceMotion) { b.classList.remove("is-flip"); void b.offsetWidth; b.classList.add("is-flip"); }
    });
  });
};
clearInterval(countdownTimer);
countdownTimer = setInterval(tickCountdowns, 1000);
setInterval(updateCountdownText, 60000);

/* ---------- Member ticket: tilt (pointer devices only) ---------- */
const renderMemberV2 = renderMember;
renderMember = function renderMemberV3() {
  renderMemberV2();
  upgradeCountdowns();
  const t = document.querySelector("#screen-memberDashboard .md-ticket");
  if (!t || reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  t.classList.add("can-tilt");
  t.addEventListener("pointermove", (e) => {
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    t.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
  });
  t.addEventListener("pointerleave", () => { t.style.transform = ""; });
};

/* ---------- Admin: filter recent bookings ---------- */
let adminFilter = "";
const renderAdminV2 = renderAdmin;
renderAdmin = function renderAdminV3() {
  renderAdminV2();
  const table = document.querySelector("#screen-adminDashboard .ad-table");
  if (!table) return;
  table.insertAdjacentHTML("beforebegin", `
    <label class="ad-filter">${ic("user")}<span class="sr-only">Filter bookings</span>
      <input type="search" id="adFilter" placeholder="Filter by reference, member or event" value="${adminFilter}">
    </label>`);
  applyAdminFilter();
};
function applyAdminFilter() {
  const q = adminFilter.trim().toLowerCase();
  const rows = [...document.querySelectorAll("#screen-adminDashboard .ad-table tbody tr")];
  let shown = 0;
  rows.forEach((tr) => { const ok = !q || tr.textContent.toLowerCase().includes(q); tr.hidden = !ok; shown += ok; });
  document.getElementById("adFilterEmpty")?.remove();
  if (!shown && rows.length) document.querySelector("#screen-adminDashboard .ad-table").insertAdjacentHTML("afterend", `<p class="md-muted" id="adFilterEmpty">No bookings match "${q.replace(/[<>&"]/g, "")}".</p>`);
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-card-tab]");
  if (tab) {
    cardTab = tab.dataset.cardTab;
    const id = Number(document.querySelector("#screen-home .home-cta [data-start-booking]").dataset.startBooking);
    document.getElementById("fightCard").outerHTML = fightCardHtml(id);
    document.querySelector(`[data-card-tab="${cardTab}"]`).focus();
    return;
  }
  if (e.target.closest("#addWallet")) showToast("Demo: in the live app this downloads an Apple or Google Wallet pass.");
});

document.addEventListener("keydown", (e) => {
  const tab = e.target.closest?.("[data-card-tab]");
  if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const other = [...document.querySelectorAll("[data-card-tab]")].find((t) => t !== tab);
    other.click();
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "adFilter") { adminFilter = e.target.value; applyAdminFilter(); }
});

// Hide the sticky bar when leaving home.
const navigateV2 = navigate;
navigate = function navigateV3(screen) {
  navigateV2(screen);
  if (screen !== "home") {
    const bar = document.getElementById("evSticky");
    if (bar) { bar.classList.remove("is-on"); bar.setAttribute("aria-hidden", "true"); bar.querySelector("button").tabIndex = -1; }
  }
};

render();
