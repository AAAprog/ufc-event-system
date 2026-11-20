const storageKey = "ufc-event-system-state";

// The preview persists interactions locally so each flow can be explored end to end.
const defaultState = {
  currentUserId: 1,
  users: [
    {
      id: 1,
      username: "ahmed_member",
      email: "member@example.com",
      password: "member123",
      nationality: "Saudi Arabia",
      gender: "Male",
      registeredEvent: null
    },
    { id: 2, username: "sara_k", email: "sara@example.com", password: "member123", nationality: "United Arab Emirates", gender: "Female", registeredEvent: 1, bookedAt: "2026-11-18T19:12:00" },
    { id: 3, username: "omar.q", email: "omar@example.com", password: "member123", nationality: "Kuwait", gender: "Male", registeredEvent: 4, bookedAt: "2026-11-19T10:40:00" },
    { id: 4, username: "lina_m", email: "lina@example.com", password: "member123", nationality: "Jordan", gender: "Female", registeredEvent: 3, bookedAt: "2026-11-19T21:05:00" }
  ],
  events: [
    { id: 1, name: "Main Card VIP", quota: 150, registered: 64 },
    { id: 2, name: "Heavyweight Showcase", quota: 120, registered: 78 },
    { id: 3, name: "Lightweight Contenders", quota: 100, registered: 92 },
    { id: 4, name: "Riyadh Fight Night", quota: 200, registered: 141 },
    { id: 5, name: "Welterweight Clash", quota: 140, registered: 37 },
    { id: 6, name: "Doha Showdown", quota: 160, registered: 158 },
    { id: 7, name: "Bantamweight Rising", quota: 90, registered: 21 },
    { id: 8, name: "Kuwait Combat Night", quota: 120, registered: 66 },
    { id: 9, name: "Jeddah Title Night", quota: 220, registered: 120 }
  ],
  seed: 2
};

const nationalities = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bahrain", "Bangladesh", "Belgium", "Brazil", "Bulgaria", "Canada",
  "Chile", "China", "Colombia", "Croatia", "Czech Republic", "Denmark",
  "Egypt", "Finland", "France", "Germany", "Greece", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Italy", "Japan", "Jordan",
  "Kuwait", "Lebanon", "Libya", "Malaysia", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman", "Pakistan",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Saudi Arabia", "Serbia", "Singapore", "South Africa", "South Korea",
  "Spain", "Sweden", "Switzerland", "Syria", "Thailand", "Tunisia",
  "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Vietnam", "Yemen"
];

let state = loadState();
let userSearchQuery = "";
let pendingDeletion = null;

state.users = state.users.map((user) => ({
  password: "member123",
  ...user
}));

function populateNationalityMenus() {
  document.querySelectorAll("[data-nationality-select]").forEach((select) => {
    const currentValue = select.value || "Saudi Arabia";
    select.innerHTML = `<option value="">Select your nationality</option>` +
      nationalities.map((nationality) => `<option value="${nationality}">${nationality}</option>`).join("");
    select.value = currentValue;
  });
}

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    const savedState = JSON.parse(saved);

    if (!Array.isArray(savedState.events) || savedState.events.length === 0) {
      savedState.events = structuredClone(defaultState.events);
    }

    // One-time upgrade: add the newer sample events and members to older saved demos.
    if ((savedState.seed || 1) < defaultState.seed) {
      const haveEvents = new Set(savedState.events.map((e) => e.id));
      defaultState.events.forEach((e) => { if (!haveEvents.has(e.id)) savedState.events.push(structuredClone(e)); });
      const haveUsers = new Set((savedState.users || []).map((u) => u.id));
      defaultState.users.forEach((u) => { if (!haveUsers.has(u.id)) savedState.users.push(structuredClone(u)); });
      savedState.seed = defaultState.seed;
    }

    return savedState;
  } catch {
    localStorage.removeItem(storageKey);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  document.body.classList.add("toast-open");
  toast.classList.add("is-visible");
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    document.body.classList.remove("toast-open");
  }, 2200);
}

