// Seat selection v2, modelled on the patterns large ticketing sites use:
// quantity first, a map coloured by price, best-available picks, a section list synced with the map,
// a view-from-seat preview and curved rows that face the Octagon.
// Overrides octagonSvg(), seatGrid() and stepSeats() from booking.js.

flow.want = 2;          // how many seats together
flow.filter = "all";    // tier filter
flow.sort = "best";     // "best" | "price"
flow.mobileView = "map";

const ACCESS_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v6h5l2 5M12 10h4M9 10.5a5.5 5.5 0 1 0 6.2 7.5"/></svg>`;
const TIER_ORDER = ["cage", "floor", "lower", "upper"];
// Sides facing the cameras (long axis) give the straightest view.
const SIDE_VIEW = [0.8, 1, 0.8, 0.65, 0.8, 1, 0.8, 0.65];

function rowFree(event, tier, side, r) {
  const cols = SEAT_GRID[tier][1];
  const row = String.fromCharCode(65 + r);
  return Array.from({ length: cols }, (_, i) => !isSold(event, tier, side, `${row}${i + 1}`));
}

// Best block of `want` adjacent seats: closest row to the cage, then nearest the centre.
function bestBlock(event, tier, side, want) {
  const [rows, cols] = SEAT_GRID[tier];
  const mid = (cols + 1) / 2;
  let best = null;
  for (let r = 0; r < rows; r += 1) {
    const free = rowFree(event, tier, side, r);
    for (let start = 0; start + want <= cols; start += 1) {
      // Don't let a block cross the centre aisle.
      const half = Math.ceil(cols / 2);
      if (start < half && start + want > half) continue;
      if (!free.slice(start, start + want).every(Boolean)) continue;
      const centre = start + (want + 1) / 2;
      const score = r * 10 + Math.abs(centre - mid);
      if (!best || score < best.score) {
        const row = String.fromCharCode(65 + r);
        best = { score, seats: Array.from({ length: want }, (_, i) => `${row}${start + i + 1}`) };
      }
    }
  }
  return best ? best.seats : null;
}

function viewScore(tier, side, seats) {
  const ring = { cage: 1, floor: 0.88, lower: 0.74, upper: 0.55 }[tier];
  const rowPenalty = seats ? (seats[0].charCodeAt(0) - 65) * 0.03 : 0;
  return Math.max(0.2, Math.min(1, ring * SIDE_VIEW[side] + 0.12 - rowPenalty));
}

function sectionOptions(event) {
  const list = [];
  TIER_ORDER.forEach((tier) => {
    if (flow.filter !== "all" && flow.filter !== tier) return;
    for (let side = 0; side < 8; side += 1) {
      const seats = bestBlock(event, tier, side, flow.want);
      if (!seats) continue;
      list.push({ tier, side, seats, price: priceFor(event, tier), view: viewScore(tier, side, seats) });
    }
  });
  const bestValue = list.reduce((acc, o) => (o.view / o.price > (acc?.view / acc?.price || 0) ? o : acc), null);
  list.forEach((o) => { o.deal = o === bestValue; });
  return list.sort((a, b) => flow.sort === "price" ? a.price - b.price || b.view - a.view : b.view - a.view || a.price - b.price);
}

