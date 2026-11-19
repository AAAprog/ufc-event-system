// Multi-step booking flow: event → seats → payment → ticket.
// Overrides renderBooking() from app.js and stores the booking in the shared state.

const EVENT_META = {
  1: { date: "2026-12-12T20:00", venue: "Etihad Arena", city: "Abu Dhabi", headline: "Main card · Title fight", base: 120 },
  2: { date: "2027-01-23T21:00", venue: "Kingdom Arena", city: "Riyadh", headline: "Heavyweight co-main", base: 95 },
  3: { date: "2027-02-20T19:30", venue: "Coca-Cola Arena", city: "Dubai", headline: "Lightweight contenders", base: 70 }
};

const TIERS = [
  { id: "cage", name: "Cageside", note: "Rows A–B, steps from the Octagon", mult: 4, share: 0.08 },
  { id: "floor", name: "Floor", note: "Floor seating around the cage", mult: 2.2, share: 0.22 },
  { id: "lower", name: "Lower bowl", note: "Raised view of the whole fight", mult: 1.3, share: 0.35 },
  { id: "upper", name: "Upper bowl", note: "Best value in the arena", mult: 1, share: 0.35 }
];


// Icons: Lucide (ISC license), inlined so the preview has no external dependency.
const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  seat: '<path d="M7 18v3M17 18v3M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/>',
  timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  home: '<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7.5.5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0Z"/>'
};
const ic = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const STEP_ICONS = { 1: "calendar", 2: "seat", 3: "card", 4: "ticket" };
const TIER_ICONS = { cage: "trophy", floor: "flame", lower: "seat", upper: "ticket" };

const FEE_RATE = 0.08;
const VAT_RATE = 0.15;
const PROMOS = { FIGHT10: 0.1, OCTAGON20: 0.2 };
const HOLD_SECONDS = 600;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flow = { step: 1, eventId: null, tier: "lower", side: null, seats: [], qty: 0, promo: null, holdEnds: 0, timer: null, paying: false, booking: null };

const money = (n) => `$${n.toFixed(2)}`;

function metaFor(event) {
  return EVENT_META[event.id] || {
    date: "2027-03-15T20:00", venue: "Fight Arena", city: "TBA", headline: "Fight night", base: 80
  };
}

function priceFor(event, tierId) {
  const tier = TIERS.find((t) => t.id === tierId);
  return Math.round(metaFor(event).base * tier.mult);
}

function tierLeft(event, tierId) {
  const tier = TIERS.find((t) => t.id === tierId);
  const left = Math.max(event.quota - event.registered, 0);
  return Math.max(0, Math.min(left, Math.round(event.quota * tier.share * (left / event.quota))));
}

function totals() {
  const event = eventById(flow.eventId);
  const sub = priceFor(event, flow.tier) * flow.qty;
  const discount = flow.promo ? sub * PROMOS[flow.promo] : 0;
  const fee = (sub - discount) * FEE_RATE;
  const vat = (sub - discount + fee) * VAT_RATE;
  return { sub, discount, fee, vat, total: sub - discount + fee + vat };
}

function fmtDate(iso, opts) {
  return new Date(iso).toLocaleString("en-GB", opts);
}

