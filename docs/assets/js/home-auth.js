// Home page sections and sign-in / register upgrades.

/* ---------- Home: browse by city, selling fast, how it works ---------- */
const renderHomeV2 = renderHome;
renderHome = function renderHomeV3() {
  renderHomeV2();
  const root = document.getElementById("screen-home");
  root.querySelectorAll(".home-extra").forEach((el) => el.remove());

  const cities = {};
  state.events.forEach((e) => {
    const { city, price } = infoFor(e);
    if (!city) return;
    cities[city] ??= { count: 0, from: Infinity };
    cities[city].count += 1;
    if (price) cities[city].from = Math.min(cities[city].from, price);
  });
  const hot = state.events
    .filter((e) => e.quota > e.registered)
    .sort((a, b) => b.registered / b.quota - a.registered / a.quota)
    .slice(0, 3);

  root.insertAdjacentHTML("beforeend", `
    <section class="home-extra app-card">
      <div class="panel-head"><h2>Browse by city</h2><button class="link-btn nav-trigger" data-screen="booking" type="button">All events</button></div>
      <div class="city-grid">
        ${Object.entries(cities).map(([city, c]) => `
          <button type="button" class="city-tile" data-home-city="${city}">
            <b>${city}</b>
            <span>${c.count} ${c.count === 1 ? "event" : "events"}${Number.isFinite(c.from) ? ` · from ${sar(c.from)}` : ""}</span>
          </button>`).join("")}
      </div>
    </section>
    ${hot.length ? `
    <section class="home-extra app-card">
      <div class="panel-head"><h2>Selling fast</h2><span class="muted-note">Grab these before they're gone</span></div>
      <div class="event-list">${hot.map(eventCard).join("")}</div>
    </section>` : ""}
    <section class="home-extra how app-card">
      <h2>How it works</h2>
      <ol class="how-list">
        <li><span>1</span><b>Pick a fight night</b><p>Search by city, date or price.</p></li>
        <li><span>2</span><b>Choose your seats</b><p>Cageside, floor or stands — pick the exact seats.</p></li>
        <li><span>3</span><b>Pay and get your ticket</b><p>Your QR ticket appears in My account right away.</p></li>
      </ol>
    </section>`);
};

document.addEventListener("click", (e) => {
  const tile = e.target.closest("[data-home-city]");
  if (!tile) return;
  eventFilter.city = tile.dataset.homeCity;
  navigate("booking");
});

/* ---------- Sign in / register: promo panel + show password ---------- */
function authPromo() {
  const ev = nextEvent();
  if (!ev) return "";
  const info = infoFor(ev);
  return `
    <aside class="auth-promo" aria-label="Next fight night">
      <p class="hero-next-label"><span class="live-dot" aria-hidden="true"></span>Next fight night</p>
      <h2>${ev.name}</h2>
      ${MAIN_EVENTS[ev.id] ? `<p class="auth-promo-fight">${MAIN_EVENTS[ev.id]}</p>` : ""}
      <p class="auth-promo-meta">${eventMeta(ev)}</p>
      ${countdown(info.date)}
      <ul class="perks">
        <li>${icon("seat")}Pick your exact seats</li>
        <li>${icon("ticket")}QR ticket in your account</li>
        <li>${icon("check")}Free cancellation up to 7 days before</li>
      </ul>
    </aside>`;
}

function addPasswordToggles(form) {
  form.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.parentElement.classList.contains("pw-field")) return;
    const wrap = document.createElement("span");
    wrap.className = "pw-field";
    input.replaceWith(wrap);
    wrap.append(input);
    wrap.insertAdjacentHTML("beforeend", `<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">Show</button>`);
  });
}

["loginForm", "registerForm"].forEach((id) => addPasswordToggles(document.getElementById(id)));
document.querySelector("#loginForm .auth-header p").textContent = "See your tickets, manage your booking and update your details.";
document.querySelector("#loginForm .auth-kicker").textContent = "Welcome back";

document.addEventListener("click", (e) => {
  const t = e.target.closest(".pw-toggle");
  if (!t) return;
  const input = t.previousElementSibling;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  t.textContent = show ? "Hide" : "Show";
  t.setAttribute("aria-pressed", String(show));
  t.setAttribute("aria-label", show ? "Hide password" : "Show password");
});


render();
