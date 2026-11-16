import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseURL = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, baseURL, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const workspace = await (await page.request.get('/api/workspace')).json();
const classes = workspace.classrooms;
const expectedPages = (targets, weeks) => targets.reduce((sum, c) => {
  const selected = weeks === 'all' ? c.weeks : c.weeks.filter(w => weeks.includes(w));
  if (!selected.length) return sum;
  return sum + Math.max(1, Math.ceil(c.students.length / 19)) * Math.max(1, Math.ceil(selected.length / 4));
}, 0);
const openOptions = async () => { await page.locator('.heading-actions').getByRole('button', { name: 'خيارات الطباعة', exact: true }).click(); await page.waitForSelector('[data-testid="print-all-selected-weeks"]'); };
const closePreview = async () => { await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click(); };
async function download(name) {
  const event = page.waitForEvent('download', { timeout: 120000 });
  await page.getByRole('button', { name: 'تنزيل ملف PDF', exact: true }).click();
  await (await event).saveAs(name);
  await page.waitForFunction(() => !document.querySelector('.preview-footer .button-primary')?.disabled);
  const pdf = await readFile(name);
  return (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
}
try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await openOptions();
  assert.equal(await page.locator('.print-option-card').count(), 3);
  await page.getByTestId('print-all-selected-weeks').click();
  await page.getByLabel('تحديد الأسبوع 8 للطباعة', { exact: true }).check();
  await page.getByLabel('تحديد الأسبوع 10 للطباعة', { exact: true }).check();
  const selectedExpected = expectedPages(classes, [8, 10]);
  assert.equal(Number(await page.getByTestId('print-page-count').innerText()), selectedExpected);
  await page.getByTestId('preview-print-selection').click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), selectedExpected);
  assert.match(await page.locator('.preview-toolbar').innerText(), /الأسابيع 8، 10/);
  assert.equal(await page.locator('.export-stage .print-page').first().locator('thead tr').first().locator('th').count(), 4);
  assert.equal(await download('/tmp/sijill-all-classes-selected-weeks.pdf'), selectedExpected);
  await closePreview();
  console.log('PASS: all classes with selected multiple weeks, page count, preview and batch PDF');

  await openOptions();
  await page.getByTestId('print-all-weeks').click();
  await page.waitForSelector('.preview-paper');
  const allExpected = expectedPages(classes, 'all');
  assert.equal(await page.locator('.preview-paper').count(), allExpected);
  assert.equal(await download('/tmp/sijill-all-classes-all-weeks.pdf'), allExpected);
  await closePreview();
  console.log('PASS: all classes and all weeks in one batch PDF');

  await openOptions();
  await page.getByTestId('print-single-class').click();
  await page.getByLabel('الفصل المطلوب طباعته').selectOption('2-m');
  await page.getByLabel('تحديد الأسبوع 9 للطباعة', { exact: true }).uncheck();
  await page.getByLabel('تحديد الأسبوع 11 للطباعة', { exact: true }).uncheck();
  const singleExpected = expectedPages(classes.filter(c => c.id === '2-m'), [8, 10]);
  assert.equal(Number(await page.getByTestId('print-page-count').innerText()), singleExpected);
  await page.getByTestId('preview-print-selection').click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), singleExpected);
  assert.match(await page.locator('.preview-toolbar').innerText(), /الثاني المتوسط/);
  assert.equal(await download('/tmp/sijill-single-class-selected-weeks.pdf'), singleExpected);
  await closePreview();
  console.log('PASS: chosen class with chosen weeks, correct pages and PDF');

  assert.deepEqual(errors, []);
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, isMobile: true });
  const phone = await mobileContext.newPage();
  await phone.goto('/', { waitUntil: 'networkidle' });
  await phone.waitForSelector('.score-input:not(:disabled)');
  await phone.locator('.heading-actions').getByRole('button', { name: 'خيارات الطباعة', exact: true }).click();
  await phone.waitForSelector('[data-testid="print-single-class"]');
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await phone.locator('[role="dialog"]').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
  await phone.screenshot({ path: '/tmp/sijill-print-options-mobile.png', fullPage: true });
  await mobileContext.close();
  console.log('PASS: mobile print options fit viewport');
} finally {
  await browser.close();
}
