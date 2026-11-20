// Seat selection and payment screens.
// Flow: Book now → Choose seats → Payment → My booking.

const TIERS = [
  { id: "cage", name: "Cageside", note: "Closest to the Octagon", mult: 4, rows: 2, cols: 10 },
  { id: "floor", name: "Floor", note: "Great view of every round", mult: 2, rows: 3, cols: 12 },
  { id: "stands", name: "Stands", note: "Best value in the arena", mult: 1, rows: 4, cols: 14 }
];
const SERVICE_FEE = 0.08;
const VAT = 0.15;
const MAX_SEATS = 4;
const HOLD_MS = 10 * 60 * 1000;

const checkout = { eventId: null, tier: "floor", seats: [], holdEnds: 0, timer: null, paying: false };

const money = (n) => `$${n.toFixed(2)}`;
const tierById = (id) => TIERS.find((t) => t.id === id);
const tierPrice = (ev, tier) => (infoFor(ev).price || 50) * tierById(tier).mult;

function seatTaken(ev, tier, seat) {
  let h = 0;
  for (const c of `${ev.id}-${tier}-${seat}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 100) / 100 < Math.min(0.9, ev.registered / ev.quota);
}

function totals() {
  const ev = eventById(checkout.eventId);
  const sub = tierPrice(ev, checkout.tier) * checkout.seats.length;
  const fee = sub * SERVICE_FEE;
  const vat = (sub + fee) * VAT;
  return { sub, fee, vat, total: sub + fee + vat };
}

/* ---------- Screens ---------- */
document.querySelector(".app-shell").insertAdjacentHTML("beforeend", `
  <section class="screen" id="screen-seats"></section>
  <section class="screen" id="screen-payment"></section>`);

function stepper(step) {
  const steps = ["Event", "Seats", "Payment", "Ticket"];
  return `<ol class="steps" aria-label="Booking progress">${steps.map((s, i) => `
    <li class="${i < step ? "is-done" : i === step ? "is-current" : ""}" ${i === step ? 'aria-current="step"' : ""}>
      <span>${i < step ? icon("check") : i + 1}</span>${s}</li>`).join("")}</ol>`;
}

function summary(withCta) {
  const ev = eventById(checkout.eventId);
  const t = totals();
  const tier = tierById(checkout.tier);
  const n = checkout.seats.length;
  return `
    <aside class="order app-card">
      <h2>Order summary</h2>
      <p class="order-event"><b>${ev.name}</b><span>${eventMeta(ev)}</span></p>
      <dl>
        <div><dt>${tier.name} × ${n}</dt><dd>${money(t.sub)}</dd></div>
        <div><dt>Service fee</dt><dd>${money(t.fee)}</dd></div>
        <div><dt>VAT 15%</dt><dd>${money(t.vat)}</dd></div>
        <div class="order-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>
      </dl>
      ${n ? `<p class="order-seats">${icon("seat")}${checkout.seats.join(", ")}</p>` : ""}
      ${checkout.holdEnds ? `<p class="hold" id="holdTimer">Seats held for <b>10:00</b></p>` : ""}
      ${withCta ? `<button class="btn order-cta" type="button" data-go-pay ${n ? "" : "disabled"}>${n ? "Continue to payment" : "Pick your seats"}${icon("arrow")}</button>` : ""}
    </aside>`;
}

function octagonMap() {
  const ring = (r) => Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(150 + r * Math.cos(a)).toFixed(1)},${(150 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const rings = [["stands", 140], ["floor", 104], ["cage", 70]];
  return `
    <svg class="arena" viewBox="0 0 300 300" role="group" aria-label="Arena map">
      ${rings.map(([id, r]) => `<polygon class="arena-ring ${checkout.tier === id ? "is-on" : ""}" data-tier="${id}" points="${ring(r)}" tabindex="0" role="button" aria-pressed="${checkout.tier === id}" aria-label="${tierById(id).name}"></polygon>`).join("")}
      <polygon class="arena-cage" points="${ring(38)}"></polygon>
      <text x="150" y="154" text-anchor="middle">Octagon</text>
    </svg>`;
}

function seatGrid(ev) {
  const tier = tierById(checkout.tier);
  let rows = "";
  for (let r = 0; r < tier.rows; r += 1) {
    const row = String.fromCharCode(65 + r);
    let seats = "";
    for (let c = 1; c <= tier.cols; c += 1) {
      const id = `${row}${c}`;
      const taken = seatTaken(ev, tier.id, id);
      const on = checkout.seats.includes(id);
      seats += `<button type="button" class="seat ${on ? "is-on" : ""}" data-seat="${id}" ${taken ? "disabled" : ""} aria-pressed="${on}" aria-label="Row ${row} seat ${c}${taken ? ", taken" : ""}"></button>`;
      if (c === Math.ceil(tier.cols / 2)) seats += `<span class="aisle"></span>`;
    }
    rows += `<div class="seat-row"><span class="row-label">${row}</span>${seats}<span class="row-label">${row}</span></div>`;
  }
  return `
    <div class="stage-line">Octagon this way</div>
    <div class="seats" role="group" aria-label="${tier.name} seats">${rows}</div>
    <ul class="legend"><li><i class="seat"></i>Available</li><li><i class="seat is-on"></i>Selected</li><li><i class="seat" data-taken></i>Taken</li></ul>`;
}

function renderSeats() {
  const ev = eventById(checkout.eventId);
  if (!ev) return;
  document.getElementById("screen-seats").innerHTML = `
    ${stepper(1)}
    <div class="section-head">
      <button class="back-link nav-trigger" data-screen="booking" type="button">← All events</button>
      <h1>Choose your seats</h1>
      <p>${ev.name} · ${eventMeta(ev)}</p>
    </div>
    <div class="checkout-grid">
      <div class="checkout-main">
        <section class="app-card pick-card">
          <div class="tier-pick">
            ${octagonMap()}
            <div class="tiers" role="radiogroup" aria-label="Section">
              ${TIERS.map((t) => `
                <button type="button" role="radio" class="tier ${checkout.tier === t.id ? "is-on" : ""}" data-tier="${t.id}" aria-checked="${checkout.tier === t.id}">
                  <i class="tier-dot tier-${t.id}" aria-hidden="true"></i>
                  <span><b>${t.name}</b><small>${t.note}</small></span>
                  <strong>${money(tierPrice(ev, t.id))}</strong>
                </button>`).join("")}
            </div>
          </div>
        </section>
        <section class="app-card pick-card">
          <div class="pick-head"><h2>${tierById(checkout.tier).name} seats</h2><span>Pick up to ${MAX_SEATS}</span></div>
          ${seatGrid(ev)}
        </section>
      </div>
      ${summary(true)}
    </div>`;
  startHoldTick();
}

function renderPayment() {
  const ev = eventById(checkout.eventId);
  if (!ev) return;
  const user = currentUser();
  const t = totals();
  document.getElementById("screen-payment").innerHTML = `
    ${stepper(2)}
    <div class="section-head">
      <button class="back-link" type="button" data-back-seats>← Change seats</button>
      <h1>Payment</h1>
      <p>Demo checkout. Use the test card 4242 4242 4242 4242 with any future date.</p>
    </div>
    <div class="checkout-grid">
      <form class="app-card pay-card" id="payForm" novalidate>
        <div class="wallets">
          <button type="button" class="wallet" data-wallet="Apple Pay">Apple Pay</button>
          <button type="button" class="wallet" data-wallet="mada">mada</button>
        </div>
        <p class="or"><span>or pay with card</span></p>
        <label>Name on card<input name="name" autocomplete="cc-name" value="${user.username.replace(/[_.]/g, " ")}" required></label>
        <label>Card number<span class="card-field"><input name="card" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="19" required><em id="cardBrand"></em></span></label>
        <div class="two">
          <label>Expiry<input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" required></label>
          <label>CVC<input name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required></label>
        </div>
        <label>Email for your tickets<input name="email" type="email" value="${user.email}" required></label>
        <button class="btn pay-btn" type="submit" id="payBtn">${icon("check")}Pay ${money(t.total)}</button>
        <p class="secure">Secure checkout · Full refund up to 7 days before the event</p>
      </form>
      ${summary(false)}
    </div>`;
  startHoldTick();
}

/* ---------- Hold timer ---------- */
function startHoldTick() {
  clearInterval(checkout.timer);
  const tick = () => {
    const el = document.getElementById("holdTimer");
    if (!el || !checkout.holdEnds) return;
    const s = Math.max(0, Math.round((checkout.holdEnds - Date.now()) / 1000));
    el.querySelector("b").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    el.classList.toggle("is-urgent", s <= 60);
    if (s === 0) {
      clearInterval(checkout.timer);
      checkout.seats = [];
      checkout.holdEnds = 0;
      showToast("Your seat hold expired. Please pick your seats again.");
      navigate("seats");
    }
  };
  tick();
  checkout.timer = setInterval(tick, 1000);
}

/* ---------- Card helpers ---------- */
function brandOf(d) {
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  return "";
}
function luhn(d) {
  let sum = 0, dbl = false;
  for (let i = d.length - 1; i >= 0; i -= 1) { let n = +d[i]; if (dbl) { n *= 2; if (n > 9) n -= 9; } sum += n; dbl = !dbl; }
  return d.length >= 13 && sum % 10 === 0;
}
function fieldError(input, msg) {
  const label = input.closest("label");
  label.classList.toggle("has-error", Boolean(msg));
  let el = label.querySelector(".field-error");
  if (msg && !el) { el = document.createElement("small"); el.className = "field-error"; label.append(el); }
  if (el) el.textContent = msg || "";
  input.setAttribute("aria-invalid", msg ? "true" : "false");
}
function checkField(input) {
  const v = input.value.trim();
  const d = v.replace(/\D/g, "");
  let msg = "";
  if (input.name === "name" && !v) msg = "Enter the name shown on your card.";
  if (input.name === "card" && !luhn(d)) msg = "This card number doesn't look right.";
  if (input.name === "exp") {
    const [mm, yy] = v.split("/").map(Number);
    if (!mm || mm > 12 || !yy || new Date(2000 + yy, mm, 1) < new Date()) msg = "Enter a valid expiry date (MM/YY).";
  }
  if (input.name === "cvc" && !/^\d{3,4}$/.test(d)) msg = "Enter the 3 or 4 digits on the back.";
  if (input.name === "email" && !/^\S+@\S+\.\S+$/.test(v)) msg = "Enter an email for your tickets.";
  fieldError(input, msg);
  return !msg;
}

/* ---------- Complete booking ---------- */
function completeBooking() {
  const user = currentUser();
  const ev = eventById(checkout.eventId);
  const prev = eventById(user.registeredEvent);
  if (prev) prev.registered = Math.max(prev.registered - (user.seats?.length || 1), 0);
  ev.registered = Math.min(ev.quota, ev.registered + checkout.seats.length);
  user.registeredEvent = ev.id;
  user.bookedAt = new Date().toISOString();
  user.seats = [...checkout.seats];
  user.tierName = tierById(checkout.tier).name;
  user.total = totals().total;
  saveState();
  clearInterval(checkout.timer);
  checkout.holdEnds = 0;
  checkout.seats = [];
  checkout.paying = false;
  navigate("memberDashboard");
  showToast(`You're booked for ${ev.name}. Your ticket is ready.`);
  const t = document.querySelector("#screen-memberDashboard .ticket");
  if (t && !reduceMotion) t.classList.add("is-new");
}

function pay(label) {
  if (checkout.paying) return;
  checkout.paying = true;
  const btn = document.getElementById("payBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${label ? `Confirming with ${label}…` : "Processing payment…"}`;
  setTimeout(() => {
    btn.classList.add("is-success");
    btn.innerHTML = `${icon("check")}Paid`;
    setTimeout(completeBooking, 600);
  }, reduceMotion ? 300 : 1300);
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const book = e.target.closest("[data-book]");
  if (book) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const id = Number(book.dataset.book);
    if (currentUser().registeredEvent === id) { navigate("memberDashboard"); return; }
    checkout.eventId = id;
    checkout.seats = [];
    checkout.holdEnds = 0;
    checkout.tier = "floor";
    navigate("seats");
    return;
  }
  const tier = e.target.closest("[data-tier]");
  if (tier && tier.closest("#screen-seats")) { checkout.tier = tier.dataset.tier; checkout.seats = []; renderSeats(); return; }
  const seat = e.target.closest("[data-seat]");
  if (seat) {
    const id = seat.dataset.seat;
    if (checkout.seats.includes(id)) checkout.seats = checkout.seats.filter((s) => s !== id);
    else if (checkout.seats.length >= MAX_SEATS) { showToast(`You can pick up to ${MAX_SEATS} seats per booking.`); return; }
    else checkout.seats = [...checkout.seats, id];
    if (checkout.seats.length && !checkout.holdEnds) checkout.holdEnds = Date.now() + HOLD_MS;
    if (!checkout.seats.length) checkout.holdEnds = 0;
    renderSeats();
    document.querySelector(`[data-seat="${id}"]`)?.focus();
    return;
  }
  if (e.target.closest("[data-go-pay]")) { navigate("payment"); return; }
  if (e.target.closest("[data-back-seats]")) { navigate("seats"); return; }
  const wallet = e.target.closest("[data-wallet]");
  if (wallet) pay(wallet.dataset.wallet);
}, true);