/* ---------- Map ---------- */
function octagonSvg(event) {
  const pt = (r, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(160 + r * Math.cos(a)).toFixed(1)},${(160 + r * Math.sin(a)).toFixed(1)}`;
  };
  const oct = (r) => Array.from({ length: 8 }, (_, i) => pt(r, i)).join(" ");
  const segs = Object.entries(RINGS).map(([tier, [ro, ri]]) => Array.from({ length: 8 }, (_, side) => {
    const fits = Boolean(bestBlock(event, tier, side, flow.want));
    const filtered = flow.filter !== "all" && flow.filter !== tier;
    const on = flow.tier === tier && flow.side === side;
    const code = sectionCode(tier, side);
    const label = `Section ${code}, ${TIERS.find((t) => t.id === tier).name}, ${money(priceFor(event, tier))}${fits ? "" : `, no ${flow.want} seats together`}`;
    return `<polygon class="bk-seg bk-seg--${tier} ${on ? "is-on" : ""} ${fits ? "" : "is-out"} ${filtered ? "is-filtered" : ""}"
      data-tier="${tier}" data-side="${side}" points="${pt(ro, side)} ${pt(ro, side + 1)} ${pt(ri, side + 1)} ${pt(ri, side)}"
      tabindex="${fits && !filtered ? 0 : -1}" role="button" aria-pressed="${on}" aria-label="${label}"></polygon>`;
  }).join("")).join("");
  const labels = Array.from({ length: 8 }, (_, side) => {
    const a = Math.PI / 8 + ((side + 0.5) * Math.PI) / 4;
    return `<text class="bk-map-side" x="${(160 + 162 * Math.cos(a)).toFixed(1)}" y="${(163 + 162 * Math.sin(a)).toFixed(1)}" text-anchor="middle">${side + 1}</text>`;
  }).join("");
  return `
    <div class="bk-map-wrap">
      <svg class="bk-map ${flow.side !== null ? "has-pick" : ""}" viewBox="-14 -14 348 348" role="group" aria-label="Arena map. Sections are coloured by price.">
        ${segs}
        <polygon class="bk-cage" points="${oct(30)}"></polygon>
        <text x="160" y="164" text-anchor="middle">OCTAGON</text>
        ${labels}
      </svg>
      <div class="bk-tip" id="seatTip" role="tooltip" hidden></div>
    </div>`;
}

/* ---------- View from seat (illustrative) ---------- */
function viewSvg(tier, side) {
  const dist = { cage: 0, floor: 1, lower: 2, upper: 3 }[tier];
  const scale = [1, 0.78, 0.6, 0.45][dist];
  const height = [0, 10, 28, 48][dist];
  const skew = [0, 0.18, 0, -0.18, 0, 0.18, 0, -0.18][side] * 60;
  const cx = 200 + skew;
  const cy = 130 + height * 0.6;
  const w = 170 * scale;
  const h = 60 * scale * (1 + dist * 0.25);
  const oct = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [cx + w * Math.cos(a), cy + h * Math.sin(a)];
  });
  const posts = oct.map(([x, y]) => `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - 46 * scale).toFixed(1)}"/>`).join("");
  const top = oct.map(([x, y]) => `${x.toFixed(1)},${(y - 46 * scale).toFixed(1)}`).join(" ");
  const base = oct.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const crowd = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 12.3) % 400;
    const y = 214 + ((i * 7) % 3) * 6;
    return `<circle cx="${x.toFixed(1)}" cy="${y}" r="9"/>`;
  }).join("");
  return `
    <svg class="bk-pov" viewBox="0 0 400 230" role="img" aria-label="Illustrated view from ${TIERS.find((t) => t.id === tier).name}">
      <defs>
        <radialGradient id="bkSpot" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#fff6d6" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <linearGradient id="bkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140b0f"/><stop offset="1" stop-color="#2a1218"/></linearGradient>
      </defs>
      <rect width="400" height="230" fill="url(#bkSky)"/>
      <ellipse cx="${cx}" cy="${cy - 20 * scale}" rx="${w * 1.6}" ry="${h * 2.2}" fill="url(#bkSpot)"/>
      <polygon points="${base}" class="bk-view-mat"/>
      <circle cx="${cx}" cy="${cy}" r="${10 * scale}" class="bk-view-logo"/>
      <g class="bk-view-fence">${posts}<polygon points="${top}"/></g>
      <g class="bk-view-crowd">${crowd}</g>
    </svg>`;
}

/* ---------- Seats ---------- */
function seatGrid(event) {
  if (flow.side === null) {
    return `<div class="bk-seat-empty">${ic("pin")}<p>Pick a section on the map or from the list.<br>We'll suggest the best ${flow.want} seats together.</p></div>`;
  }
  const tier = flow.tier;
  const [rows, cols] = SEAT_GRID[tier];
  const mid = (cols + 1) / 2;
  let html = "";
  for (let r = 0; r < rows; r += 1) {
    const row = String.fromCharCode(65 + r);
    let seats = "";
    for (let c = 1; c <= cols; c += 1) {
      const id = `${row}${c}`;
      const sold = isSold(event, tier, flow.side, id);
      const on = flow.seats.includes(id);
      const access = r === 0 && (c === 1 || c === cols);
      const curve = ((c - mid) ** 2) * (10 / (mid * mid));
      seats += `<button type="button" class="bk-seat ${on ? "is-on" : ""} ${access ? "is-access" : ""}" style="--curve:${curve.toFixed(1)}px" data-seat="${id}" ${sold ? "disabled" : ""}
        aria-pressed="${on}" aria-label="Row ${row}, seat ${c}${access ? ", wheelchair accessible" : ""}${sold ? ", taken" : ""}">${on ? c : access ? ACCESS_ICON : ""}</button>`;
      if (c === Math.ceil(cols / 2)) seats += `<span class="bk-aisle" aria-hidden="true"></span>`;
    }
    html += `<div class="bk-seat-row"><span class="bk-row-label">${row}</span>${seats}<span class="bk-row-label">${row}</span></div>`;
  }
  const score = viewScore(tier, flow.side, flow.seats.length ? flow.seats : null);
  return `
    <div class="bk-sec-detail">
      <figure class="bk-view-card">
        ${viewSvg(tier, flow.side)}
        <figcaption><b>Section ${sectionCode(tier, flow.side)}</b> · approximate view
          <span class="bk-score" style="--s:${Math.round(score * 100)}%">View ${Math.round(score * 10)}/10</span></figcaption>
      </figure>
      <div class="bk-sec-seats">
        <div class="bk-seat-head">
          <div><b>${TIERS.find((t) => t.id === tier).name}</b><small>${SIDE_NAMES[flow.side]} side · ${money(priceFor(event, tier))} each</small></div>
          ${flow.seats.length ? `<button type="button" class="bk-clear" data-clear-seats>Clear</button>` : ""}
        </div>
        <div class="bk-cage-edge">${ic("arrow", "bk-up")}Octagon this way</div>
        <div class="bk-seats" role="group" aria-label="Seats in section ${sectionCode(tier, flow.side)}">${html}</div>
        <ul class="bk-legend">
          <li><i class="bk-seat"></i>Available</li>
          <li><i class="bk-seat is-on"></i>Your pick</li>
          <li><i class="bk-seat" data-sold></i>Taken</li>
          <li><i class="bk-seat is-access">${ACCESS_ICON}</i>Accessible</li>
        </ul>
      </div>
    </div>`;
}