function openDeleteDialog(deletion) {
  pendingDeletion = deletion;
  const dialog = document.getElementById("confirmDialog");
  document.getElementById("confirmDialogTitle").textContent = `Delete ${deletion.label}?`;
  document.getElementById("confirmDialogMessage").textContent = deletion.message;
  dialog.classList.add("is-open");
  dialog.setAttribute("aria-hidden", "false");
  document.getElementById("confirmDelete").focus();
}

function closeDeleteDialog() {
  pendingDeletion = null;
  const dialog = document.getElementById("confirmDialog");
  dialog.classList.remove("is-open");
  dialog.setAttribute("aria-hidden", "true");
}

function deleteEvent(eventId) {
  state.events = state.events.filter((item) => item.id !== eventId);
  state.users = state.users.map((user) => user.registeredEvent === eventId ? { ...user, registeredEvent: null } : user);
  saveState();
  render();
  showToast("Event deleted.");
}

function cancelBooking() {
  const user = currentUser();
  const ev = eventById(user.registeredEvent);
  if (ev) ev.registered = Math.max(ev.registered - (user.seats?.length || 1), 0);
  user.registeredEvent = null;
  user.bookedAt = null;
  user.seats = [];
  user.total = 0;
  saveState();
  render();
  showToast("Booking cancelled. Your seat is released.");
}

function deleteUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  const bookedEvent = user ? eventById(user.registeredEvent) : null;
  if (bookedEvent) bookedEvent.registered = Math.max(bookedEvent.registered - 1, 0);
  state.users = state.users.filter((item) => item.id !== userId);
  if (state.currentUserId === userId) {
    state.currentUserId = state.users[0]?.id || null;
  }
  saveState();
  render();
  showToast("User deleted.");
}
function navigate(screen) {
  document.querySelectorAll(".screen").forEach((item) => {
    item.classList.toggle("is-active", item.id === `screen-${screen}`);
  });

  document.querySelectorAll(".nav-trigger").forEach((item) => {
    const isMemberFlow = item.dataset.screen === "login" && screen === "register";
    item.classList.toggle("is-active", item.dataset.screen === screen || isMemberFlow);
  });

  document.body.classList.toggle(
    "auth-screen",
    ["login", "register", "profile", "adminLogin"].includes(screen)
  );

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || state.users[0] || {
    id: null,
    username: "Member",
    email: "No account selected",
    password: "member123",
    nationality: "Saudi Arabia",
    gender: "Male",
    registeredEvent: null
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function eventById(id) {
  return state.events.find((event) => event.id === id);
}

function totalSeatsLeft() {
  return state.events.reduce((sum, event) => sum + Math.max(event.quota - event.registered, 0), 0);
}

function statusFor(event) {
  const left = Math.max(event.quota - event.registered, 0);
  if (left === 0) return "Full";
  if (left <= 10) return "Low Seats";
  return "Open";
}

// Display details for each event (date, venue, starting price).
const EVENT_INFO = {
  1: { date: "2026-12-12T20:00", venue: "Etihad Arena", city: "Abu Dhabi", price: 120 },
  2: { date: "2027-01-23T21:00", venue: "Kingdom Arena", city: "Riyadh", price: 95 },
  3: { date: "2027-02-20T19:30", venue: "Coca-Cola Arena", city: "Dubai", price: 70 },
  4: { date: "2026-12-19T21:00", venue: "Kingdom Arena", city: "Riyadh", price: 110 },
  5: { date: "2027-01-09T20:30", venue: "Etihad Arena", city: "Abu Dhabi", price: 85 },
  6: { date: "2027-01-30T20:00", venue: "Lusail Sports Arena", city: "Doha", price: 90 },
  7: { date: "2027-02-06T19:00", venue: "Coca-Cola Arena", city: "Dubai", price: 60 },
  8: { date: "2027-03-06T20:00", venue: "Sheikh Jaber Al-Ahmad Arena", city: "Kuwait City", price: 75 },
  9: { date: "2027-03-27T21:00", venue: "Jeddah Superdome", city: "Jeddah", price: 130 }
};

// Events page filters
const eventFilter = { city: "All", query: "", sort: "date" };

function visibleEvents() {
  const q = eventFilter.query.trim().toLowerCase();
  const list = state.events.filter((e) => {
    const info = infoFor(e);
    if (eventFilter.city !== "All" && info.city !== eventFilter.city) return false;
    return !q || `${e.name} ${info.venue} ${info.city}`.toLowerCase().includes(q);
  });
  const left = (e) => Math.max(e.quota - e.registered, 0);
  const by = {
    date: (a, b) => (infoFor(a).date || "9").localeCompare(infoFor(b).date || "9"),
    price: (a, b) => (infoFor(a).price ?? 1e9) - (infoFor(b).price ?? 1e9),
    seats: (a, b) => left(a) - left(b)
  };
  return list.sort(by[eventFilter.sort]);
}

function infoFor(event) {
  return EVENT_INFO[event.id] || { date: "", venue: "Venue to be announced", city: "", price: null };
}

function eventMeta(event) {
  const info = infoFor(event);
  const when = info.date
    ? new Date(info.date).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Date to be announced";
  return `${when} · ${info.venue}${info.city ? `, ${info.city}` : ""}`;
}

function seatLine(event) {
  const left = Math.max(event.quota - event.registered, 0);
  const price = infoFor(event).price;
  return `${left === 0 ? "Sold out" : `${left} seats left`}${price ? ` · From $${price}` : ""}`;
}

// Line icons (Lucide, ISC license), inlined.
const ICON_PATHS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  seat: '<path d="M7 18v3M17 18v3M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>'
};
function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;
}

