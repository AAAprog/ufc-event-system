// Regenerates the README screenshots in .github/assets/.
// Run: npm install && npx playwright install chromium && node scripts/screenshots.js
const path = require('path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.resolve(__dirname, '../docs/index.html');
const OUT = path.resolve(__dirname, '../.github/assets');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80 });
  await page.goto(PAGE);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.evaluate(() => { state.memberSignedIn = true; saveState(); });
  await page.waitForTimeout(1200);
  await shot('home');

  await page.evaluate(() => navigate('booking'));
  await page.click('[data-book="4"]');
  for (let i = 0; i < 2; i += 1) {
    const free = await page.$$('#screen-seats .seat[data-seat]:not([disabled]):not(.is-on)');
    await free[0].click();
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  await shot('seats');

  await page.click('[data-go-pay]');
  await page.fill('[name=card]', '4242424242424242');
  await page.fill('[name=exp]', '1229');
  await page.fill('[name=cvc]', '123');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot('payment');

  await page.evaluate(() => { state.adminSignedIn = true; navigate('adminDashboard'); });
  await page.waitForTimeout(1200);
  await shot('admin');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(PAGE);
  await phone.waitForTimeout(1000);
  await phone.screenshot({ path: `${OUT}/phone.jpg`, type: 'jpeg', quality: 80 });
  await browser.close();
})();
