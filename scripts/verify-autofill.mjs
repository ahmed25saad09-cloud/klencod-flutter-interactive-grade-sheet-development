import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, baseURL });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const original = await (await page.request.get('/api/workspace')).json();
const remote = async () => (await page.request.get('/api/workspace')).json();
const activeScores = async () => (await remote()).classrooms.find(c => c.id === '5-a').students.map(s => s.scores);
const openFill = async () => { await page.locator('.gradebook-panel').getByRole('button', { name: 'الملء التلقائي', exact: true }).click(); await page.waitForSelector('[data-testid="apply-autofill"]'); };
const apply = async () => { await page.getByTestId('apply-autofill').click(); await page.waitForSelector('.autofill-undo'); await saved(); };
const undo = async () => { await page.getByRole('button', { name: 'تراجع عن آخر ملء', exact: true }).click(); await saved(); };
const saved = async () => { await page.waitForFunction(() => document.querySelector('.table-footnote')?.textContent?.includes('جميع التغييرات محفوظة'), null, { timeout: 25000 }); };
const count = async () => Number(await page.getByTestId('autofill-count').innerText());
const close = async () => { await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click(); };
const full = scores => Object.entries(scores).every(([key, value]) => value === (key.endsWith('-test') ? 5 : 1));
const customValues = { 'درجة الاختبارات القصيرة': '4', 'درجة المشاركة': '0', 'درجة الواجبات': '1', 'درجة الأنشطة الصفية': '1', 'درجة المهام الأدائية': '0' };
async function custom() {
  await page.getByLabel('طريقة الملء').selectOption('custom');
  for (const [label, value] of Object.entries(customValues)) await page.getByLabel(label, { exact: true }).fill(value);
}
function matchesCustom(scores) {
  return Object.entries(scores).every(([key, value]) => value === ({ test: 4, participation: 0, homework: 1, activity: 1, task: 0 }[key.split('-')[1]]));
}
try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await openFill();
  assert.equal(await count(), 0);
  assert.ok(await page.getByTestId('apply-autofill').isDisabled());
  await close();
  await page.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  await page.getByLabel('رقم الأسبوع الجديد').fill('12');
  await page.getByLabel('نطاق إنشاء الأسبوع').selectOption('all');
  await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="تصفية الأسبوع"]')?.value === '12');
  await openFill();
  assert.equal(await count(), 65);
  await apply();
  assert.ok((await activeScores()).every(s => full(Object.fromEntries(Object.entries(s).filter(([k]) => k.startsWith('12-'))))));
  await undo();
  assert.ok((await activeScores()).every(s => Object.keys(s).filter(k => k.startsWith('12-')).every(k => s[k] === null)));
  console.log('PASS: empty-only preview, full-mark fill, persistence, and undo');

  await openFill(); await custom();
  assert.equal(await count(), 65);
  await page.screenshot({ path: '/tmp/sijill-autofill-dialog.png', fullPage: true });
  await apply();
  const customState = await activeScores();
  assert.ok(customState.every(scores => matchesCustom(Object.fromEntries(Object.entries(scores).filter(([key]) => key.startsWith('12-'))))));
  await page.screenshot({ path: '/tmp/sijill-autofill-table.png', fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.getByLabel('تصفية الأسبوع').selectOption('12');
  assert.equal(await page.locator('input[data-cell="0-0"]').inputValue(), '4');
  assert.equal(await page.locator('input[data-cell="0-1"]').inputValue(), '0');
  await openFill(); assert.equal(await count(), 0); await close();
  console.log('PASS: custom values including zero, reload persistence, zero not treated as empty');

  await openFill();
  await page.getByLabel('طريقة الملء').selectOption('full');
  await page.locator('input[name="autofill-mode"][value="overwrite"]').check();
  assert.ok(await page.getByTestId('apply-autofill').isDisabled());
  await page.locator('.fill-overwrite-confirm input').check();
  await apply();
  assert.ok((await activeScores()).every(scores => full(Object.fromEntries(Object.entries(scores).filter(([key]) => key.startsWith('12-'))))));
  await undo();
  assert.deepEqual(await activeScores(), customState);
  await openFill();
  await page.getByLabel('الأسبوع المراد ملؤه').selectOption('all');
  await page.locator('input[name="autofill-mode"][value="overwrite"]').check();
  await page.locator('.fill-overwrite-confirm input').check();
  assert.ok(await count() > 0);
  await apply();
  assert.ok((await activeScores()).every(full));
  await undo();
  assert.deepEqual(await activeScores(), customState);
  console.log('PASS: explicit overwrite confirmation, selected week and all weeks, exact undo');

  await openFill();
  await page.getByLabel('الأسبوع المراد ملؤه').selectOption('12');
  await page.getByLabel('نطاق الملء التلقائي').selectOption('all');
  assert.equal(await count(), 590);
  await apply();
  let all = (await remote()).classrooms;
  assert.ok(all.filter(c => c.id !== '5-a').every(c => c.students.every(s => full(Object.fromEntries(Object.entries(s.scores).filter(([k]) => k.startsWith('12-')))))));
  assert.deepEqual(all.find(c => c.id === '5-a').students.map(s => s.scores), customState);
  await undo();
  all = (await remote()).classrooms;
  assert.ok(all.filter(c => c.id !== '5-a').every(c => c.students.every(s => Object.entries(s.scores).filter(([k]) => k.startsWith('12-')).every(([,v]) => v === null))));
  assert.deepEqual(all.find(c => c.id === '5-a').students.map(s => s.scores), customState);
  console.log('PASS: all-class fill affects only missing cells and undo preserves other completed grades');

  await openFill();
  await page.getByLabel('طريقة الملء').selectOption('copy');
  await page.getByLabel('الأسبوع المرجعي').selectOption('8');
  await page.locator('input[name="autofill-mode"][value="overwrite"]').check();
  await page.locator('.fill-overwrite-confirm input').check();
  await apply();
  assert.ok((await activeScores()).every(s => ['test','participation','homework','activity','task'].every(m => s[`12-${m}`] === s[`8-${m}`])));
  await undo();
  assert.deepEqual(await activeScores(), customState);
  await openFill(); await custom();
  await page.getByLabel('درجة الاختبارات القصيرة', { exact: true }).fill('6');
  assert.ok(await page.getByTestId('apply-autofill').isDisabled());
  assert.match(await page.locator('.form-error').innerText(), /درجة صحيحة/);
  await close();
  assert.deepEqual(errors, []);
  console.log('PASS: reference-week copying, undo, invalid custom grade prevention');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, isMobile: true });
  const phone = await mobileContext.newPage();
  await phone.goto('/', { waitUntil: 'networkidle' });
  await phone.waitForSelector('.score-input:not(:disabled)');
  await phone.locator('.gradebook-panel').getByRole('button', { name: 'الملء التلقائي', exact: true }).click();
  await phone.getByLabel('طريقة الملء').selectOption('custom');
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await phone.locator('[role="dialog"]').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
  await phone.screenshot({ path: '/tmp/sijill-autofill-mobile.png', fullPage: true });
  await mobileContext.close();
  console.log('PASS: mobile autofill controls and dialog fit viewport');
} finally {
  for (const classroom of original.classrooms) {
    const response = await page.request.put('/api/classrooms', { data: classroom });
    assert.equal(response.status(), 200);
  }
  const restored = await remote();
  assert.deepEqual(restored.classrooms.map(c => c.students), original.classrooms.map(c => c.students));
  assert.deepEqual(restored.classrooms.map(c => c.weeks), original.classrooms.map(c => c.weeks));
  await browser.close();
  console.log('Original grades and weeks restored after autofill testing.');
}
