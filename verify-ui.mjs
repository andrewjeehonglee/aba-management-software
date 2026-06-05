import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'https://aba-management-software.vercel.app';
const OUT = join(process.cwd(), 'verify-screenshots');
mkdirSync(OUT, { recursive: true });

const results = [];

function record(id, name, pass, notes) {
  results.push({ id, name, pass, notes });
  console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${id}. ${name}`);
  console.log(`  ${notes}`);
}

async function getButtonStyles(page, text) {
  return page.evaluate((label) => {
    const buttons = [...document.querySelectorAll('button')];
    const btn = buttons.find((b) => b.textContent?.trim().includes(label));
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const parent = btn.parentElement;
    const siblings = parent ? [...parent.querySelectorAll('button')] : [];
    const index = siblings.indexOf(btn);
    return {
      text: btn.textContent?.trim(),
      index,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      backgroundColor: cs.backgroundColor,
      borderWidth: cs.borderWidth,
      borderColor: cs.borderColor,
      color: cs.color,
      className: btn.className,
    };
  }, text);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Hard refresh equivalent: disable cache + cache-bust query
  await page.route('**/*', (route) => route.continue());
  await context.clearCookies();

  // ── Check 1: Login page buttons ──
  await page.goto(`${BASE}/login?v=4cb6eed`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, '01-login-page.png'), fullPage: true });

  const signIn = await getButtonStyles(page, 'Sign In');
  const signUp = await getButtonStyles(page, 'Sign Up');

  let check1Pass = false;
  let check1Notes = '';
  if (!signIn || !signUp) {
    check1Notes = `Buttons not found. signIn=${JSON.stringify(signIn)} signUp=${JSON.stringify(signUp)}`;
  } else {
    const signInLeft = signIn.left < signUp.left;
    const signInFilled = signIn.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      !signIn.backgroundColor.includes('rgb(255, 255, 255)') &&
      signIn.index === 0;
    const signUpOutline = signUp.borderWidth && signUp.borderWidth !== '0px' && signUp.index === 1;
    const signInTeal = signIn.backgroundColor.includes('13, 115, 119') ||
      signIn.className.includes('0D7377') ||
      signIn.className.includes('bg-[#0D7377]');
    check1Pass = signInLeft && signInFilled && signUpOutline;
    check1Notes = `Sign In: left=${signIn.left.toFixed(0)}px, bg=${signIn.backgroundColor}, idx=${signIn.index}. ` +
      `Sign Up: left=${signUp.left.toFixed(0)}px, border=${signUp.borderWidth}, idx=${signUp.index}. ` +
      `Left order=${signInLeft}, filled=${signInFilled}, outline=${signUpOutline}, teal-ish=${signInTeal}`;
  }
  record(1, 'Login page button layout/styles', check1Pass, check1Notes);

  // ── Check 2: Demo login + Today's Sessions ──
  const demoBtn = page.getByRole('button', { name: /Try the demo/i });
  await demoBtn.click();
  await page.waitForURL(/\/(dashboard)?/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '02-dashboard-after-demo.png'), fullPage: true });

  const sessionsText = await page.locator('text=Today\'s Sessions').first().isVisible().catch(() => false);
  const noSessions = await page.locator('text=No sessions today').isVisible().catch(() => false);
  const sessionRows = await page.evaluate(() => {
    const title = [...document.querySelectorAll('h3,h2,div')].find((el) => el.textContent?.includes("Today's Sessions"));
    if (!title) return { found: false, count: 0, samples: [] };
    let card = title.closest('[data-slot="card"], .rounded-xl, article, section, div');
    for (let i = 0; i < 6 && card; i++) {
      const links = card.querySelectorAll('a[href*="/clients/"], a[href*="/sessions/"]');
      const rows = card.querySelectorAll('li, tr, [class*="session"]');
      if (links.length > 0 || rows.length > 2) {
        const samples = [...card.querySelectorAll('a, span, p')]
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t.length > 2 && t.length < 80)
          .slice(0, 8);
        return { found: true, count: Math.max(links.length, rows.length), samples };
      }
      card = card.parentElement;
    }
    const bodyText = document.body.innerText;
    const hasNoSessions = bodyText.includes('No sessions today');
    const timeMatches = bodyText.match(/\d{1,2}:\d{2}\s*(AM|PM)/gi) || [];
    return { found: !hasNoSessions && timeMatches.length > 0, count: timeMatches.length, samples: timeMatches.slice(0, 5) };
  });

  const check2Pass = sessionsText && !noSessions && sessionRows.found;
  record(
    2,
    "Today's Sessions has rows (not empty)",
    check2Pass,
    `Tile visible=${sessionsText}, empty state=${noSessions}, rows=${JSON.stringify(sessionRows)}`
  );

  // ── Check 3: Owner role + client profile ──
  const ownerBtn = page.getByRole('button', { name: 'Owner', exact: true });
  if (await ownerBtn.isVisible().catch(() => false)) {
    await ownerBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: join(OUT, '03-dashboard-owner-role.png'), fullPage: true });

  const clientLink = page.locator('a[href*="/clients/"]').filter({ hasText: /Isabella/i }).first();
  let clientName = 'Isabella Johnson';
  if (!(await clientLink.isVisible().catch(() => false))) {
    const anyClient = page.locator('text=Authorization Utilization').locator('..').locator('..').locator('a[href*="/clients/"]').first();
    if (await anyClient.isVisible().catch(() => false)) {
      clientName = (await anyClient.textContent())?.trim() || clientName;
      await anyClient.click();
    } else {
      record(3, 'Client profile loads from Auth Utilization', false, 'No client link found under Authorization Utilization');
      await browser.close();
      console.log('\n--- SUMMARY ---');
      results.forEach((r) => console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.id} | ${r.notes}`));
      process.exit(1);
    }
  } else {
    clientName = (await clientLink.textContent())?.trim() || clientName;
    await clientLink.click();
  }

  await page.waitForURL(/\/clients\//, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, '04-client-profile.png'), fullPage: true });

  const profileState = await page.evaluate(() => {
    const text = document.body.innerText;
    const is404 = text.includes('404') || text.includes('Page not found') || text.includes('Not Found');
    const isBlank = text.trim().length < 50;
    const hasClientHeading = /Client Overview|Profile|Authorization|Sessions|Goals/i.test(text);
    const title = document.title;
    return { is404, isBlank, hasClientHeading, title, snippet: text.slice(0, 400) };
  });

  const check3Pass = !profileState.is404 && !profileState.isBlank && profileState.hasClientHeading;
  record(
    3,
    'Client profile loads (not 404/blank)',
    check3Pass,
    `Clicked "${clientName}". 404=${profileState.is404}, blank=${profileState.isBlank}, hasContent=${profileState.hasClientHeading}, title=${profileState.title}`
  );

  // ── Check 4: Adoption Health banner absent ──
  await page.goto(`${BASE}/dashboard?v=4cb6eed`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, '05-dashboard-no-adoption-banner.png'), fullPage: true });

  const adoptionVisible = await page.locator('text=Adoption Health').isVisible().catch(() => false);
  const check4Pass = !adoptionVisible;
  record(
    4,
    'Adoption Health banner NOT on dashboard',
    check4Pass,
    adoptionVisible ? 'Adoption Health text found on dashboard' : 'No Adoption Health banner/text detected'
  );

  await browser.close();

  console.log('\n=== FINAL REPORT ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} | Check ${r.id}: ${r.name}`);
    console.log(`       ${r.notes}`);
  }

  const allPass = results.every((r) => r.pass);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