function dateTile(event) {
  const d = infoFor(event).date;
  if (!d) return `<div class="date-tile"><b>TBA</b></div>`;
  const dt = new Date(d);
  return `<div class="date-tile" aria-hidden="true"><b>${dt.toLocaleDateString("en-GB", { day: "2-digit" })}</b><span>${dt.toLocaleDateString("en-GB", { month: "short" })}</span></div>`;
}

function eventDetails(event) {
  const info = infoFor(event);
  const left = Math.max(event.quota - event.registered, 0);
  const pct = event.quota ? Math.round((event.registered / event.quota) * 100) : 0;
  const when = info.date ? new Date(info.date).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Date to be announced";
  return `
    <div class="event-body">
      <h3>${event.name}</h3>
      <ul class="event-facts">
        <li>${icon("calendar")}${when}</li>
        <li>${icon("pin")}${info.venue}${info.city ? `, ${info.city}` : ""}</li>
        ${info.price ? `<li>${icon("tag")}From $${info.price}</li>` : ""}
      </ul>
      <div class="seat-meter" role="img" aria-label="${pct}% of seats booked"><i style="width:${pct}%"></i></div>
      <p class="seat-text ${left > 0 && left <= 10 ? "is-low" : ""}">${icon("seat")}${left === 0 ? "Sold out" : `${left} of ${event.quota} seats left`}</p>
    </div>`;
}

function eventCard(event) {
  const left = Math.max(event.quota - event.registered, 0);
  return `
    <article class="event-card">
      ${dateTile(event)}
      ${eventDetails(event)}
      <strong class="chip ${left === 0 ? "is-full" : statusFor(event) === "Low Seats" ? "low" : ""}">${left === 0 ? "Sold out" : statusFor(event)}</strong>
    </article>
  `;
}

function renderHome() {
  document.getElementById("homeTotalSeats").textContent = `${totalSeatsLeft()} seats left`;
  document.getElementById("homeEvents").innerHTML = state.events.map(eventCard).join("") || `<p class="empty-note">No fight nights are on sale right now. Check back soon.</p>`;
  document.getElementById("heroEventCount").textContent = state.events.length;
  const next = state.events.map((e) => infoFor(e).date).filter(Boolean).sort()[0];
  document.getElementById("heroNextDate").textContent = next ? new Date(next).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBA";
}

function renderMember() {
  const user = currentUser();
  const bookedEvent = eventById(user.registeredEvent);
  document.getElementById("memberName").textContent = user.username;
  document.getElementById("memberBooking").textContent = bookedEvent ? `Booked: ${bookedEvent.name}` : "No event booked yet";
  const upcoming = visibleEventsFor(user).slice(0, 3);
  document.getElementById("memberEvents").innerHTML = upcoming.map(eventCard).join("") || `<p class="empty-note">No other fight nights are on sale right now.</p>`;

  const profileForm = document.getElementById("profileForm");
  profileForm.username.value = user.username;
  profileForm.email.value = user.email;
  profileForm.nationality.value = user.nationality;
}

