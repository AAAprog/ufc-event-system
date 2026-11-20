// Admin pages: sign-in guard, KPIs in SAR, manage events and members tables.

const ADMIN_SCREENS = ["adminDashboard", "manageEvents", "manageUsers"];
let eventSearch = "";

const navigateAdminBase = navigate;
navigate = function navigateAdmin(screen) {
  if (ADMIN_SCREENS.includes(screen) && !state.adminSignedIn) {
    showToast("Sign in as staff to open the admin pages.");
    screen = "adminLogin";
  } else if (screen === "adminLogin" && state.adminSignedIn) {
    screen = "adminDashboard";
  }
  navigateAdminBase(screen);
};

/* ---------- Dashboard KPIs ---------- */
const renderAdminKpiBase = renderAdmin;
renderAdmin = function renderAdminKpis() {
  renderAdminKpiBase();
  const revenue = state.users.reduce((s, u) => s + (u.registeredEvent && u.total ? u.total : 0), 0);
  const paid = state.users.filter((u) => u.registeredEvent && u.total).length;
  const sold = state.events.reduce((s, e) => s + e.registered, 0);
  const cap = state.events.reduce((s, e) => s + e.quota, 0);
  const booked = state.users.filter((u) => u.registeredEvent).length;
  document.getElementById("adminUsers").textContent = sar(revenue);
  document.getElementById("kpiRevenueSub").textContent = `${paid} paid ${paid === 1 ? "order" : "orders"}`;
  document.getElementById("adminBooked").textContent = sold.toLocaleString("en-US");
  document.getElementById("kpiSoldSub").textContent = `of ${cap.toLocaleString("en-US")} seats`;
  document.getElementById("adminEvents").textContent = state.users.length;
  document.getElementById("kpiMembersSub").textContent = `${booked} with a booking`;
  document.getElementById("adminSeats").textContent = totalSeatsLeft().toLocaleString("en-US");
  document.getElementById("kpiSeatsSub").textContent = `across ${state.events.length} events`;
};

/* ---------- Manage events + members tables ---------- */
function toLocalInput(iso) { return iso ? iso.slice(0, 16) : ""; }

renderTables = function renderAdminTables() {
  const q = eventSearch.trim().toLowerCase();
  const events = [...state.events]
    .filter((e) => !q || `${e.name} ${infoFor(e).city} ${infoFor(e).venue}`.toLowerCase().includes(q))
    .sort((a, b) => (infoFor(a).date || "9").localeCompare(infoFor(b).date || "9"));

  document.getElementById("eventsTable").innerHTML = events.map((e) => {
    const info = infoFor(e);
    const pct = e.quota ? Math.round((e.registered / e.quota) * 100) : 0;
    const left = Math.max(e.quota - e.registered, 0);
    const status = left === 0 ? ["Sold out", "is-full"] : left <= 10 ? ["Low seats", "low"] : ["On sale", ""];
    return `
      <tr>
        <td>
          <input class="table-input" value="${e.name}" data-event-name="${e.id}" aria-label="Event name">
          <small class="cell-sub">${info.venue}${info.city ? `, ${info.city}` : ""}</small>
        </td>
        <td><input class="table-input" type="datetime-local" value="${toLocalInput(info.date)}" data-event-date="${e.id}" aria-label="Date for ${e.name}"></td>
        <td><input class="table-input number" type="number" min="1" value="${info.price || ""}" data-event-price="${e.id}" aria-label="Starting price for ${e.name}"></td>
        <td><input class="table-input number" type="number" min="${e.registered}" value="${e.quota}" data-event-quota="${e.id}" aria-label="Capacity for ${e.name}"></td>
        <td class="sold-cell"><b>${e.registered}</b><span class="mini-bar"><i style="width:${pct}%"></i></span><small>${pct}%</small></td>
        <td><span class="chip ${status[1]}">${status[0]}</span></td>
        <td><button class="small-danger" data-delete-event="${e.id}" type="button">Delete</button></td>
      </tr>`;
  }).join("") || `<tr><td colspan="7">No events match your search.</td></tr>`;
  document.getElementById("eventCountAdmin").textContent = `${events.length} of ${state.events.length} events`;

  const uq = userSearchQuery.trim().toLowerCase();
  const users = state.users.filter((u) => {
    const booked = eventById(u.registeredEvent);
    return !uq || [u.username, u.email, u.nationality, booked?.name || ""].some((v) => v.toLowerCase().includes(uq));
  });
  document.getElementById("usersTable").innerHTML = users.map((u) => {
    const booked = eventById(u.registeredEvent);
    return `
      <tr>
        <td><div class="member-cell"><span class="avatar" aria-hidden="true">${u.username.slice(0, 2).toUpperCase()}</span><span><b>${u.username}</b><small class="cell-sub">${u.email}</small></span></div></td>
        <td>${u.nationality}</td>
        <td>${booked ? `${booked.name}<small class="cell-sub">${eventMeta(booked)}</small>` : `<span class="cell-sub">No booking</span>`}</td>
        <td>${booked && u.seats?.length ? `${u.tierName || ""} · ${u.seats.join(", ")}` : booked ? "1 seat" : "—"}</td>
        <td>${booked && u.total ? sar(u.total, 2) : "—"}</td>
        <td><button class="small-danger" data-delete-user="${u.id}" type="button">Delete</button></td>
      </tr>`;
  }).join("") || `<tr><td colspan="6">No members match your search.</td></tr>`;
  document.getElementById("userCountAdmin").textContent = `${users.length} of ${state.users.length} members`;
};

