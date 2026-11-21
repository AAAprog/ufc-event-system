// End-to-end tests for the GitHub Pages preview (docs/).
// Run: npm install && npx playwright install chromium && npm test
const path = require('path');
const { chromium } = require('playwright');
const PAGE = 'file://' + path.resolve(__dirname, '../docs/index.html');
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const toast = async () => p.$eval('#toast', (t) => t.textContent);
  const go = (s) => p.evaluate((s) => navigate(s), s);
  const active = () => p.evaluate(() => document.querySelector('.screen.is-active').id);
  await p.goto(PAGE);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);

  // Home
  check('Home lists events in SAR', (await p.textContent('#homeEvents')).includes('SAR'));
  check('No $ prices anywhere on home', !(await p.textContent('#screen-home')).includes('$'));
  check('Countdown is running', await p.$('#screen-home [data-cd]') !== null);

  // Sign in / register: centred form only
  await go('login'); await p.waitForTimeout(200);
  check('Sign-in page has no side panel', await p.$('#screen-login .auth-promo') === null);
  const box = await p.$eval('#loginForm', (f) => { const r = f.getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - innerWidth / 2); });
  check('Sign-in form is centred', box < 20, `${Math.round(box)}px off centre`);
  await p.fill('#loginForm [name=password]', 'wrong'); await p.click('#loginForm button[type=submit]'); await p.waitForTimeout(100);
  check('Wrong password is rejected', (await toast()).includes('Incorrect'));

  await go('register'); await p.waitForTimeout(200);
  await p.fill('#registerForm [name=username]', 'x'); await p.click('#registerForm button[type=submit]'); await p.waitForTimeout(100);
  check('Short username is rejected', (await toast()).includes('at least 3'));
  await p.fill('#registerForm [name=username]', 'new<b>fan'); await p.fill('#registerForm [name=email]', 'fan@example.com');
  await p.fill('#registerForm [name=password]', 'fanpass12'); await p.fill('#registerForm [name=confirm_password]', 'fanpass12');
  await p.click('#registerForm button[type=submit]'); await p.waitForTimeout(300);
  check('Register signs in and cleans the name', await p.evaluate(() => currentUser().username) === 'newbfan');

  // Booking: filters, seats, limits, payment
  await go('booking'); await p.waitForTimeout(200);
  check('9 events to browse', (await p.$$('#bookingEvents .booking-card')).length === 9);
  await p.click('[data-city="Riyadh"]'); await p.waitForTimeout(100);
  check('City filter works', (await p.$$('#bookingEvents .booking-card')).length === 2);
  await p.click('[data-city="All"]');
  await p.click('[data-book="6"]'); await p.waitForTimeout(300);
  const dohaLeft = await p.evaluate(() => eventById(6).quota - eventById(6).registered);
  await p.click('.tier[data-tier="stands"]'); await p.waitForTimeout(100);
  const seatCount = (await p.$$('#screen-seats .seat[data-seat]')).length;
  check('More seats to choose from', seatCount >= 160, `${seatCount} seats in Stands`);
  let free = await p.$$('#screen-seats .seat[data-seat]:not([disabled])');
  for (let i = 0; i < dohaLeft + 1 && i < free.length; i += 1) { free = await p.$$('#screen-seats .seat[data-seat]:not([disabled]):not(.is-on)'); if (free[0]) await free[0].click(); }
  const picked = await p.evaluate(() => checkout.seats.length);
  check('Cannot pick more seats than are left', picked === dohaLeft, `picked ${picked}, left ${dohaLeft}`);
  await go('booking'); await p.click('[data-book="4"]'); await p.waitForTimeout(300);
  free = await p.$$('#screen-seats .seat[data-seat]:not([disabled])');
  for (let i = 0; i < 7; i += 1) { const f = await p.$$('#screen-seats .seat[data-seat]:not([disabled]):not(.is-on)'); await f[0].click(); }
  check('Max 6 seats per booking', await p.evaluate(() => checkout.seats.length) === 6);
  check('Hold timer starts after picking', await p.$('#holdTimer') !== null);
  check('Summary shows SAR', (await p.textContent('#screen-seats .order')).includes('SAR'));
  await p.evaluate(() => scrollTo(0, 0));
  const total = await p.evaluate(() => totals().total);
  const expect = await p.evaluate(() => { const s = tierPrice(eventById(4), checkout.tier) * 6; return s * 1.08 * 1.15; });
  check('Total = seats + 8% fee + 15% VAT', Math.abs(total - expect) < 0.01, sar0(total));
  await p.click('[data-go-pay]'); await p.waitForTimeout(300);
  await p.fill('[name=card]', '4242424242424241'); await p.click('#payBtn'); await p.waitForTimeout(100);
  check('Invalid card number is caught', (await p.textContent('#payForm')).includes("doesn't look right"));
  await p.fill('[name=card]', '4242424242424242'); await p.fill('[name=exp]', '0120'); await p.fill('[name=cvc]', '12');
  await p.click('#payBtn'); await p.waitForTimeout(100);
  check('Expired date and short CVC are caught', (await p.$$eval('.field-error', (x) => x.filter((e) => e.textContent).length)) === 2);
  await p.fill('[name=exp]', '1229'); await p.fill('[name=cvc]', '123');
  await p.evaluate(() => scrollTo(0, 0));
  const before = await p.evaluate(() => eventById(4).registered);
  await p.click('#payBtn'); await p.waitForTimeout(2300);
  check('Payment lands on My account', (await active()) === 'screen-memberDashboard');
  check('Sold count rises by 6', await p.evaluate(() => eventById(4).registered) === before + 6);
  check('Ticket shows seats and SAR paid', (await p.textContent('.my-booking .ticket')).includes('SAR'));
  await p.evaluate(() => scrollTo(0, 0));

  // Switching event releases old seats
  await go('booking'); await p.click('[data-book="5"]'); await p.waitForTimeout(200);
  const f5 = await p.$$('#screen-seats .seat[data-seat]:not([disabled])'); await f5[0].click();
  await p.click('[data-go-pay]'); await p.fill('[name=card]', '4242424242424242'); await p.fill('[name=exp]', '1229'); await p.fill('[name=cvc]', '123');
  await p.click('#payBtn'); await p.waitForTimeout(2300);
  check('Switching releases the old 6 seats', await p.evaluate(() => eventById(4).registered) === before);

  // Cancel
  const b5 = await p.evaluate(() => eventById(5).registered);
  await p.click('[data-cancel-booking]'); await p.click('#confirmDelete'); await p.waitForTimeout(200);
  check('Cancel releases seats', await p.evaluate((b5) => eventById(5).registered === b5 - 1 && currentUser().registeredEvent === null, b5));

  // Admin guard + dashboard
  await go('adminDashboard'); await p.waitForTimeout(200);
  check('Admin pages need sign-in', (await active()) === 'screen-adminLogin');
  await p.fill('#adminLoginForm input >> nth=0', 'admin'); await p.fill('#adminLoginForm input >> nth=1', 'admin123');
  await p.click('#adminLoginForm button[type=submit]'); await p.waitForTimeout(300);
  check('Admin sign-in works', (await active()) === 'screen-adminDashboard');
  check('Revenue KPI in SAR', (await p.textContent('#adminUsers')).startsWith('SAR'));

  // Manage events
  await go('manageEvents'); await p.waitForTimeout(200);
  await p.fill('#addEventForm [name=name]', ''); await p.click('#addEventForm button[type=submit]'); await p.waitForTimeout(100);
  check('Add event needs a name', (await toast()).includes('name'));
  await p.fill('#addEventForm [name=name]', 'Test Night'); await p.fill('#addEventForm [name=quota]', '0'); await p.click('#addEventForm button[type=submit]'); await p.waitForTimeout(100);
  check('Capacity of 0 is rejected', (await toast()).includes('Capacity'));
  await p.fill('#addEventForm [name=quota]', '80'); await p.fill('#addEventForm [name=price]', '300');
  await p.fill('#addEventForm [name=date]', '2027-04-10T20:00'); await p.fill('#addEventForm [name=city]', 'Riyadh'); await p.fill('#addEventForm [name=venue]', 'Test Arena');
  await p.click('#addEventForm button[type=submit]'); await p.waitForTimeout(200);
  check('New event is added with details', await p.evaluate(() => state.events.some((e) => e.name === 'Test Night' && infoFor(e).price === 300)));
  check('New event shows on Events page', await p.evaluate(() => visibleEvents().some((e) => e.name === 'Test Night')));
  await p.fill('#eventSearchAdmin', 'test'); await p.waitForTimeout(100);
  check('Admin event search works', (await p.$$('#eventsTable tr')).length === 1);
  await p.fill('#eventSearchAdmin', ''); await p.waitForTimeout(100);

  const lowQ = await p.$('[data-event-quota="2"]'); await lowQ.fill('1'); await lowQ.dispatchEvent('change'); await p.waitForTimeout(100);
  check('Capacity cannot go below sold', await p.evaluate(() => eventById(2).quota >= eventById(2).registered));

  // Manage users: deleting a member releases all their seats
  await go('manageUsers'); await p.waitForTimeout(200);
  const lb = await p.evaluate(() => eventById(3).registered);
  await p.click('[data-delete-user="4"]'); await p.click('#confirmDelete'); await p.waitForTimeout(200);
  check('Deleting a member releases all 3 seats', await p.evaluate(() => eventById(3).registered) === lb - 3);

  // Deleting an event clears members' booking details
  await p.evaluate(() => deleteEvent(1)); await p.waitForTimeout(100);
  check('Deleting an event clears members seats', await p.evaluate(() => state.users.every((u) => u.registeredEvent !== 1 && !(u.registeredEvent === null && u.seats && u.seats.length))));

  // Sign out
  await go('adminDashboard'); await p.click('#adminSignOut'); await p.waitForTimeout(100);
  await go('manageEvents');
  check('Sign out locks admin again', (await active()) === 'screen-adminLogin');

  // Phone width
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.goto(PAGE); await m.waitForTimeout(500);
  await m.evaluate(() => navigate('login')); await m.waitForTimeout(200);

  check('No sideways scroll on phone', await m.evaluate(() => document.documentElement.scrollWidth) === 390);

  check('No JavaScript errors', errs.length === 0, errs.join(' | '));
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})();
function sar0(n) { return `SAR ${n.toFixed(2)}`; }