function visibleEventsFor(user) {
  return state.events
    .filter((e) => e.id !== user.registeredEvent && e.quota > e.registered)
    .sort((a, b) => (infoFor(a).date || "9").localeCompare(infoFor(b).date || "9"));
}

function renderFilters() {
  const cities = ["All", ...new Set(state.events.map((e) => infoFor(e).city).filter(Boolean))];
  if (!cities.includes(eventFilter.city)) eventFilter.city = "All";
  document.getElementById("cityChips").innerHTML = cities.map((c) => `
    <button type="button" class="city-chip ${eventFilter.city === c ? "is-on" : ""}" data-city="${c}" aria-pressed="${eventFilter.city === c}">${c === "All" ? "All cities" : c}</button>`).join("");
  document.getElementById("eventSort").value = eventFilter.sort;
}

function renderBooking() {
  const user = currentUser();
  const bookedEvent = eventById(user.registeredEvent);
  renderFilters();
  const shown = visibleEvents();
  document.getElementById("eventCount").textContent = `${shown.length} ${shown.length === 1 ? "event" : "events"}`;
  document.getElementById("bookingEvents").innerHTML = shown.length ? "" : `<p class="empty-note">No fight nights match your search. <button class="link-btn" type="button" data-clear-filters>Clear filters</button></p>`;
  document.getElementById("bookingEvents").innerHTML += shown.map((event) => {
    const left = Math.max(event.quota - event.registered, 0);
    const isBooked = user.registeredEvent === event.id;
    const disabled = left === 0 && !isBooked;
    return `
      <article class="booking-card ${isBooked ? "is-booked" : ""}">
        ${dateTile(event)}
        ${eventDetails(event)}
        <button class="btn ${isBooked ? "secondary" : ""}" data-book="${event.id}" ${disabled ? "disabled" : ""} type="button">
          ${isBooked ? `${icon("check")}Booked` : left === 0 ? "Sold out" : user.registeredEvent ? "Switch to this" : `Book now${icon("arrow")}`}
        </button>
      </article>
    `;
  }).join("");

  document.getElementById("bookingSummaryText").textContent = bookedEvent
    ? `You're booked for ${bookedEvent.name} (${eventMeta(bookedEvent)}). You can switch to another fight night any time before it sells out.`
    : "You haven't booked a fight night yet. Pick one above to reserve your seat.";
}

function renderCapacity() {
  const list = document.getElementById("adminCapacity");
  if (!list) return;
  list.innerHTML = state.events.map((event) => {
    const pct = event.quota ? Math.round((event.registered / event.quota) * 100) : 0;
    return `
      <div class="capacity-row">
        <div class="capacity-top"><strong>${event.name}</strong><span>${event.registered} / ${event.quota} · ${pct}%</span></div>
        <div class="capacity-bar" role="img" aria-label="${pct}% full"><i style="width:${Math.min(100, pct)}%"></i></div>
      </div>`;
  }).join("") || `<p class="empty-note">No events yet. Add one from Manage events.</p>`;
}

function renderAdmin() {
  renderCapacity();
  const bookedUsers = state.users.filter((user) => user.registeredEvent !== null).length;
  document.getElementById("adminUsers").textContent = state.users.length;
  document.getElementById("adminBooked").textContent = bookedUsers;
  document.getElementById("adminEvents").textContent = state.events.length;
  document.getElementById("adminSeats").textContent = totalSeatsLeft();
}