document.addEventListener("keydown", (e) => {
  const ring = e.target.closest?.(".arena-ring");
  if (ring && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ring.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
});

document.addEventListener("input", (e) => {
  if (!e.target.closest("#payForm")) return;
  const i = e.target;
  if (i.name === "card") {
    const d = i.value.replace(/\D/g, "").slice(0, 16);
    i.value = d.replace(/(.{4})/g, "$1 ").trim();
    document.getElementById("cardBrand").textContent = brandOf(d);
  }
  if (i.name === "exp") { const d = i.value.replace(/\D/g, "").slice(0, 4); i.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }
  if (i.name === "cvc") i.value = i.value.replace(/\D/g, "").slice(0, 4);
  if (i.closest("label").classList.contains("has-error")) checkField(i);
});
document.addEventListener("focusout", (e) => { if (e.target.closest("#payForm") && e.target.value) checkField(e.target); });
document.addEventListener("submit", (e) => {
  if (e.target.id !== "payForm") return;
  e.preventDefault();
  const fields = [...e.target.querySelectorAll("input[required]")];
  const ok = fields.map(checkField).every(Boolean);
  if (!ok) { fields.find((f) => f.getAttribute("aria-invalid") === "true").focus(); return; }
  pay();
});

/* Render the right screen when navigating */
const navigateCheckout = navigate;
navigate = function navigateWithCheckout(screen) {
  if ((screen === "seats" || screen === "payment") && !eventById(checkout.eventId)) screen = "booking";
  if (screen === "payment" && !checkout.seats.length) screen = "seats";
  if (screen === "seats") renderSeats();
  if (screen === "payment") renderPayment();
  if (screen !== "seats" && screen !== "payment") clearInterval(checkout.timer);
  navigateCheckout(screen);
};
