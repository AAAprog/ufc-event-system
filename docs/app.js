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
    }
  ],
  events: [
    { id: 1, name: "Main Card VIP", quota: 150, registered: 64 },
    { id: 2, name: "Heavyweight Showcase", quota: 120, registered: 78 },
    { id: 3, name: "Lightweight Contenders", quota: 100, registered: 92 }
  ]
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
    return JSON.parse(saved);
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

function eventCard(event) {
  const left = Math.max(event.quota - event.registered, 0);
  return `
    <article class="event-card">
      <div>
        <h3>${event.name}</h3>
        <p>${left} seats left · ${event.registered}/${event.quota} booked</p>
      </div>
      <strong class="${statusFor(event) === "Low Seats" ? "low" : ""}">${statusFor(event)}</strong>
    </article>
  `;
}

function renderHome() {
  document.getElementById("homeTotalSeats").textContent = `${totalSeatsLeft()} seats left`;
  document.getElementById("homeEvents").innerHTML = state.events.map(eventCard).join("");
}

function renderMember() {
  const user = currentUser();
  const bookedEvent = eventById(user.registeredEvent);
  document.getElementById("memberName").textContent = user.username;
  document.getElementById("memberEmail").textContent = user.email;
  document.getElementById("memberBooking").textContent = bookedEvent ? `Booked: ${bookedEvent.name}` : "No event booked yet";
  document.getElementById("metricBooking").textContent = bookedEvent ? bookedEvent.name : "None";
  document.getElementById("metricEvents").textContent = state.events.length;
  document.getElementById("metricSeats").textContent = totalSeatsLeft();

  const profileForm = document.getElementById("profileForm");
  profileForm.username.value = user.username;
  profileForm.email.value = user.email;
  profileForm.nationality.value = user.nationality;
}

function renderBooking() {
  const user = currentUser();
  const bookedEvent = eventById(user.registeredEvent);
  document.getElementById("bookingEvents").innerHTML = state.events.map((event) => {
    const left = Math.max(event.quota - event.registered, 0);
    const isBooked = user.registeredEvent === event.id;
    const disabled = left === 0 && !isBooked;
    return `
      <article class="booking-card">
        <div>
          <h3>${event.name}</h3>
          <p>${left} seats left · ${event.registered}/${event.quota} booked</p>
        </div>
        <button class="btn ${isBooked ? "secondary" : ""}" data-book="${event.id}" ${disabled ? "disabled" : ""} type="button">
          ${isBooked ? "Current Event" : user.registeredEvent ? "Switch Event" : "Book Event"}
        </button>
      </article>
    `;
  }).join("");

  document.getElementById("bookingSummaryText").textContent = bookedEvent
    ? `Confirmed: ${user.username} is registered for ${bookedEvent.name}. Admin metrics and event capacity update automatically.`
    : "No event selected yet. Choose an event above to preview the confirmation state.";
}

function renderAdmin() {
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
    saveState();
    render();
    showToast(`Booked: ${nextEvent.name}`);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-event]");
  if (deleteButton) {
    const eventId = Number(deleteButton.dataset.deleteEvent);
    const selectedEvent = eventById(eventId);
    if (selectedEvent && !window.confirm(`Delete "${selectedEvent.name}"? Linked registrations will be cleared.`)) {
      return;
    }
    state.events = state.events.filter((item) => item.id !== eventId);
    state.users = state.users.map((user) => user.registeredEvent === eventId ? { ...user, registeredEvent: null } : user);
    saveState();
    render();
    showToast("Event deleted.");
    return;
  }

  const deleteUserButton = event.target.closest("[data-delete-user]");
  if (deleteUserButton) {
    const userId = Number(deleteUserButton.dataset.deleteUser);
    const user = state.users.find((item) => item.id === userId);
    if (user && !window.confirm(`Delete "${user.username}"? Any linked registration will be cleared.`)) {
      return;
    }
    const bookedEvent = user ? eventById(user.registeredEvent) : null;
    if (bookedEvent) bookedEvent.registered = Math.max(bookedEvent.registered - 1, 0);
    state.users = state.users.filter((item) => item.id !== userId);
    if (state.currentUserId === userId) {
      state.currentUserId = state.users[0]?.id || null;
    }
    saveState();
    render();
    showToast("User deleted.");
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