function goStep(step) {
  flow.step = step;
  renderBooking();
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

/* ---------- Step 1: event list ---------- */
function stepEvents() {
  const user = currentUser();
  const cards = state.events.map((event) => {
    const m = metaFor(event);
    const left = Math.max(event.quota - event.registered, 0);
    const pct = Math.min(100, Math.round((event.registered / event.quota) * 100));
    const low = left > 0 && left <= 15;
    const mine = user.registeredEvent === event.id;
    return `
      <article class="bk-event ${left === 0 ? "is-full" : ""}">
        <div class="bk-date"><strong>${fmtDate(m.date, { day: "2-digit" })}</strong><span>${fmtDate(m.date, { month: "short" })}</span></div>
        <div class="bk-event-body">
          <h3>${event.name}</h3>
          <p class="bk-chip">${ic("trophy")}${m.headline}</p>
          <ul class="bk-meta"><li>${ic("pin")}${m.venue}, ${m.city}</li><li>${ic("clock")}${fmtDate(m.date, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</li></ul>
          <div class="bk-meter" role="img" aria-label="${pct}% sold"><i style="--w:${pct}%"></i></div>
          <p class="bk-left ${low ? "is-low" : ""}">${low ? ic("flame") : ic("seat")}${left === 0 ? "Sold out" : low ? `Only ${left} seats left` : `${left} seats left`}</p>
        </div>
        <div class="bk-event-cta">
          <span class="bk-from">From <b>${money(priceFor(event, "upper"))}</b></span>
          ${mine ? `<span class="bk-tag">${ic("check")}Your booking</span>` : ""}
          <button class="btn" type="button" data-pick-event="${event.id}" ${left === 0 ? "disabled" : ""}>${left === 0 ? "Sold out" : `${ic("ticket")}Choose seats`}</button>
        </div>
      </article>`;
  }).join("");
  return `
    <header class="bk-head"><h1>Pick your fight night</h1><p>Prices include every seat tier. You'll see the full cost before you pay.</p></header>
    <div class="bk-events">${cards || `<p class="bk-empty">No events are on sale yet. Check back soon.</p>`}</div>`;
}

/* ---------- Step 2: seats ---------- */
const RINGS = { cage: [58, 34], floor: [86, 60], lower: [118, 88], upper: [150, 120] };
const TIER_CODE = { cage: "C", floor: "F", lower: "L", upper: "U" };
const SEAT_GRID = { cage: [2, 8], floor: [3, 10], lower: [4, 12], upper: [5, 14] };
const SIDE_NAMES = ["South-east", "South", "South-west", "West", "North-west", "North", "North-east", "East"];

function hashStr(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h / 4294967295;
}

function sectionCode(tier, side) { return `${TIER_CODE[tier]}${side + 1}`; }

function isSold(event, tier, side, seatId) {
  const occupancy = Math.min(0.95, event.registered / event.quota + (tier === "cage" ? 0.15 : 0));
  return hashStr(`${event.id}-${tier}-${side}-${seatId}`) < occupancy;
}

function sectionFree(event, tier, side) {
  const [rows, cols] = SEAT_GRID[tier];
  let free = 0;
  for (let r = 0; r < rows; r += 1) for (let c = 1; c <= cols; c += 1) {
    if (!isSold(event, tier, side, `${String.fromCharCode(65 + r)}${c}`)) free += 1;
  }
  return free;
}

function octagonSvg(event) {
  const pt = (r, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(160 + r * Math.cos(a)).toFixed(1)},${(160 + r * Math.sin(a)).toFixed(1)}`;
  };
  const oct = (r) => Array.from({ length: 8 }, (_, i) => pt(r, i)).join(" ");
  const segs = Object.entries(RINGS).map(([tier, [ro, ri]]) => Array.from({ length: 8 }, (_, side) => {
    const free = sectionFree(event, tier, side);
    const on = flow.tier === tier && flow.side === side;
    const name = `${TIERS.find((t) => t.id === tier).name} section ${sectionCode(tier, side)}, ${SIDE_NAMES[side]}, ${free} seats free`;
    return `<polygon class="bk-seg bk-seg--${tier} ${on ? "is-on" : ""} ${free ? "" : "is-out"}" data-tier="${tier}" data-side="${side}"
      points="${pt(ro, side)} ${pt(ro, side + 1)} ${pt(ri, side + 1)} ${pt(ri, side)}" tabindex="${free ? 0 : -1}" role="button" aria-pressed="${on}" aria-label="${name}"><title>${name}</title></polygon>`;
  }).join("")).join("");
  return `
    <svg class="bk-map ${flow.side !== null ? "has-pick" : ""}" viewBox="0 0 320 320" role="group" aria-label="Arena map. Choose a section around the Octagon.">
      ${segs}
      <polygon class="bk-cage" points="${oct(30)}"></polygon>
      <text x="160" y="164" text-anchor="middle">OCTAGON</text>
    </svg>`;
}

function seatGrid(event) {
  if (flow.side === null) {
    return `<div class="bk-seat-empty">${ic("pin")}<p>Pick a section on the map to see its seats.</p></div>`;
  }
  const tier = flow.tier;
  const [rows, cols] = SEAT_GRID[tier];
  let html = "";
  for (let r = 0; r < rows; r += 1) {
    const row = String.fromCharCode(65 + r);
    let seats = "";
    for (let c = 1; c <= cols; c += 1) {
      const id = `${row}${c}`;
      const sold = isSold(event, tier, flow.side, id);
      const on = flow.seats.includes(id);
      seats += `<button type="button" class="bk-seat ${on ? "is-on" : ""}" data-seat="${id}" ${sold ? "disabled" : ""}
        aria-pressed="${on}" aria-label="Row ${row}, seat ${c}${sold ? ", taken" : ""}">${on ? c : ""}</button>`;
      if (c === Math.ceil(cols / 2)) seats += `<span class="bk-aisle" aria-hidden="true"></span>`;
    }
    html += `<div class="bk-seat-row"><span class="bk-row-label">${row}</span>${seats}<span class="bk-row-label">${row}</span></div>`;
  }
  return `
    <div class="bk-seat-head">
      <div><b>Section ${sectionCode(tier, flow.side)}</b><small>${TIERS.find((t) => t.id === tier).name} · ${SIDE_NAMES[flow.side]} side · ${money(priceFor(event, tier))} each</small></div>
      ${flow.seats.length ? `<button type="button" class="bk-clear" data-clear-seats>Clear</button>` : ""}
    </div>
    <div class="bk-cage-edge">${ic("arrow", "bk-up")}Octagon this way</div>
    <div class="bk-seats" role="group" aria-label="Seats in section ${sectionCode(tier, flow.side)}">${html}</div>
    <ul class="bk-legend">
      <li><i class="bk-seat"></i>Available</li>
      <li><i class="bk-seat is-on"></i>Your pick</li>
      <li><i class="bk-seat" data-sold></i>Taken</li>
    </ul>`;
}

function summaryCard(withTimer) {
  const event = eventById(flow.eventId);
  const t = totals();
  const tier = TIERS.find((x) => x.id === flow.tier);
  return `
    <aside class="bk-summary app-card">
      <h2>${ic("ticket")}Order summary</h2>
      <p class="bk-sum-event">${event.name}<span>${metaFor(event).venue} · ${fmtDate(metaFor(event).date, { day: "numeric", month: "short", year: "numeric" })}</span></p>
      <dl>
        <div><dt>${tier.name} × ${flow.qty}</dt><dd data-count="${t.sub}">${money(t.sub)}</dd></div>
        ${t.discount ? `<div class="is-discount"><dt>Promo ${flow.promo}</dt><dd>−${money(t.discount)}</dd></div>` : ""}
        <div><dt>Service fee</dt><dd>${money(t.fee)}</dd></div>
        <div><dt>VAT 15%</dt><dd>${money(t.vat)}</dd></div>
        <div class="bk-total"><dt>Total</dt><dd data-count="${t.total}">${money(t.total)}</dd></div>
      </dl>
      ${withTimer ? `<p class="bk-hold" id="holdTimer">${ic("timer")}Seats held for <b>10:00</b></p>` : ""}
    </aside>`;
}

function stepSeats() {
  const event = eventById(flow.eventId);
  const tiers = TIERS.map((tier) => {
    const free = Array.from({ length: 8 }, (_, side) => sectionFree(event, tier.id, side)).reduce((x, y) => x + y, 0);
    return `
      <button type="button" class="bk-tier ${flow.tier === tier.id ? "is-on" : ""}" data-tier-pick="${tier.id}" ${free ? "" : "disabled"}>
        <span class="bk-swatch bk-swatch--${tier.id}">${ic(TIER_ICONS[tier.id])}</span>
        <span class="bk-tier-text"><b>${tier.name}</b><small>${tier.note}</small></span>
        <span class="bk-tier-price"><b>${money(priceFor(event, tier.id))}</b><small>${free ? `${free} free` : "Sold out"}</small></span>
      </button>`;
  }).join("");
  const picked = flow.seats.length
    ? `<p class="bk-picked">${ic("seat")}<span>Section ${sectionCode(flow.tier, flow.side)} · Row ${[...new Set(flow.seats.map((x) => x[0]))].join(", ")} · Seat ${flow.seats.map((x) => x.slice(1)).join(", ")}</span></p>`
    : `<p class="bk-picked is-empty">${ic("seat")}<span>No seats picked yet. You can pick up to 6.</span></p>`;
  return `
    <header class="bk-head"><button class="bk-back" type="button" data-step-to="1">${ic("back")}Back to events</button><h1>${event.name}</h1><p>Choose a section around the Octagon, then tap your exact seats.</p></header>
    <div class="bk-grid">
      <section class="app-card bk-pane">
        <div class="bk-seat-layout">
          ${octagonSvg(event)}
          <div class="bk-tiers" aria-label="Seat tiers">${tiers}</div>
        </div>
        <div class="bk-seatpane">${seatGrid(event)}</div>
      </section>
      <div class="bk-side">
        ${summaryCard(false)}
        ${picked}
        <button class="btn bk-wide" type="button" data-step-to="3" ${flow.seats.length ? "" : "disabled"}>${ic("lock")}Continue to payment${ic("arrow")}</button>
      </div>
    </div>`;
}

/* ---------- Step 3: payment ---------- */
function stepPayment() {
  const t = totals();
  const user = currentUser();
  return `
    <header class="bk-head"><button class="bk-back" type="button" data-step-to="2">${ic("back")}Back to seats</button><h1>Payment</h1><p>This is a demo checkout. Use test card 4242 4242 4242 4242.</p></header>
    <div class="bk-grid">
      <form class="app-card bk-pane bk-pay" id="payForm" novalidate>
        <div class="bk-wallets">
          <button type="button" class="bk-wallet" data-wallet="Apple Pay">${ic("phone")}Apple Pay</button>
          <button type="button" class="bk-wallet" data-wallet="Google Pay">${ic("wallet")}Google Pay</button>
        </div>
        <p class="bk-or"><span>or pay by card</span></p>
        <label><span class="bk-lbl">${ic("user")}Name on card</span><input name="name" autocomplete="cc-name" value="${user.username.replace(/_/g, " ")}" required></label>
        <label>Card number
          <span class="bk-card-field">${ic("card","bk-field-ic")}<input name="card" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="19" required><em id="cardBrand"></em></span>
        </label>
        <div class="bk-row">
          <label>Expiry<input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" required></label>
          <label>CVC<input name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required></label>
        </div>
        <label><span class="bk-lbl">${ic("mail")}Email for tickets</span><input name="email" type="email" value="${user.email}" required></label>
        <div class="bk-promo">
          <input name="promo" placeholder="Promo code" value="${flow.promo || ""}" aria-label="Promo code">
          <button class="btn secondary" type="button" id="applyPromo">${ic("tag")}Apply</button>
        </div>
        <p class="bk-hint">Try FIGHT10 or OCTAGON20.</p>
        <button class="btn bk-wide bk-paybtn" type="submit" id="payBtn">${ic("lock")}<span>Pay ${money(t.total)}</span></button>
        <p class="bk-secure">${ic("shield")}Secured checkout. Full refund up to 7 days before the event.</p>
      </form>
      <div class="bk-side">${summaryCard(true)}</div>
    </div>`;
}

/* ---------- Step 4: ticket ---------- */
function qrSvg(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = 21;
  let cells = "";
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      let on;
      if (finder) {
        const fx = x > 13 ? x - 14 : x;
        const fy = y > 13 ? y - 14 : y;
        on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5);
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        on = (h >>> 16) % 2 === 0;
      }
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return `<svg class="bk-qr" viewBox="-1 -1 23 23" aria-label="Ticket QR code">${cells}</svg>`;
}

function stepTicket() {
  const b = flow.booking;
  const event = eventById(b.eventId) || { name: b.eventName };
  const m = metaFor(event);
  return `
    <div class="bk-done">
      <div class="bk-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h1>You're in. See you cageside.</h1>
      <p class="bk-sent">${ic("mail")}Tickets sent to ${b.email}</p>
      <article class="bk-ticket">
        <div class="bk-ticket-main">
          <span class="bk-ref">${ic("ticket")}${b.ref}</span>
          <h2>${b.eventName}</h2>
          <dl>
            <div><dt>${ic("calendar")}Date</dt><dd>${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div><dt>${ic("pin")}Venue</dt><dd>${m.venue}, ${m.city}</dd></div>
            <div><dt>${ic("seat")}Seats</dt><dd>${b.tierName} · Sec ${b.section}<br>${b.seats.join(", ")}</dd></div>
            <div><dt>${ic("card")}Paid</dt><dd>${money(b.total)}</dd></div>
          </dl>
        </div>
        <div class="bk-ticket-stub">${qrSvg(b.ref)}<small>Scan at the gate</small></div>
      </article>
      <div class="action-row">
        <button class="btn" type="button" id="addCalendar">${ic("calendar")}Add to calendar</button>
        <button class="btn secondary nav-trigger" data-screen="memberDashboard" type="button">${ic("home")}Go to dashboard</button>
      </div>
    </div>
    <div class="bk-confetti" aria-hidden="true">${reduceMotion ? "" : Array.from({ length: 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.08}s;--r:${(i * 53) % 360}deg"></i>`).join("")}</div>`;
}

/* ---------- Render ---------- */
function renderBooking() {
  const stage = document.getElementById("bookingStage");
  if (!stage) return;
  if (flow.step > 1 && flow.step < 4 && !eventById(flow.eventId)) flow.step = 1;
  if (flow.step === 4 && !flow.booking) flow.step = 1;

  const views = { 1: stepEvents, 2: stepSeats, 3: stepPayment, 4: stepTicket };
  stage.innerHTML = `<div class="bk-view">${views[flow.step]()}</div>`;

  document.querySelectorAll(".bk-steps li").forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle("is-done", s < flow.step);
    li.classList.toggle("is-current", s === flow.step);
    li.querySelector("span").innerHTML = s < flow.step ? ic("check") : ic(STEP_ICONS[s]);
    li.toggleAttribute("aria-current", s === flow.step);
  });
  document.querySelector(".bk-steps").style.setProperty("--progress", `${((flow.step - 1) / 3) * 100}%`);

  if (flow.step === 3) startHold(); else stopHold();
}

function bumpTotals() {
  document.querySelectorAll(".bk-summary [data-count]").forEach((el) => {
    el.classList.remove("is-bump");
    void el.offsetWidth;
    el.classList.add("is-bump");
  });
}

/* ---------- Seat hold timer ---------- */
function startHold() {
  if (!flow.holdEnds) flow.holdEnds = Date.now() + HOLD_SECONDS * 1000;
  stopHold();
  const tick = () => {
    const el = document.getElementById("holdTimer");
    if (!el) return;
    const s = Math.max(0, Math.round((flow.holdEnds - Date.now()) / 1000));
    el.querySelector("b").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    el.classList.toggle("is-urgent", s <= 60);
    if (s === 0) {
      stopHold();
      flow.holdEnds = 0;
      showToast("Your seat hold expired. Choose your seats again.");
      goStep(2);
    }
  };
  tick();
  flow.timer = setInterval(tick, 1000);
}

function stopHold() {
  if (flow.timer) clearInterval(flow.timer);
  flow.timer = null;
}

/* ---------- Card helpers ---------- */
function cardBrand(num) {
  if (/^4/.test(num)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  if (/^6/.test(num)) return "mada";
  return "";
}

function luhn(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function setError(input, message) {
  const label = input.closest("label");
  label.classList.toggle("has-error", Boolean(message));
  let msg = label.querySelector(".bk-err");
  if (message && !msg) {
    msg = document.createElement("small");
    msg.className = "bk-err";
    label.append(msg);
  }
  if (msg) msg.textContent = message || "";
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateField(input) {
  const v = input.value.trim();
  const digits = v.replace(/\D/g, "");
  let err = "";
  if (input.name === "name" && !v) err = "Enter the name on your card.";
  if (input.name === "card" && !luhn(digits)) err = "Check the card number.";
  if (input.name === "exp") {
    const [mm, yy] = v.split("/").map(Number);
    const exp = new Date(2000 + yy, mm, 1);
    if (!mm || mm > 12 || !yy || exp < new Date()) err = "Enter a valid expiry date.";
  }
  if (input.name === "cvc" && !/^\d{3,4}$/.test(digits)) err = "Enter the 3 or 4 digits on the back.";
  if (input.name === "email" && !/^\S+@\S+\.\S+$/.test(v)) err = "Enter an email for your tickets.";
  setError(input, err);
  return !err;
}

/* ---------- Complete booking ---------- */
function completeBooking(email) {
  const user = currentUser();
  const event = eventById(flow.eventId);
  const prev = eventById(user.registeredEvent);
  const prevQty = state.lastBookingQty || 1;
  if (prev) prev.registered = Math.max(prev.registered - prevQty, 0);
  event.registered = Math.min(event.quota, event.registered + flow.qty);
  user.registeredEvent = event.id;
  state.lastBookingQty = flow.qty;

  const t = totals();
  const tier = TIERS.find((x) => x.id === flow.tier);
  flow.booking = {
    ref: `UFC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    eventId: event.id, eventName: event.name, tierName: tier.name, qty: flow.qty, total: t.total, email,
    section: sectionCode(flow.tier, flow.side), seats: [...flow.seats]
  };
  state.bookings = [...(state.bookings || []), { ...flow.booking, userId: user.id, at: new Date().toISOString() }];
  saveState();
  flow.holdEnds = 0;
  flow.promo = null;
  flow.seats = [];
  flow.side = null;
  flow.step = 4;
  render();
}

function downloadIcs() {
  const b = flow.booking;
  const m = metaFor(eventById(b.eventId) || {});
  const start = new Date(m.date);
  const end = new Date(start.getTime() + 4 * 3600 * 1000);
  const f = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UFC Fight Night//EN", "BEGIN:VEVENT",
    `UID:${b.ref}@ufc-fight-night`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${b.eventName}`, `LOCATION:${m.venue}, ${m.city}`, `DESCRIPTION:Booking ${b.ref} · ${b.tierName} × ${b.qty}`,
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${b.ref}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const pick = e.target.closest("[data-pick-event]");
  if (pick) {
    flow.eventId = Number(pick.dataset.pickEvent);
    const event = eventById(flow.eventId);
    flow.tier = "lower";
    flow.side = null;
    flow.seats = [];
    flow.qty = 0;
    flow.holdEnds = 0;
    goStep(2);
    return;
  }

  const to = e.target.closest("[data-step-to]");
  if (to) { goStep(Number(to.dataset.stepTo)); return; }

  const seg = e.target.closest(".bk-seg");
  if (seg && !seg.classList.contains("is-out")) { selectSection(seg.dataset.tier, Number(seg.dataset.side)); return; }

  const tierBtn = e.target.closest("[data-tier-pick]");
  if (tierBtn) {
    const event = eventById(flow.eventId);
    const id = tierBtn.dataset.tierPick;
    const best = Array.from({ length: 8 }, (_, i) => i).sort((x, y) => sectionFree(event, id, y) - sectionFree(event, id, x))[0];
    selectSection(id, best);
    return;
  }

  const seat = e.target.closest("[data-seat]");
  if (seat) {
    const id = seat.dataset.seat;
    if (flow.seats.includes(id)) flow.seats = flow.seats.filter((x) => x !== id);
    else if (flow.seats.length >= 6) { showToast("You can pick up to 6 seats per order."); return; }
    else flow.seats = [...flow.seats, id].sort((x, y) => x[0].localeCompare(y[0]) || Number(x.slice(1)) - Number(y.slice(1)));
    flow.qty = flow.seats.length;
    renderBooking();
    bumpTotals();
    document.querySelector(`[data-seat="${id}"]`)?.focus();
    return;
  }

  if (e.target.closest("[data-clear-seats]")) { flow.seats = []; flow.qty = 0; renderBooking(); return; }

  if (e.target.id === "applyPromo") {
    const input = document.querySelector("#payForm [name=promo]");
    const code = input.value.trim().toUpperCase();
    if (PROMOS[code]) {
      flow.promo = code;
      renderBooking();
      bumpTotals();
      showToast(`Promo ${code} applied: ${PROMOS[code] * 100}% off tickets.`);
    } else {
      showToast(code ? `${code} isn't a valid promo code.` : "Enter a promo code first.");
    }
    return;
  }

  const wallet = e.target.closest("[data-wallet]");
  if (wallet) { fakePay(wallet.dataset.wallet, document.querySelector("#payForm [name=email]").value); return; }

  if (e.target.id === "addCalendar") downloadIcs();
});

function selectSection(tier, side) {
  if (flow.tier !== tier || flow.side !== side) { flow.seats = []; flow.qty = 0; }
  flow.tier = tier;
  flow.side = side;
  renderBooking();
  document.querySelector(`.bk-seg[data-tier="${tier}"][data-side="${side}"]`)?.focus();
}

document.addEventListener("keydown", (e) => {
  const seg = e.target.closest?.(".bk-seg");
  if (seg && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectSection(seg.dataset.tier, Number(seg.dataset.side)); }
});

document.addEventListener("input", (e) => {
  const form = e.target.closest("#payForm");
  if (!form) return;
  const input = e.target;
  if (input.name === "card") {
    const digits = input.value.replace(/\D/g, "").slice(0, 16);
    input.value = digits.replace(/(.{4})/g, "$1 ").trim();
    document.getElementById("cardBrand").textContent = cardBrand(digits);
  }
  if (input.name === "exp") {
    const d = input.value.replace(/\D/g, "").slice(0, 4);
    input.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }
  if (input.name === "cvc") input.value = input.value.replace(/\D/g, "").slice(0, 4);
  if (input.closest("label")?.classList.contains("has-error")) validateField(input);
});

document.addEventListener("focusout", (e) => {
  if (e.target.closest("#payForm") && e.target.value && e.target.name !== "promo") validateField(e.target);
});

function fakePay(method, email) {
  if (flow.paying) return;
  const btn = document.getElementById("payBtn");
  flow.paying = true;
  btn.classList.add("is-loading");
  btn.disabled = true;
  btn.querySelector("span").textContent = method ? `Confirming with ${method}…` : "Processing payment…";
  setTimeout(() => {
    btn.classList.remove("is-loading");
    btn.classList.add("is-success");
    btn.querySelector("span").textContent = "Paid";
    setTimeout(() => { flow.paying = false; completeBooking(email); }, 550);
  }, 1400);
}

document.addEventListener("submit", (e) => {
  if (e.target.id !== "payForm") return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const fields = [...e.target.querySelectorAll("input[required]")];
  const ok = fields.map(validateField).every(Boolean);
  if (!ok) {
    fields.find((f) => f.getAttribute("aria-invalid") === "true")?.focus();
    e.target.classList.remove("is-shake");
    void e.target.offsetWidth;
    e.target.classList.add("is-shake");
    return;
  }
  fakePay(null, e.target.email.value);
}, true);

// Reset to step 1 whenever the booking screen is opened from navigation.
document.addEventListener("click", (e) => {
  const nav = e.target.closest('.nav-trigger[data-screen="booking"]');
  if (nav && flow.step === 4) { flow.step = 1; flow.booking = null; renderBooking(); }
}, true);

renderBooking();
