// Home, member dashboard and admin dashboard redesign.
// Replaces the markup of those three screens and overrides renderHome / renderMember / renderAdmin from app.js.

// Fictional fighters for the demo fight cards.
const FIGHT_CARDS = {
  1: { red: { name: "Karim Haddad", nick: "The Falcon", rec: "22-3-0", flag: "🇸🇦" }, blue: { name: "Marco Silva", nick: "Tempest", rec: "19-4-0", flag: "🇧🇷" }, weight: "Lightweight title" },
  2: { red: { name: "Ivan Petrov", nick: "Granite", rec: "15-2-0", flag: "🇧🇬" }, blue: { name: "Dele Okafor", nick: "Thunder", rec: "17-3-0", flag: "🇳🇬" }, weight: "Heavyweight" },
  3: { red: { name: "Omar Nasser", nick: "Desert Fox", rec: "12-1-0", flag: "🇦🇪" }, blue: { name: "Jake Turner", nick: "Hammer", rec: "14-5-0", flag: "🇬🇧" }, weight: "Lightweight" }
};

function cardFor(event) {
  return FIGHT_CARDS[event.id] || { red: { name: "Red corner", nick: "TBA", rec: "-", flag: "" }, blue: { name: "Blue corner", nick: "TBA", rec: "-", flag: "" }, weight: "Main event" };
}

function upcomingEvents() {
  return [...state.events].sort((a, b) => new Date(metaFor(a).date) - new Date(metaFor(b).date));
}

function initials(name) { return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(); }