function renderTables() {
  document.getElementById("eventsTable").innerHTML = state.events.map((event) => `
    <tr>
      <td>${event.id}</td>
      <td><input class="table-input" value="${event.name}" data-event-name="${event.id}"></td>
      <td><input class="table-input number" type="number" min="${event.registered}" value="${event.quota}" data-event-quota="${event.id}"></td>
      <td>${event.registered}</td>
      <td><span class="status">${statusFor(event)}</span></td>
      <td><button class="small-danger" data-delete-event="${event.id}" type="button">Delete</button></td>
    </tr>
  `).join("");

  const normalizedSearch = userSearchQuery.trim().toLowerCase();
  const users = normalizedSearch
    ? state.users.filter((user) => {
      const booked = eventById(user.registeredEvent);
      return [user.username, user.email, user.nationality, booked?.name || ""]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    : state.users;

  document.getElementById("usersTable").innerHTML = users.map((user) => {
    const booked = eventById(user.registeredEvent);
    return `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.nationality}</td>
        <td>${booked ? booked.name : "None"}</td>
        <td><button class="small-danger" data-delete-user="${user.id}" type="button">Delete</button></td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="6">No users match the current search.</td></tr>`;
}

function render() {
  renderHome();
  renderMember();
  renderBooking();
  renderAdmin();
  renderTables();
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-confirm]") || event.target.id === "cancelDelete") {
    closeDeleteDialog();
    return;
  }

  if (event.target.id === "confirmDelete" && pendingDeletion) {
    const deletion = pendingDeletion;
    closeDeleteDialog();
    if (deletion.type === "event") deleteEvent(deletion.id);
    if (deletion.type === "user") deleteUser(deletion.id);
    if (deletion.type === "booking") cancelBooking();
    return;
  }
  const nav = event.target.closest(".nav-trigger");
  if (nav) {
    navigate(nav.dataset.screen);
    return;
  }

  const bookButton = event.target.closest("[data-book]");
  if (bookButton) {
    const user = currentUser();
    const nextEventId = Number(bookButton.dataset.book);
    const previousEvent = eventById(user.registeredEvent);
    const nextEvent = eventById(nextEventId);

    if (user.registeredEvent === nextEventId) {
      showToast("You are already booked for this event.");
      return;
    }

    if (previousEvent) previousEvent.registered -= 1;
    nextEvent.registered += 1;
    user.registeredEvent = nextEventId;
    user.bookedAt = new Date().toISOString();
    saveState();
    render();
    showToast(`Booked: ${nextEvent.name}`);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-event]");
  if (deleteButton) {
    const eventId = Number(deleteButton.dataset.deleteEvent);
    const selectedEvent = eventById(eventId);
    if (selectedEvent) {
      openDeleteDialog({
        type: "event",
        id: eventId,
        label: selectedEvent.name,
        message: `Delete "${selectedEvent.name}"? Linked registrations will be cleared.`
      });
    }
    return;
  }

  const deleteUserButton = event.target.closest("[data-delete-user]");
  if (deleteUserButton) {
    const userId = Number(deleteUserButton.dataset.deleteUser);
    const user = state.users.find((item) => item.id === userId);
    if (user) {
      openDeleteDialog({
        type: "user",
        id: userId,
        label: user.username,
        message: `Delete "${user.username}"? Any linked registration will be cleared.`
      });
    }
    return;
  }

  if (event.target.id === "saveEventChanges") {
    saveState();
    render();
    showToast("Event changes saved.");
    return;
  }

  if (event.target.id === "clearUserSearch") {
    userSearchQuery = "";
    document.querySelector("#userSearchForm input").value = "";
    renderTables();
    showToast("Filter cleared.");
    return;
  }

  if (event.target.id === "resetAppState") {
    state = structuredClone(defaultState);
    saveState();
    render();
    showToast("Data reset.");
  }
});

document.addEventListener("input", (event) => {
  const nameInput = event.target.closest("[data-event-name]");
  if (nameInput) {
    const editedEvent = eventById(Number(nameInput.dataset.eventName));
    editedEvent.name = nameInput.value.trim() || editedEvent.name;
    saveState();
    renderHome();
    renderBooking();
    renderMember();
    return;
  }

  const quotaInput = event.target.closest("[data-event-quota]");
  if (quotaInput) {
    const editedEvent = eventById(Number(quotaInput.dataset.eventQuota));
    editedEvent.quota = Math.max(editedEvent.registered, Number(quotaInput.value || editedEvent.registered));
    saveState();
    renderHome();
    renderBooking();
    renderAdmin();
  }
});

document.getElementById("registerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = normalizeText(form.get("username"));
  const email = normalizeText(form.get("email"));
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirm_password") || "");

  if (password !== confirmPassword) {
    showToast("Passwords do not match.");
    return;
  }

  if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    showToast("Username already exists.");
    return;
  }

  if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    showToast("Email already exists.");
    return;
  }

  const newUser = {
    id: nextId(state.users),
    username,
    email,
    password,
    nationality: form.get("nationality"),
    gender: form.get("gender"),
    registeredEvent: null
  };
  state.users.push(newUser);
  state.currentUserId = newUser.id;
  saveState();
  showToast("Account created.");
  navigate("memberDashboard");
});

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = normalizeText(form.get("username"));
  const password = String(form.get("password") || "");
  let user = state.users.find((item) => item.username === username);
  if (!user) {
    showToast("Account not found.");
    return;
  }

  if (user.password !== password) {
    showToast("Incorrect password.");
    return;
  }

  state.currentUserId = user.id;
  saveState();
  showToast("Signed in.");
  navigate("memberDashboard");
});

