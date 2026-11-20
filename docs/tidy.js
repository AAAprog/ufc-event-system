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

document.getElementById("loginForm").addEventListener("submit", () => {
  const name = new FormData(document.getElementById("loginForm")).get("username");
  if (state.users.some((u) => u.id === state.currentUserId && u.username === String(name).trim())) {
    state.memberSignedIn = true; saveState(); syncHeader();
  }
});
document.getElementById("registerForm").addEventListener("submit", () => {
  setTimeout(() => { if (document.getElementById("screen-memberDashboard").classList.contains("is-active")) { state.memberSignedIn = true; saveState(); syncHeader(); } }, 0);
});

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