/* Event search + count above the events table */
document.querySelector("#screen-manageEvents .table-card").insertAdjacentHTML("beforebegin", `
  <div class="table-tools">
    <input type="search" id="eventSearchAdmin" placeholder="Search events, cities or venues" aria-label="Search events">
    <span class="event-count" id="eventCountAdmin"></span>
  </div>`);
document.querySelector("#screen-manageUsers .table-card").insertAdjacentHTML("beforebegin", `<p class="event-count" id="userCountAdmin"></p>`);
document.getElementById("eventSearchAdmin").addEventListener("input", (e) => { eventSearch = e.target.value; renderTables(); });

/* Inline edits for date and price (name and capacity are handled in app.js) */
function editInfo(id, change) {
  const ev = eventById(id);
  ev.info = { ...infoFor(ev), ...change };
  saveState();
  renderHome();
  renderBooking();
  renderAdmin();
}
document.addEventListener("change", (e) => {
  const date = e.target.closest("[data-event-date]");
  if (date && date.value) editInfo(Number(date.dataset.eventDate), { date: date.value });
  const price = e.target.closest("[data-event-price]");
  if (price) {
    const v = Math.floor(Number(price.value));
    if (v >= 1) editInfo(Number(price.dataset.eventPrice), { price: v });
    else { showToast("Price must be at least SAR 1."); price.value = infoFor(eventById(Number(price.dataset.eventPrice))).price; }
  }
  const quota = e.target.closest("[data-event-quota]");
  if (quota) {
    const ev = eventById(Number(quota.dataset.eventQuota));
    if (Number(quota.value) < ev.registered) showToast(`Capacity can't go below the ${ev.registered} seats already sold.`);
    renderTables();
  }
});

/* Save button now just confirms (edits save as you type) */
document.getElementById("saveEventChanges").textContent = "Save changes";

render();

// Error messages get a red style instead of the green check.
const showToastBase = showToast;
showToast = function showToastTyped(message) {
  showToastBase(message);
  const isError = /incorrect|not found|can't|cannot|must|needs|invalid|doesn't|already exists|only \d|sold out|expired|pick a date|give the event|don't match|do not match|sign in as staff/i.test(message);
  document.getElementById("toast").classList.toggle("is-error", isError);
};
