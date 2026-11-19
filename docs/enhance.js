// Per-screen upgrades layered on top of screens.js / booking.js:
// 1. Home: "tale of the tape" stat comparison in the main-event face-off.
// 2. Payment: live card preview that flips to the back for the CVC.
// 3. Sign in / register: split layout with the next fight night beside the form.

/* ---------- 1. Tale of the tape ---------- */
const TAPE = {
  1: { red: { Height: 178, Reach: 183, Wins: 22, KO: 14 }, blue: { Height: 180, Reach: 188, Wins: 19, KO: 9 } },
  2: { red: { Height: 193, Reach: 201, Wins: 15, KO: 12 }, blue: { Height: 190, Reach: 198, Wins: 17, KO: 13 } },
  3: { red: { Height: 175, Reach: 180, Wins: 12, KO: 6 }, blue: { Height: 177, Reach: 179, Wins: 14, KO: 8 } }
};
const TAPE_UNITS = { Height: " cm", Reach: " cm", Wins: "", KO: "" };

function tapeHtml(eventId) {
  const t = TAPE[eventId];
  if (!t) return "";
  return `
    <div class="tape" aria-label="Tale of the tape">
      <p class="tape-title">Tale of the tape</p>
      ${Object.keys(t.red).map((k) => {
        const r = t.red[k], b = t.blue[k];
        const total = r + b;
        return `
          <div class="tape-row">
            <b class="${r > b ? "is-lead" : ""}">${r}${TAPE_UNITS[k]}</b>
            <div class="tape-bar" role="img" aria-label="${k}: red ${r}, blue ${b}">
              <i class="tape-r" style="--w:${(r / total) * 100}%"></i><i class="tape-b" style="--w:${(b / total) * 100}%"></i>
            </div>
            <b class="${b > r ? "is-lead" : ""}">${b}${TAPE_UNITS[k]}</b>
            <span>${k}</span>
          </div>`;
      }).join("")}
    </div>`;
}

const baseRenderHome = renderHome;
renderHome = function renderHomeEnhanced() {
  baseRenderHome();
  const face = document.querySelector("#screen-home .faceoff");
  const btn = document.querySelector("#screen-home [data-start-booking]");
  if (face && btn && !face.querySelector(".tape")) face.insertAdjacentHTML("beforeend", tapeHtml(Number(btn.dataset.startBooking)));
};

/* ---------- 2. Live card preview ---------- */
function cardPreviewHtml() {
  return `
    <div class="cc" id="ccPreview" aria-hidden="true">
      <div class="cc-inner">
        <div class="cc-face cc-front">
          <div class="cc-top"><span class="cc-chip"></span><em class="cc-brand" id="ccBrand"></em></div>
          <p class="cc-num" id="ccNum">•••• •••• •••• ••••</p>
          <div class="cc-bottom">
            <span><small>Card holder</small><b id="ccName">Your name</b></span>
            <span><small>Expires</small><b id="ccExp">MM/YY</b></span>
          </div>
        </div>
        <div class="cc-face cc-back">
          <span class="cc-strip"></span>
          <div class="cc-sig"><span></span><b id="ccCvc">•••</b></div>
          <small>The 3 digits on the back of your card</small>
        </div>
      </div>
    </div>`;
}

function syncCard() {
  const form = document.getElementById("payForm");
  if (!form || !document.getElementById("ccPreview")) return;
  const digits = form.card.value.replace(/\D/g, "");
  const masked = (digits + "•".repeat(16 - Math.min(16, digits.length))).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  document.getElementById("ccNum").textContent = masked;
  document.getElementById("ccName").textContent = form.name.value.trim() || "Your name";
  document.getElementById("ccExp").textContent = form.exp.value || "MM/YY";
  document.getElementById("ccCvc").textContent = form.cvc.value ? "•".repeat(form.cvc.value.length) : "•••";
  const brand = cardBrand(digits);
  document.getElementById("ccBrand").textContent = brand;
  document.getElementById("ccPreview").dataset.brand = brand.toLowerCase();
}

const baseRenderBooking = renderBooking;
renderBooking = function renderBookingEnhanced() {
  baseRenderBooking();
  const form = document.getElementById("payForm");
  if (form && !document.getElementById("ccPreview")) {
    form.insertAdjacentHTML("afterbegin", cardPreviewHtml());
    syncCard();
  }
};

document.addEventListener("input", (e) => { if (e.target.closest("#payForm")) syncCard(); });
document.addEventListener("focusin", (e) => {
  const cc = document.getElementById("ccPreview");
  if (cc && e.target.closest("#payForm")) cc.classList.toggle("is-flipped", e.target.name === "cvc");
});

/* ---------- 3. Split auth layout ---------- */
function authPromoHtml() {
  const next = upcomingEvents().find((e) => e.quota > e.registered);
  if (!next) return "";
  const m = metaFor(next);
  const fc = cardFor(next);
  return `
    <aside class="auth-promo" aria-label="Next fight night">
      <p class="home-kicker">${ic("flame")}Next fight night</p>
      <h2>${next.name}</h2>
      <p class="auth-promo-match">${fc.red.name} <span>vs</span> ${fc.blue.name}</p>
      <p class="home-sub">${ic("pin")}${m.venue}, ${m.city}</p>
      ${countdownHtml(m.date)}
      <ul class="auth-perks">
        <li>${ic("seat")}Pick your exact seats around the Octagon</li>
        <li>${ic("ticket")}QR tickets on your phone</li>
        <li>${ic("shield")}Full refund up to 7 days before</li>
      </ul>
    </aside>`;
}

const baseNavigate = navigate;
navigate = function navigateEnhanced(screen) {
  baseNavigate(screen);
  const split = ["login", "register"].includes(screen);
  document.body.classList.toggle("auth-split", split);
  if (split) {
    const layout = document.querySelector(`#screen-${screen} .auth-layout`);
    layout.querySelector(".auth-promo")?.remove();
    layout.insertAdjacentHTML("beforeend", authPromoHtml());
  }
};

render();