/* ---------- Countdown ---------- */
let countdownTimer = null;
function countdownParts(iso) {
  const ms = Math.max(0, new Date(iso) - Date.now());
  return [["Days", Math.floor(ms / 864e5)], ["Hours", Math.floor(ms / 36e5) % 24], ["Min", Math.floor(ms / 6e4) % 60], ["Sec", Math.floor(ms / 1e3) % 60]];
}
function countdownHtml(iso) {
  return `<div class="cd" data-countdown="${iso}" role="timer" aria-label="Time until the event">${countdownParts(iso)
    .map(([l, v]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${l}</span></div>`).join("")}</div>`;
}
function tickCountdowns() {
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const parts = countdownParts(el.dataset.countdown);
    el.querySelectorAll("b").forEach((b, i) => { b.textContent = String(parts[i][1]).padStart(2, "0"); });
  });
}

function startBookingFor(eventId) {
  flow.step = 1;
  flow.booking = null;
  navigate("booking");
  document.querySelector(`[data-pick-event="${eventId}"]`)?.click();
}

/* ---------- Home ---------- */
function corner(f, side) {
  return `
    <div class="fo-corner fo-${side}">
      <div class="fo-avatar" aria-hidden="true">${initials(f.name)}</div>
      <div class="fo-info"><small>${side === "red" ? "Red corner" : "Blue corner"}</small><b>${f.name}</b><span>"${f.nick}" · ${f.rec} ${f.flag}</span></div>
    </div>`;
}

function renderHome() {
  const root = document.getElementById("screen-home");
  const events = upcomingEvents();
  const next = events.find((e) => e.quota > e.registered) || events[0];
  if (!next) {
    root.innerHTML = `<div class="empty-hero app-card">${ic("calendar")}<h1>No fight nights announced yet</h1><p>New events appear here as soon as they go on sale.</p></div>`;
    return;
  }
  const m = metaFor(next);
  const fc = cardFor(next);
  const left = Math.max(next.quota - next.registered, 0);
  root.innerHTML = `
    <section class="home-hero">
      <div class="home-hero-copy">
        <p class="home-kicker">${ic("flame")}Next fight night · ${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1>${next.name}</h1>
        <p class="home-sub">${ic("pin")}${m.venue}, ${m.city}</p>
        ${countdownHtml(m.date)}
        <div class="home-cta">
          <button class="btn" type="button" data-start-booking="${next.id}">${ic("ticket")}Get tickets from ${money(priceFor(next, "upper"))}</button>
          <span class="home-left ${left <= 15 ? "is-low" : ""}">${ic("seat")}${left} seats left</span>
        </div>
      </div>
      <div class="faceoff app-card" aria-label="Main event">
        <p class="fo-title">${ic("trophy")}Main event · ${fc.weight}</p>
        ${corner(fc.red, "red")}
        <div class="fo-vs" aria-hidden="true"><span>VS</span></div>
        ${corner(fc.blue, "blue")}
      </div>
    </section>

    <section class="home-section">
      <div class="home-section-head"><h2>Upcoming events</h2><button class="link-btn nav-trigger" data-screen="booking" type="button">See all${ic("arrow")}</button></div>
      <div class="ev-rail">
        ${events.map((e) => {
          const em = metaFor(e);
          const efc = cardFor(e);
          const l = Math.max(e.quota - e.registered, 0);
          const pct = Math.round((e.registered / e.quota) * 100);
          return `
            <article class="ev-card">
              <div class="ev-poster">
                <span class="ev-date"><b>${fmtDate(em.date, { day: "2-digit" })}</b>${fmtDate(em.date, { month: "short" })}</span>
                <span class="ev-matchup">${efc.red.name.split(" ").pop()} <i>vs</i> ${efc.blue.name.split(" ").pop()}</span>
              </div>
              <div class="ev-body">
                <h3>${e.name}</h3>
                <p>${ic("pin")}${em.venue}, ${em.city}</p>
                <div class="bk-meter" role="img" aria-label="${pct}% sold"><i style="--w:${pct}%"></i></div>
                <div class="ev-foot">
                  <span>From <b>${money(priceFor(e, "upper"))}</b></span>
                  <button class="btn ev-btn" type="button" data-start-booking="${e.id}" ${l ? "" : "disabled"}>${l ? "Tickets" : "Sold out"}</button>
                </div>
              </div>
            </article>`;
        }).join("")}
      </div>
    </section>

    <section class="home-section how">
      <h2>How booking works</h2>
      <ol class="how-steps">
        <li>${ic("calendar")}<b>Pick a fight night</b><span>See the card, venue and prices up front.</span></li>
        <li>${ic("seat")}<b>Choose your seats</b><span>Use the arena map or let us pick the best seats together.</span></li>
        <li>${ic("lock")}<b>Pay securely</b><span>The full price with fees is shown before you pay.</span></li>
        <li>${ic("ticket")}<b>Get your ticket</b><span>QR ticket by email, ready to scan at the gate.</span></li>
      </ol>
    </section>`;
}

/* ---------- Member dashboard ---------- */
function myBookings() {
  const user = currentUser();
  return (state.bookings || []).filter((b) => b.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
}

function renderMember() {
  const user = currentUser();
  const root = document.getElementById("screen-memberDashboard");
  const booked = eventById(user.registeredEvent);
  const latest = myBookings().find((b) => b.eventId === user.registeredEvent);
  const resume = flow.eventId && (flow.step === 2 || flow.step === 3) && eventById(flow.eventId);

  let ticket;
  if (booked) {
    const m = metaFor(booked);
    ticket = `
      <article class="bk-ticket md-ticket">
        <div class="bk-ticket-main">
          <span class="bk-ref">${ic("ticket")}${latest ? latest.ref : "Booked"}</span>
          <h2>${booked.name}</h2>
          <dl>
            <div><dt>${ic("calendar")}Date</dt><dd>${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div><dt>${ic("pin")}Venue</dt><dd>${m.venue}, ${m.city}</dd></div>
            <div><dt>${ic("seat")}Seats</dt><dd>${latest && latest.seats ? `Sec ${latest.section} · ${latest.seats.join(", ")}` : "General"}</dd></div>
            <div><dt>${ic("card")}Paid</dt><dd>${latest ? money(latest.total) : "-"}</dd></div>
          </dl>
          <p class="md-cd-label">Doors open in</p>
          ${countdownHtml(m.date)}
        </div>
        <div class="bk-ticket-stub">${qrSvg(latest ? latest.ref : `U${user.id}E${booked.id}`)}<small>Scan at the gate</small></div>
      </article>`;
  } else {
    ticket = `
      <div class="md-empty app-card">
        ${ic("ticket")}
        <h2>No tickets yet</h2>
        <p>Your next fight night is a few taps away. Pick an event and choose your seats.</p>
        <button class="btn nav-trigger" data-screen="booking" type="button">${ic("calendar")}Browse events</button>
      </div>`;
  }

  const history = myBookings();
  root.innerHTML = `
    <div class="md-head">
      <div class="md-avatar" aria-hidden="true">${initials(user.username.replace(/_/g, " "))}</div>
      <div><p class="md-hello">Welcome back</p><h1>${user.username}</h1></div>
      <div class="md-actions">
        <button class="btn" type="button" data-screen="booking" class="nav-trigger">${ic("ticket")}Book tickets</button>
        <button class="btn secondary nav-trigger" data-screen="profile" type="button">${ic("user")}Edit profile</button>
      </div>
    </div>
    ${resume ? `<div class="md-resume">${ic("timer")}<span>You didn't finish booking <b>${resume.name}</b>.</span><button class="btn" type="button" data-resume>Resume booking${ic("arrow")}</button></div>` : ""}
    <div class="md-grid">
      <section><h2 class="md-h">Your next fight</h2>${ticket}</section>
      <aside class="md-side">
        <div class="md-stats">
          <div class="app-card"><span>${ic("ticket")}Bookings</span><b>${history.length}</b></div>
          <div class="app-card"><span>${ic("seat")}Seats</span><b>${history.reduce((s, b) => s + (b.qty || 1), 0)}</b></div>
        </div>
        <div class="app-card md-history">
          <h2 class="md-h">Booking history</h2>
          ${history.length ? `<ul>${history.slice(0, 5).map((b) => `
            <li><span class="md-hist-ic">${ic("ticket")}</span><span><b>${b.eventName}</b><small>${b.ref} · ${b.tierName}${b.section ? ` · Sec ${b.section}` : ""}</small></span><em>${money(b.total)}</em></li>`).join("")}</ul>`
            : `<p class="md-muted">Bookings you make will show here with their reference numbers.</p>`}
        </div>
      </aside>
    </div>`;
  root.querySelector(".md-actions .btn").classList.add("nav-trigger");

  const profileForm = document.getElementById("profileForm");
  profileForm.username.value = user.username;
  profileForm.email.value = user.email;
  profileForm.nationality.value = user.nationality;
}

/* ---------- Admin dashboard ---------- */
function renderAdmin() {
  const root = document.getElementById("screen-adminDashboard");
  const bookings = state.bookings || [];
  const revenue = bookings.reduce((s, b) => s + (b.total || 0), 0);
  const sold = state.events.reduce((s, e) => s + e.registered, 0);
  const capacity = state.events.reduce((s, e) => s + e.quota, 0);
  const fill = capacity ? Math.round((sold / capacity) * 100) : 0;
  const byTier = TIERS.map((t) => ({ name: t.name, id: t.id, qty: bookings.filter((b) => b.tierName === t.name).reduce((s, b) => s + (b.qty || 1), 0) }));
  const maxTier = Math.max(1, ...byTier.map((t) => t.qty));

  root.innerHTML = `
    <div class="ad-head">
      <div><p class="md-hello">Admin</p><h1>Overview</h1></div>
      <div class="md-actions">
        <button class="btn nav-trigger" data-screen="manageEvents" type="button">${ic("calendar")}Manage events</button>
        <button class="btn secondary nav-trigger" data-screen="manageUsers" type="button">${ic("user")}Manage users</button>
      </div>
    </div>
    <section class="ad-kpis">
      <div class="app-card"><span>${ic("card")}Revenue</span><b>${money(revenue)}</b><small>${bookings.length} paid ${bookings.length === 1 ? "order" : "orders"}</small></div>
      <div class="app-card"><span>${ic("ticket")}Tickets sold</span><b>${sold}</b><small>of ${capacity} seats</small></div>
      <div class="app-card"><span>${ic("seat")}Average fill</span><b>${fill}%</b><small>${totalSeatsLeft()} seats left</small></div>
      <div class="app-card"><span>${ic("user")}Members</span><b>${state.users.length}</b><small>${state.users.filter((u) => u.registeredEvent !== null).length} with a booking</small></div>
    </section>
    <div class="ad-grid">
      <section class="app-card ad-panel">
        <h2 class="md-h">Capacity by event</h2>
        ${state.events.length ? state.events.map((e) => {
          const pct = Math.round((e.registered / e.quota) * 100);
          const status = pct >= 100 ? "Sold out" : pct >= 85 ? "Almost full" : "On sale";
          return `
            <div class="ad-cap">
              <div class="ad-cap-top"><b>${e.name}</b><span class="ad-status ad-status--${status === "On sale" ? "ok" : status === "Almost full" ? "warn" : "full"}">${status}</span></div>
              <div class="ad-bar" role="img" aria-label="${pct}% full"><i style="--w:${Math.min(100, pct)}%"></i></div>
              <small>${e.registered} / ${e.quota} seats · ${pct}%</small>
            </div>`;
        }).join("") : `<p class="md-muted">No events yet. Add one from Manage events.</p>`}
      </section>
      <section class="app-card ad-panel">
        <h2 class="md-h">Tickets by tier</h2>
        ${byTier.map((t) => `
          <div class="ad-tier">
            <span><i class="bk-dot bk-swatch--${t.id}"></i>${t.name}</span>
            <div class="ad-bar ad-bar--tier"><i class="bk-swatch--${t.id}" style="--w:${(t.qty / maxTier) * 100}%"></i></div>
            <b>${t.qty}</b>
          </div>`).join("")}
        ${bookings.length ? "" : `<p class="md-muted">Tier sales appear after the first booking.</p>`}
      </section>
    </div>
    <section class="app-card ad-panel">
      <h2 class="md-h">Recent bookings</h2>
      ${bookings.length ? `<div class="table-card ad-table"><table>
        <thead><tr><th>Reference</th><th>Member</th><th>Event</th><th>Seats</th><th>Total</th></tr></thead>
        <tbody>${[...bookings].reverse().slice(0, 6).map((b) => {
          const u = state.users.find((x) => x.id === b.userId);
          return `<tr><td>${b.ref}</td><td>${u ? u.username : "Deleted user"}</td><td>${b.eventName}</td><td>${b.section ? `Sec ${b.section} · ${b.seats.join(", ")}` : b.tierName}</td><td>${money(b.total)}</td></tr>`;
        }).join("")}</tbody></table></div>` : `<p class="md-muted">No bookings yet. They'll appear here as members buy tickets.</p>`}
    </section>`;
}

document.addEventListener("click", (e) => {
  const start = e.target.closest("[data-start-booking]");
  if (start) { startBookingFor(Number(start.dataset.startBooking)); return; }
  if (e.target.closest("[data-resume]")) {
    const step = flow.step;
    navigate("booking");
    flow.step = step;
    renderBooking();
  }
});

countdownTimer = setInterval(tickCountdowns, 1000);
render();