function sectionList(event) {
  const opts = sectionOptions(event);
  if (!opts.length) {
    return `<div class="bk-seat-empty">${ic("seat")}<p>No ${flow.want} seats together in this price range.<br>Try fewer tickets or another tier.</p></div>`;
  }
  return opts.map((o) => {
    const on = flow.tier === o.tier && flow.side === o.side;
    return `
      <button type="button" class="bk-opt ${on ? "is-on" : ""}" data-opt="${o.tier}:${o.side}">
        <span class="bk-swatch bk-swatch--${o.tier}">${ic(TIER_ICONS[o.tier])}</span>
        <span class="bk-opt-main">
          <b>Section ${sectionCode(o.tier, o.side)} · Row ${o.seats[0][0]}</b>
          <small>${TIERS.find((t) => t.id === o.tier).name} · ${SIDE_NAMES[o.side]}</small>
          <span class="bk-score" style="--s:${Math.round(o.view * 100)}%">View ${Math.round(o.view * 10)}/10</span>
        </span>
        <span class="bk-opt-price">
          ${o.deal ? `<em class="bk-deal">${ic("flame")}Best value</em>` : ""}
          <b>${money(o.price)}</b><small>each</small>
        </span>
      </button>`;
  }).join("");
}

function stepSeats() {
  const event = eventById(flow.eventId);
  const chips = [["all", "All prices"], ...TIER_ORDER.map((t) => [t, `${TIERS.find((x) => x.id === t).name} ${money(priceFor(event, t)).replace(".00", "")}`])]
    .map(([id, label]) => `<button type="button" class="bk-chip-btn ${flow.filter === id ? "is-on" : ""}" data-filter="${id}" aria-pressed="${flow.filter === id}">
      ${id === "all" ? "" : `<i class="bk-dot bk-swatch--${id}"></i>`}${label}</button>`).join("");
  const picked = flow.seats.length
    ? `<p class="bk-picked">${ic("seat")}<span>Section ${sectionCode(flow.tier, flow.side)} · Row ${[...new Set(flow.seats.map((x) => x[0]))].join(", ")} · Seat ${flow.seats.map((x) => x.slice(1)).join(", ")}</span></p>`
    : `<p class="bk-picked is-empty">${ic("seat")}<span>No seats picked yet.</span></p>`;
  return `
    <header class="bk-head"><button class="bk-back" type="button" data-step-to="1">${ic("back")}Back to events</button><h1>${event.name}</h1><p>Tell us how many seats you need. We'll show the sections that can seat you together.</p></header>
    <div class="bk-toolbar app-card">
      <div class="bk-want">
        <span>Tickets</span>
        <div class="bk-stepper">
          <button type="button" data-want="-1" aria-label="Fewer tickets" ${flow.want <= 1 ? "disabled" : ""}>${ic("minus")}</button>
          <output aria-live="polite">${flow.want}</output>
          <button type="button" data-want="1" aria-label="More tickets" ${flow.want >= 6 ? "disabled" : ""}>${ic("plus")}</button>
        </div>
      </div>
      <div class="bk-chips" role="group" aria-label="Filter by price">${chips}</div>
      <button type="button" class="btn bk-best" data-best>${ic("trophy")}Best available</button>
    </div>
    <div class="bk-mtoggle" role="tablist">
      <button type="button" role="tab" data-mview="map" aria-selected="${flow.mobileView === "map"}">${ic("pin")}Map</button>
      <button type="button" role="tab" data-mview="list" aria-selected="${flow.mobileView === "list"}">${ic("ticket")}List</button>
    </div>
    <div class="bk-grid">
      <section class="app-card bk-pane">
        <div class="bk-explorer" data-mview-active="${flow.mobileView}">
          <div class="bk-explorer-map">${octagonSvg(event)}</div>
          <div class="bk-explorer-list">
            <div class="bk-list-head"><span>${sectionOptions(event).length} sections fit ${flow.want}</span>
              <label class="bk-sort">Sort <select data-sort>
                <option value="best" ${flow.sort === "best" ? "selected" : ""}>Best view</option>
                <option value="price" ${flow.sort === "price" ? "selected" : ""}>Lowest price</option>
              </select></label>
            </div>
            <div class="bk-opts">${sectionList(event)}</div>
          </div>
        </div>
        <div class="bk-seatpane">${seatGrid(event)}</div>
      </section>
      <div class="bk-side">
        ${summaryCard(flow.seats.length > 0)}
        ${picked}
        <button class="btn bk-wide" type="button" data-step-to="3" ${flow.seats.length ? "" : "disabled"}>${ic("lock")}Continue to payment${ic("arrow")}</button>
      </div>
    </div>`;
}

