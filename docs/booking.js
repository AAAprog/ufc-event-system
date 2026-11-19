// Multi-step booking flow: event → seats → payment → ticket.
// Overrides renderBooking() from app.js and stores the booking in the shared state.

const EVENT_META = {
  1: { date: "2026-12-12T20:00", venue: "Etihad Arena", city: "Abu Dhabi", headline: "Main card · Title fight", base: 120 },
  2: { date: "2027-01-23T21:00", venue: "Kingdom Arena", city: "Riyadh", headline: "Heavyweight co-main", base: 95 },
  3: { date: "2027-02-20T19:30", venue: "Coca-Cola Arena", city: "Dubai", headline: "Lightweight contenders", base: 70 }
};

const TIERS = [
  { id: "cage", name: "Cageside", note: "Rows A–C, steps from the Octagon", mult: 4, share: 0.08 },
  { id: "floor", name: "Floor", note: "Floor seating around the cage", mult: 2.2, share: 0.22 },
  { id: "lower", name: "Lower bowl", note: "Raised view of the whole fight", mult: 1.3, share: 0.35 },
  { id: "upper", name: "Upper bowl", note: "Best value in the arena", mult: 1, share: 0.35 }
];

const FEE_RATE = 0.08;
const VAT_RATE = 0.15;
const PROMOS = { FIGHT10: 0.1, OCTAGON20: 0.2 };
const HOLD_SECONDS = 600;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flow = { step: 1, eventId: null, tier: "lower", qty: 2, promo: null, holdEnds: 0, timer: null, paying: false, booking: null };

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
          <p>${m.headline}</p>
          <p class="bk-muted">${m.venue}, ${m.city} · ${fmtDate(m.date, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>
          <div class="bk-meter" role="img" aria-label="${pct}% sold"><i style="--w:${pct}%"></i></div>
          <p class="bk-left ${low ? "is-low" : ""}">${left === 0 ? "Sold out" : low ? `Only ${left} seats left` : `${left} seats left`}</p>
        </div>
        <div class="bk-event-cta">
          <span class="bk-from">From <b>${money(priceFor(event, "upper"))}</b></span>
          ${mine ? `<span class="bk-tag">Your booking</span>` : ""}
          <button class="btn" type="button" data-pick-event="${event.id}" ${left === 0 ? "disabled" : ""}>${left === 0 ? "Sold out" : "Choose seats"}</button>
        </div>
      </article>`;
  }).join("");
  return `
    <header class="bk-head"><h1>Pick your fight night</h1><p>Prices include every seat tier. You'll see the full cost before you pay.</p></header>
    <div class="bk-events">${cards || `<p class="bk-empty">No events are on sale yet. Check back soon.</p>`}</div>`;
}

/* ---------- Step 2: seats ---------- */
function octagonSvg(event) {
  const rings = [
    { id: "upper", r: 150 }, { id: "lower", r: 118 }, { id: "floor", r: 86 }, { id: "cage", r: 58 }
  ];
  const oct = (r) => Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(160 + r * Math.cos(a)).toFixed(1)},${(160 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return `
    <svg class="bk-map" viewBox="0 0 320 320" role="group" aria-label="Arena seat map">
      ${rings.map((ring) => {
        const left = tierLeft(event, ring.id);
        return `<polygon class="bk-ring ${flow.tier === ring.id ? "is-on" : ""} ${left === 0 ? "is-out" : ""}" data-tier="${ring.id}" points="${oct(ring.r)}" tabindex="${left ? 0 : -1}" role="button" aria-label="${TIERS.find((t) => t.id === ring.id).name}"></polygon>`;
      }).join("")}
      <polygon class="bk-cage" points="${oct(30)}"></polygon>
      <text x="160" y="164" text-anchor="middle">CAGE</text>
    </svg>`;
}

function summaryCard(withTimer) {
  const event = eventById(flow.eventId);
  const t = totals();
  const tier = TIERS.find((x) => x.id === flow.tier);
  return `
    <aside class="bk-summary app-card">
      <h2>Order summary</h2>
      <p class="bk-sum-event">${event.name}<span>${metaFor(event).venue} · ${fmtDate(metaFor(event).date, { day: "numeric", month: "short", year: "numeric" })}</span></p>
      <dl>
        <div><dt>${tier.name} × ${flow.qty}</dt><dd data-count="${t.sub}">${money(t.sub)}</dd></div>
        ${t.discount ? `<div class="is-discount"><dt>Promo ${flow.promo}</dt><dd>−${money(t.discount)}</dd></div>` : ""}
        <div><dt>Service fee</dt><dd>${money(t.fee)}</dd></div>
        <div><dt>VAT 15%</dt><dd>${money(t.vat)}</dd></div>
        <div class="bk-total"><dt>Total</dt><dd data-count="${t.total}">${money(t.total)}</dd></div>
      </dl>
      ${withTimer ? `<p class="bk-hold" id="holdTimer">Seats held for <b>10:00</b></p>` : ""}
    </aside>`;
}

function stepSeats() {
  const event = eventById(flow.eventId);
  const tiers = TIERS.map((tier) => {
    const left = tierLeft(event, tier.id);
    return `
      <label class="bk-tier ${flow.tier === tier.id ? "is-on" : ""} ${left === 0 ? "is-out" : ""}">
        <input type="radio" name="tier" value="${tier.id}" ${flow.tier === tier.id ? "checked" : ""} ${left === 0 ? "disabled" : ""}>
        <span class="bk-swatch bk-swatch--${tier.id}"></span>
        <span class="bk-tier-text"><b>${tier.name}</b><small>${tier.note}</small></span>
        <span class="bk-tier-price"><b>${money(priceFor(event, tier.id))}</b><small>${left ? `${left} left` : "Sold out"}</small></span>
      </label>`;
  }).join("");
  const maxQty = Math.min(6, tierLeft(event, flow.tier));
  return `
    <header class="bk-head"><button class="bk-back" type="button" data-step-to="1">Back to events</button><h1>${event.name}</h1><p>Tap a ring on the map or choose a tier from the list.</p></header>
    <div class="bk-grid">
      <section class="app-card bk-pane">
        <div class="bk-seat-layout">
          ${octagonSvg(event)}
          <div class="bk-tiers" role="radiogroup" aria-label="Seat tier">${tiers}</div>
        </div>
        <div class="bk-qty">
          <span>Tickets</span>
          <div class="bk-stepper">
            <button type="button" data-qty="-1" aria-label="Remove a ticket" ${flow.qty <= 1 ? "disabled" : ""}>−</button>
            <output aria-live="polite">${flow.qty}</output>
            <button type="button" data-qty="1" aria-label="Add a ticket" ${flow.qty >= maxQty ? "disabled" : ""}>+</button>
          </div>
          <small>Up to 6 per order</small>
        </div>
      </section>
      <div class="bk-side">
        ${summaryCard(false)}
        <button class="btn bk-wide" type="button" data-step-to="3" ${maxQty ? "" : "disabled"}>Continue to payment</button>
      </div>
    </div>`;
}

/* ---------- Step 3: payment ---------- */
function stepPayment() {
  const t = totals();
  const user = currentUser();
  return `
    <header class="bk-head"><button class="bk-back" type="button" data-step-to="2">Back to seats</button><h1>Payment</h1><p>This is a demo checkout. Use test card 4242 4242 4242 4242.</p></header>
    <div class="bk-grid">
      <form class="app-card bk-pane bk-pay" id="payForm" novalidate>
        <div class="bk-wallets">
          <button type="button" class="bk-wallet" data-wallet="Apple Pay">Apple Pay</button>
          <button type="button" class="bk-wallet" data-wallet="Google Pay">Google Pay</button>
        </div>
        <p class="bk-or"><span>or pay by card</span></p>
        <label>Name on card<input name="name" autocomplete="cc-name" value="${user.username.replace(/_/g, " ")}" required></label>
        <label>Card number
          <span class="bk-card-field"><input name="card" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="19" required><em id="cardBrand"></em></span>
        </label>
        <div class="bk-row">
          <label>Expiry<input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" required></label>
          <label>CVC<input name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required></label>
        </div>
        <label>Email for tickets<input name="email" type="email" value="${user.email}" required></label>
        <div class="bk-promo">
          <input name="promo" placeholder="Promo code" value="${flow.promo || ""}" aria-label="Promo code">
          <button class="btn secondary" type="button" id="applyPromo">Apply</button>
        </div>
        <p class="bk-hint">Try FIGHT10 or OCTAGON20.</p>
        <button class="btn bk-wide bk-paybtn" type="submit" id="payBtn"><span>Pay ${money(t.total)}</span></button>
        <p class="bk-secure">Secured checkout. Full refund up to 7 days before the event.</p>
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
      <p>Tickets sent to ${b.email}</p>
      <article class="bk-ticket">
        <div class="bk-ticket-main">
          <span class="bk-ref">${b.ref}</span>
          <h2>${b.eventName}</h2>
          <dl>
            <div><dt>Date</dt><dd>${fmtDate(m.date, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div><dt>Venue</dt><dd>${m.venue}, ${m.city}</dd></div>
            <div><dt>Seats</dt><dd>${b.tierName} × ${b.qty}</dd></div>
            <div><dt>Paid</dt><dd>${money(b.total)}</dd></div>
          </dl>
        </div>
        <div class="bk-ticket-stub">${qrSvg(b.ref)}<small>Scan at the gate</small></div>
      </article>
      <div class="action-row">
        <button class="btn" type="button" id="addCalendar">Add to calendar</button>
        <button class="btn secondary nav-trigger" data-screen="memberDashboard" type="button">Go to dashboard</button>
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
    eventId: event.id, eventName: event.name, tierName: tier.name, qty: flow.qty, total: t.total, email
  };
  state.bookings = [...(state.bookings || []), { ...flow.booking, userId: user.id, at: new Date().toISOString() }];
  saveState();
  flow.holdEnds = 0;
  flow.promo = null;
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
    flow.tier = TIERS.map((t) => t.id).reverse().find((id) => tierLeft(event, id) > 0) || "upper";
    flow.tier = tierLeft(event, "lower") ? "lower" : flow.tier;
    flow.qty = Math.min(2, Math.max(1, tierLeft(event, flow.tier)));
    flow.holdEnds = 0;
    goStep(2);
    return;
  }

  const to = e.target.closest("[data-step-to]");
  if (to) { goStep(Number(to.dataset.stepTo)); return; }

  const ring = e.target.closest(".bk-ring");
  if (ring && !ring.classList.contains("is-out")) { selectTier(ring.dataset.tier); return; }

  const qty = e.target.closest("[data-qty]");
  if (qty) {
    const max = Math.min(6, tierLeft(eventById(flow.eventId), flow.tier));
    flow.qty = Math.max(1, Math.min(max, flow.qty + Number(qty.dataset.qty)));
    renderBooking();
    bumpTotals();
    return;
  }

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

function selectTier(id) {
  flow.tier = id;
  const max = Math.min(6, tierLeft(eventById(flow.eventId), id));
  flow.qty = Math.max(1, Math.min(flow.qty, max));
  renderBooking();
  bumpTotals();
  document.querySelector(`.bk-tier input[value="${id}"]`)?.focus();
}

document.addEventListener("change", (e) => {
  if (e.target.name === "tier" && e.target.closest(".bk-tiers")) selectTier(e.target.value);
});

document.addEventListener("keydown", (e) => {
  const ring = e.target.closest?.(".bk-ring");
  if (ring && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectTier(ring.dataset.tier); }
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
