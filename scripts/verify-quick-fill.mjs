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
const active = async () => (await remote()).classrooms.find(c => c.id === '5-a');
const saved = async () => { await page.waitForFunction(() => document.querySelector('.table-footnote')?.textContent?.includes('جميع التغييرات محفوظة'), null, { timeout: 25000 }); };
const openRandom = async () => { await page.locator('.quick-fill-actions').getByRole('button', { name: 'الاختبارات العشوائية', exact: true }).click(); await page.waitForSelector('[data-testid="apply-random-quiz"]'); };
const openOther = async () => { await page.locator('.quick-fill-actions').getByRole('button', { name: 'إكمال البنود الأخرى', exact: true }).click(); await page.waitForSelector('[data-testid="apply-other-marks"]'); };
const applyRandom = async () => { await page.getByTestId('apply-random-quiz').click(); await page.waitForSelector('.autofill-undo'); await saved(); };
const applyOther = async () => { await page.getByTestId('apply-other-marks').click(); await page.waitForSelector('.autofill-undo'); await saved(); };
const undo = async () => { await page.getByRole('button', { name: 'تراجع عن آخر ملء', exact: true }).click(); await saved(); };
const close = async () => { await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click(); };
const week12 = scores => Object.fromEntries(Object.entries(scores).filter(([key]) => key.startsWith('12-')));
const others = scores => Object.fromEntries(Object.entries(scores).filter(([key]) => !key.endsWith('-test')));
function historyAverage(scores, target = 12) {
  const previous = Object.entries(scores).filter(([key, value]) => key.endsWith('-test') && Number(key.split('-')[0]) < target && value !== null).sort((a,b)=>Number(a[0].split('-')[0])-Number(b[0].split('-')[0]));
  if (!previous.length) return null;
  let sum = 0, weights = 0;
  previous.forEach(([,value], index) => { const weight = index + 1; sum += value * weight; weights += weight; });
  return sum / weights;
}
function validQuiz(scores, originalScores) {
  const value = scores['12-test'];
  if (!Number.isInteger(value) || value < 0 || value > 5) return false;
  const average = historyAverage(originalScores);
  return average === null || Math.abs(value - average) <= 1;
}
try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  await page.getByLabel('رقم الأسبوع الجديد').fill('12');
  await page.getByLabel('نطاق إنشاء الأسبوع').selectOption('all');
  await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="تصفية الأسبوع"]')?.value === '12');
  const before = await active();
  await openRandom();
  assert.equal(Number(await page.getByTestId('random-quiz-count').innerText()), 13);
  assert.ok(await page.getByLabel('مراعاة درجات الأسابيع السابقة').isChecked());
  await page.screenshot({ path: '/tmp/sijill-random-dialog.png', fullPage: true });
  await applyRandom();
  let after = await active();
  assert.ok(after.students.every((s, i) => validQuiz(s.scores, before.students[i].scores)));
  assert.ok(after.students.every(s => Object.entries(others(week12(s.scores))).every(([,v]) => v === null)));
  const randomState = after.students.map(s => s.scores);
  await undo();
  after = await active();
  assert.ok(after.students.every(s => Object.values(week12(s.scores)).every(v => v === null)));
  await openRandom(); await applyRandom();
  const randomAgain = (await active()).students.map(s => s.scores);
  console.log('PASS: separate random quiz button, 0–5 bounds, history-aware values, other metrics untouched, undo');

  await openOther();
  assert.equal(Number(await page.getByTestId('other-marks-count').innerText()), 52);
  await applyOther();
  after = await active();
  assert.ok(after.students.every(s => Object.values(others(week12(s.scores))).every(v => v === 1)));
  assert.deepEqual(after.students.map(s => s.scores['12-test']), randomAgain.map(s => s['12-test']));
  await openOther(); assert.ok(await page.getByTestId('apply-other-marks').isDisabled()); await close();
  await undo();
  after = await active();
  assert.ok(after.students.every(s => Object.values(others(week12(s.scores))).every(v => v === null)));
  assert.deepEqual(after.students.map(s => s.scores), randomAgain);
  await openRandom(); assert.ok(await page.getByTestId('apply-random-quiz').isDisabled()); await close();
  console.log('PASS: separate other-marks button fills four metrics only, preserves quizzes, undo, missing-only protection');

  await openRandom();
  await page.locator('input[name="quiz-mode"]').nth(1).check();
  await page.locator('.fill-overwrite-confirm input').check();
  await applyRandom();
  after = await active();
  assert.ok(after.students.every((s, i) => validQuiz(s.scores, before.students[i].scores)));
  assert.ok(after.students.every(s => Object.values(others(week12(s.scores))).every(v => v === null)));
  await undo();
  assert.deepEqual((await active()).students.map(s => s.scores), randomAgain);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.getByLabel('تصفية الأسبوع').selectOption('12');
  assert.deepEqual((await active()).students.map(s => s.scores), randomAgain);
  console.log('PASS: confirmed quiz overwrite, exact undo, persistence after reload');

  await openRandom();
  await page.getByLabel('نطاق الاختبارات العشوائية').selectOption('all');
  assert.equal(Number(await page.getByTestId('random-quiz-count').innerText()), 118);
  await applyRandom();
  let all = (await remote()).classrooms;
  const originalById = Object.fromEntries(original.classrooms.map(c => [c.id, c]));
  assert.ok(all.filter(c => c.id !== '5-a').every(c => c.students.every((s, i) => validQuiz(s.scores, originalById[c.id].students[i].scores))));
  assert.deepEqual(all.find(c => c.id === '5-a').students.map(s => s.scores), randomAgain);
  await undo();
  all = (await remote()).classrooms;
  assert.ok(all.filter(c => c.id !== '5-a').every(c => c.students.every(s => s.scores['12-test'] === null)));
  await openOther();
  await page.getByLabel('نطاق البنود الأخرى').selectOption('all');
  assert.equal(Number(await page.getByTestId('other-marks-count').innerText()), 524);
  await applyOther();
  all = (await remote()).classrooms;
  assert.ok(all.every(c => c.students.every(s => Object.values(others(week12(s.scores))).every(v => v === 1))));
  await undo();
  all = (await remote()).classrooms;
  assert.ok(all.every(c => c.students.every(s => Object.values(others(week12(s.scores))).every(v => v === null))));
  console.log('PASS: all-class random quizzes and all-class other marks, scoped undo');

  assert.deepEqual(errors, []);
  await page.screenshot({ path: '/tmp/sijill-quick-actions.png', fullPage: true });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, isMobile: true });
  const phone = await mobileContext.newPage();
  await phone.goto('/', { waitUntil: 'networkidle' });
  await phone.waitForSelector('.score-input:not(:disabled)');
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.locator('.quick-fill-actions').getByRole('button', { name: 'الاختبارات العشوائية', exact: true }).click();
  assert.ok(await phone.locator('[role="dialog"]').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
  await phone.screenshot({ path: '/tmp/sijill-random-mobile.png', fullPage: true });
  await mobileContext.close();
  console.log('PASS: mobile separate buttons and random dialog fit viewport');
} finally {
  for (const classroom of original.classrooms) {
    const response = await page.request.put('/api/classrooms', { data: classroom });
    assert.equal(response.status(), 200);
  }
  const restored = await remote();
  assert.deepEqual(restored.classrooms.map(c => c.students), original.classrooms.map(c => c.students));
  assert.deepEqual(restored.classrooms.map(c => c.weeks), original.classrooms.map(c => c.weeks));
  await browser.close();
  console.log('Original grades and weeks restored after quick-fill testing.');
}