/* ---------- Interactions ---------- */
function pickBlock(tier, side) {
  const event = eventById(flow.eventId);
  const seats = bestBlock(event, tier, side, flow.want);
  flow.tier = tier;
  flow.side = side;
  flow.seats = seats || [];
  flow.qty = flow.seats.length;
  renderBooking();
  bumpTotals();
  document.querySelector(".bk-seatpane")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
}

// Section clicks pick the best block straight away (replaces booking.js selectSection).
function selectSection(tier, side) { pickBlock(tier, side); }

document.addEventListener("click", (e) => {
  const want = e.target.closest("[data-want]");
  if (want) {
    flow.want = Math.max(1, Math.min(6, flow.want + Number(want.dataset.want)));
    if (flow.side !== null) {
      const seats = bestBlock(eventById(flow.eventId), flow.tier, flow.side, flow.want);
      flow.seats = seats || [];
      flow.qty = flow.seats.length;
      if (!seats) showToast(`Section ${sectionCode(flow.tier, flow.side)} has no ${flow.want} seats together. Pick another section.`);
    }
    renderBooking();
    bumpTotals();
    return;
  }
  const filter = e.target.closest("[data-filter]");
  if (filter) { flow.filter = filter.dataset.filter; renderBooking(); return; }
  const opt = e.target.closest("[data-opt]");
  if (opt) { const [t, s] = opt.dataset.opt.split(":"); pickBlock(t, Number(s)); return; }
  const mview = e.target.closest("[data-mview]");
  if (mview) { flow.mobileView = mview.dataset.mview; renderBooking(); return; }
  if (e.target.closest("[data-best]")) {
    const top = sectionOptions(eventById(flow.eventId)).sort((a, b) => b.view - a.view)[0];
    if (top) { pickBlock(top.tier, top.side); showToast(`Best available: Section ${sectionCode(top.tier, top.side)}, row ${top.seats[0][0]}.`); }
    else showToast(`No ${flow.want} seats together right now. Try fewer tickets.`);
  }
});

document.addEventListener("change", (e) => {
  if (e.target.matches("[data-sort]")) { flow.sort = e.target.value; renderBooking(); }
});

// Hover / focus tooltip for map sections.
function showTip(seg) {
  const tip = document.getElementById("seatTip");
  if (!tip || !seg) return;
  const event = eventById(flow.eventId);
  const { tier } = seg.dataset;
  const side = Number(seg.dataset.side);
  const block = bestBlock(event, tier, side, flow.want);
  tip.innerHTML = `<b>Section ${sectionCode(tier, side)}</b><span>${TIERS.find((t) => t.id === tier).name} · ${money(priceFor(event, tier))}</span>
    <small>${block ? `${sectionFree(event, tier, side)} free · best row ${block[0][0]}` : `No ${flow.want} seats together`}</small>`;
  const wrap = seg.closest(".bk-map-wrap").getBoundingClientRect();
  const box = seg.getBoundingClientRect();
  tip.style.left = `${box.left - wrap.left + box.width / 2}px`;
  tip.style.top = `${box.top - wrap.top}px`;
  tip.hidden = false;
}
document.addEventListener("mouseover", (e) => { const seg = e.target.closest?.(".bk-seg"); if (seg) showTip(seg); });
document.addEventListener("focusin", (e) => { const seg = e.target.closest?.(".bk-seg"); if (seg) showTip(seg); });
document.addEventListener("mouseout", (e) => {
  if (e.target.closest?.(".bk-seg")) { const tip = document.getElementById("seatTip"); if (tip) tip.hidden = true; }
});

renderBooking();
