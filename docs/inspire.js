// Inspired by Magic UI, React Bits, cta.gallery, footer.design and scroll shaders,
// rebuilt in the site's own style:
// - hero title word reveal + animated light field (shader-like, CSS only)
// - shimmer on the main CTA, moving border beam on the hero card
// - venue marquee under the hero
// - number tickers on hero and admin stats
// - cursor spotlight on cards
// - reveal-on-scroll for sections
// - closing CTA band and a fuller footer

const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Hero: word reveal, light field, beam, shimmer ---------- */
function upgradeHero() {
  const card = document.querySelector("#screen-home .hero-card");
  if (!card || card.dataset.inspired) return;
  card.dataset.inspired = "1";
  card.classList.add("beam-card");
  card.insertAdjacentHTML("afterbegin", `<div class="light-field" aria-hidden="true"><i></i><i></i><i></i></div>`);
  const h1 = card.querySelector("h1");
  const words = h1.textContent.trim().split(/\s+/);
  h1.setAttribute("aria-label", h1.textContent.trim());
  h1.innerHTML = words.map((w, i) => `<span class="word" aria-hidden="true" style="--i:${i}">${w}</span>`).join(" ");
  card.querySelector(".action-row .btn:not(.secondary)")?.classList.add("shimmer");
}

/* ---------- Marquee of venues ---------- */
function marquee() {
  const home = document.getElementById("screen-home");
  home.querySelector(".marquee")?.remove();
  const items = [...new Map(state.events.map((e) => {
    const i = infoFor(e);
    return [`${i.venue}${i.city}`, `<span>${i.venue}${i.city ? ` <em>${i.city}</em>` : ""}</span>`];
  })).values()];
  if (!items.length) return;
  const row = items.join('<b aria-hidden="true">✦</b>');
  home.querySelector(".hero-grid").insertAdjacentHTML("afterend", `
    <div class="marquee" aria-label="Venues: ${state.events.map((e) => infoFor(e).city).filter(Boolean).join(", ")}">
      <div class="marquee-track" aria-hidden="true">${row}<b>✦</b>${row}<b>✦</b></div>
    </div>`);
}

/* ---------- Number ticker ---------- */
function tick(el) {
  const text = el.textContent.trim();
  const m = text.match(/^(\D*)([\d,]+)(.*)$/);
  if (!m || calm || el.dataset.ticked === text) return;
  el.dataset.ticked = text;
  const target = Number(m[2].replace(/,/g, ""));
  if (!target) return;
  const start = performance.now();
  const dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = `${m[1]}${v.toLocaleString("en-US")}${m[3]}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const tickTargets = () => document.querySelectorAll(".screen.is-active .metric-grid strong, .screen.is-active .hero-summary strong");

/* ---------- Cursor spotlight on cards ---------- */
document.addEventListener("pointermove", (e) => {
  const card = e.target.closest?.(".event-card, .booking-card, .city-tile, .tier, .metric-grid > div, .hero-summary div");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${e.clientX - r.left}px`);
  card.style.setProperty("--my", `${e.clientY - r.top}px`);
});

/* ---------- Reveal on scroll ---------- */
const revealer = "IntersectionObserver" in window && !calm
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); revealer.unobserve(en.target); }
  }), { threshold: 0.12 })
  : null;
function observeReveals() {
  document.querySelectorAll(".screen.is-active .home-extra, .screen.is-active .timeline-card, .screen.is-active .my-booking, .screen.is-active .cta-band").forEach((el) => {
    if (el.dataset.reveal) return;
    el.dataset.reveal = "1";
    if (revealer) { el.classList.add("reveal"); revealer.observe(el); }
  });
}

/* ---------- Closing CTA band (home) ---------- */
function ctaBand() {
  const home = document.getElementById("screen-home");
  home.querySelector(".cta-band")?.remove();
  const next = typeof nextEvent === "function" ? nextEvent() : null;
  home.insertAdjacentHTML("beforeend", `
    <section class="cta-band">
      <div>
        <h2>Don't watch it from home.</h2>
        <p>${next ? `${next.name} is ${Math.max(0, Math.ceil((new Date(infoFor(next).date) - Date.now()) / 864e5))} days away and seats are going fast.` : "New fight nights are announced every month."}</p>
      </div>
      <div class="cta-actions">
        <button class="btn shimmer nav-trigger" data-screen="booking" type="button">Find your seat</button>
        <button class="btn secondary nav-trigger" data-screen="register" type="button">Create free account</button>
      </div>
    </section>`);
}

/* ---------- Fuller footer ---------- */
function upgradeFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer || footer.dataset.inspired) return;
  footer.dataset.inspired = "1";
  const cities = [...new Set(state.events.map((e) => infoFor(e).city).filter(Boolean))];
  footer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <b class="footer-logo">UFC Fight Night</b>
        <p>Tickets for fight nights across the Gulf. Pick your exact seat, pay in SAR, get your QR ticket instantly.</p>
        <form class="footer-news" id="newsForm" novalidate>
          <label class="sr-only" for="newsEmail">Email</label>
          <input id="newsEmail" type="email" placeholder="Email for new fight nights" required>
          <button class="btn" type="submit">Notify me</button>
        </form>
      </div>
      <nav aria-label="Events"><h3>Events</h3>
        ${cities.slice(0, 6).map((c) => `<button type="button" data-home-city="${c}">${c}</button>`).join("")}
      </nav>
      <nav aria-label="Account"><h3>Account</h3>
        <button class="nav-trigger" data-screen="login" type="button">Sign in</button>
        <button class="nav-trigger" data-screen="register" type="button">Create account</button>
        <button class="nav-trigger" data-screen="memberDashboard" type="button">My booking</button>
      </nav>
      <nav aria-label="More"><h3>More</h3>
        <button class="nav-trigger" data-screen="adminLogin" type="button">Staff sign-in</button>
        <button class="nav-trigger" data-screen="source" type="button">Source code</button>
      </nav>
    </div>
    <div class="footer-base"><span>© 2026 UFC Fight Night · Fan project, not affiliated with UFC</span><span>Prices in SAR · VAT included at checkout</span></div>
    <div class="footer-word" aria-hidden="true">FIGHT NIGHT</div>`;
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "newsForm") return;
  e.preventDefault();
  const input = document.getElementById("newsEmail");
  if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { showToast("Enter a valid email to get alerts."); return; }
  input.value = "";
  showToast("You're on the list. We'll email you when new fight nights drop.");
});

/* ---------- Hook into rendering ---------- */
const renderHomeInspire = renderHome;
renderHome = function renderHomeInspired() {
  renderHomeInspire();
  upgradeHero();
  marquee();
  ctaBand();
};

const navigateInspire = navigate;
navigate = function navigateInspired(screen) {
  navigateInspire(screen);
  requestAnimationFrame(() => { tickTargets().forEach(tick); observeReveals(); });
};

render();
upgradeFooter();
requestAnimationFrame(() => { tickTargets().forEach(tick); observeReveals(); });
