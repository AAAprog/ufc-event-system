// Simplified booking flow:
// - Step 1 (choose event) is a plain browse page with no step bar.
// - After an event is picked there are 3 steps: Seats → Checkout → Ticket.
// - On phones a fixed bottom bar shows the total and the next action.

const renderBookingV3 = renderBooking;
renderBooking = function renderBookingFlow() {
  renderBookingV3();
  const app = document.getElementById("bookingApp");
  if (!app) return;
  app.dataset.step = flow.step;
  // Progress across the 3 visible steps (2, 3, 4).
  const pct = flow.step <= 2 ? 0 : flow.step === 3 ? 50 : 100;
  app.querySelector(".bk-steps").style.setProperty("--progress", `${pct}%`);

  document.getElementById("bkMbar")?.remove();
  if (flow.step !== 2 && flow.step !== 3) return;
  const t = totals();
  const ready = flow.step === 3 || flow.seats.length > 0;
  const action = flow.step === 2
    ? `<button class="btn" type="button" data-step-to="3" ${ready ? "" : "disabled"}>Continue</button>`
    : `<button class="btn" type="submit" form="payForm">Pay ${money(t.total)}</button>`;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="bk-mbar" id="bkMbar">
      <span><small>${flow.seats.length ? `${flow.seats.length} ${flow.seats.length === 1 ? "seat" : "seats"} · Total` : "Pick your seats"}</small><b>${flow.seats.length ? money(t.total) : "—"}</b></span>
      ${action}
    </div>`);
};

const navigateV4 = navigate;
navigate = function navigateFlow(screen) {
  navigateV4(screen);
  if (screen !== "booking") document.getElementById("bkMbar")?.remove();
};

render();