document.getElementById("adminSignOut").addEventListener("click", () => {
  showToast("Signed out.");
  navigate("home");
});

document.getElementById("adminLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const inputs = event.currentTarget.querySelectorAll("input");
  if (inputs[0].value !== "admin" || inputs[1].value !== "admin123") {
    showToast("Invalid admin credentials.");
    return;
  }
  showToast("Admin signed in.");
  navigate("adminDashboard");
});

document.getElementById("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  const form = new FormData(event.currentTarget);
  const username = normalizeText(form.get("username"));
  const email = normalizeText(form.get("email"));
  const currentPassword = String(form.get("current_password") || "");
  const newPassword = String(form.get("new_password") || "");

  if (user.password !== currentPassword) {
    showToast("Current password is incorrect.");
    return;
  }

  if (state.users.some((item) => item.id !== user.id && item.username.toLowerCase() === username.toLowerCase())) {
    showToast("Username already exists.");
    return;
  }

  if (state.users.some((item) => item.id !== user.id && item.email.toLowerCase() === email.toLowerCase())) {
    showToast("Email already exists.");
    return;
  }

  user.username = username;
  user.email = email;
  user.nationality = form.get("nationality");
  if (newPassword !== "") {
    user.password = newPassword;
  }
  saveState();
  showToast("Profile updated.");
  navigate("memberDashboard");
});

document.getElementById("userSearchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  userSearchQuery = new FormData(event.currentTarget).get("query") || "";
  renderTables();
  showToast(userSearchQuery ? "User filter applied." : "Showing all users.");
});

document.getElementById("addEventForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = normalizeText(form.get("name"));
  const quota = Number(form.get("quota"));
  if (state.events.some((event) => event.name.toLowerCase() === name.toLowerCase())) {
    showToast("Event name already exists.");
    return;
  }
  state.events.push({
    id: nextId(state.events),
    name,
    quota,
    registered: 0
  });
  event.currentTarget.reset();
  saveState();
  render();
  showToast("Event added.");
});

populateNationalityMenus();
render();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && pendingDeletion) closeDeleteDialog();
});
// Events page filters and My booking actions
document.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-city]");
  if (chip) { eventFilter.city = chip.dataset.city; renderBooking(); return; }
  if (event.target.closest("[data-clear-filters]")) {
    eventFilter.city = "All"; eventFilter.query = ""; document.getElementById("eventSearch").value = ""; renderBooking(); return;
  }
  if (event.target.closest("[data-cancel-booking]")) {
    const ev = eventById(currentUser().registeredEvent);
    if (!ev) return;
    openDeleteDialog({ type: "booking", id: ev.id, label: "booking", message: `Cancel your seat for ${ev.name}? It will be released to other fans.` });
    document.getElementById("confirmDelete").textContent = "Cancel booking";
  }
});
document.getElementById("eventSearch").addEventListener("input", (event) => { eventFilter.query = event.target.value; renderBooking(); });
document.getElementById("eventSort").addEventListener("change", (event) => { eventFilter.sort = event.target.value; renderBooking(); });
document.getElementById("cancelDelete").addEventListener("click", () => { document.getElementById("confirmDelete").textContent = "Delete"; });
