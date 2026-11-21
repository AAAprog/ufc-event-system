// Layout tidy-up: separate sign-in area, header account button, 6 cards on home.

const AUTH_SCREENS = ["login", "register", "adminLogin"];
const HOME_CARD_LIMIT = 6;

/* Header: nav links on the left of the actions, account button on the right */
(function header() {
  const bar = document.querySelector(".topbar");
  const nav = bar.querySelector("nav:not(.admin-nav)");
  nav.querySelector('[data-screen="login"]')?.remove();
  bar.insertAdjacentHTML("beforeend", `
    <div class="topbar-actions">
      <button class="btn btn-sm nav-trigger" data-screen="memberDashboard" type="button" id="headerAccount">My account</button>
    </div>
    <button class="btn btn-sm secondary nav-trigger auth-back" data-screen="home" type="button">← Back to site</button>`);
})();

function signedIn() { return Boolean(state.memberSignedIn); }
function syncHeader() {
  const b = document.getElementById("headerAccount");
  b.textContent = signedIn() ? "My account" : "Sign in";
  b.dataset.screen = signedIn() ? "memberDashboard" : "login";
}

/* Member pages need sign-in; signing in/out is tracked */
const navigateTidyBase = navigate;
navigate = function navigateTidy(screen) {
  if (["memberDashboard", "profile", "payment"].includes(screen) && !signedIn()) {
    showToast("Sign in to continue.");
    screen = "login";
  }
  navigateTidyBase(screen);
  document.body.classList.toggle("auth-page", AUTH_SCREENS.includes(screen));
  syncHeader();
};

// Runs before app.js's own handlers (capture phase), so the sign-in is known before navigation.
document.addEventListener("submit", (e) => {
  if (e.target.id === "loginForm") {
    const f = new FormData(e.target);
    const user = state.users.find((u) => u.username === String(f.get("username")).trim());
    state.memberSignedIn = Boolean(user && user.password === String(f.get("password") || ""));
  }
  if (e.target.id === "registerForm") state.memberSignedIn = true;
}, true);
document.getElementById("registerForm").addEventListener("submit", () => {
  // If registration was rejected the member stays on the form, so undo the flag.
  if (!document.getElementById("screen-memberDashboard").classList.contains("is-active")) state.memberSignedIn = false;
  saveState(); syncHeader();
});
document.getElementById("loginForm").addEventListener("submit", () => { saveState(); syncHeader(); });

/* Sign out from My account */
const renderMemberTidy = renderMember;
renderMember = function renderMemberTidied() {
  renderMemberTidy();
  const row = document.querySelector("#screen-memberDashboard .decision-panel .action-row");
  if (row && !row.querySelector("[data-member-signout]")) row.insertAdjacentHTML("beforeend", `<button class="btn secondary" type="button" data-member-signout>Sign out</button>`);
};
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-member-signout]")) return;
  state.memberSignedIn = false; saveState(); syncHeader();
  showToast("Signed out.");
  navigate("home");
});

/* Home: 6 soonest cards + "All events"; hero has one primary + one secondary action */
const renderHomeTidy = renderHome;
renderHome = function renderHomeTidied() {
  renderHomeTidy();
  const list = document.getElementById("homeEvents");
  const soon = [...state.events].filter((e) => e.quota > e.registered)
    .sort((a, b) => (infoFor(a).date || "9").localeCompare(infoFor(b).date || "9")).slice(0, HOME_CARD_LIMIT);
  list.innerHTML = soon.map(eventCard).join("") || `<p class="empty-note">No fight nights on sale right now.</p>`;
  const panel = list.parentElement;
  panel.querySelector(".see-all")?.remove();
  if (state.events.length > HOME_CARD_LIMIT) {
    panel.insertAdjacentHTML("beforeend", `<div class="see-all"><button class="btn secondary nav-trigger" data-screen="booking" type="button">See all ${state.events.length} events</button></div>`);
  }
  const head = panel.querySelector(".panel-head span");
  if (head) head.textContent = "Coming up";
  const hero = document.querySelector("#screen-home .hero-copy .action-row");
  const second = hero?.querySelector(".btn.secondary");
  if (second) { second.textContent = "See all events"; second.dataset.screen = "booking"; }
};

render();
syncHeader();

/* ---------- Phone navigation: 4 compact tabs, header account button ---------- */
(function phoneNav() {
  const bar = document.querySelector(".tabbar");
  const tabs = [["home", "home", "Home"], ["booking", "calendar", "Events"], ["memberDashboard", "ticket", "My tickets"], ["profile", "user", "Account"]];
  bar.innerHTML = `<span class="tabbar-pill" aria-hidden="true"></span>` + tabs.map(([s, i, l]) => `<button class="nav-trigger" data-screen="${s}" type="button">${icon(i)}<span>${l}</span></button>`).join("");
})();

moveTabPill = function markCurrentTab() {
  const screen = document.querySelector(".screen.is-active")?.id.replace("screen-", "");
  const map = { home: "home", booking: "booking", seats: "booking", payment: "booking", memberDashboard: "memberDashboard", profile: "profile" };
  document.querySelectorAll(".tabbar button").forEach((b) => {
    const on = b.dataset.screen === map[screen];
    b.classList.toggle("is-current", on);
    b.toggleAttribute("aria-current", on);
  });
};

const syncHeaderBase = syncHeader;
syncHeader = function syncHeaderAvatar() {
  syncHeaderBase();
  const b = document.getElementById("headerAccount");
  b.classList.toggle("is-avatar", signedIn());
  if (signedIn()) {
    const name = currentUser().username;
    b.textContent = name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    b.setAttribute("aria-label", `My account (${name})`);
  } else {
    b.removeAttribute("aria-label");
  }
};
render();
syncHeader();
moveTabPill();
