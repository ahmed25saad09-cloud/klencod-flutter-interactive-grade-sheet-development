import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const started = new Date().toISOString();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: 'http://localhost:3000', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) console.log('HTTP', response.status(), response.url()); });
const settle = async () => { await page.waitForTimeout(1400); await page.waitForFunction(() => !document.querySelector('.score-input')?.disabled); };
const getWorkspace = async () => (await page.request.get('/api/workspace')).json();
let initialWorkspace;
const pagesFor = (id, weeks = 'all') => {
  const c = initialWorkspace.classrooms.find(item => item.id === id);
  const selected = weeks === 'all' ? c.weeks : weeks;
  return Math.max(1, Math.ceil(c.students.length / 19)) * Math.max(1, Math.ceil(selected.length / 4));
};
try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.evaluate(() => document.fonts.ready);
  initialWorkspace = await getWorkspace();
  await page.screenshot({ path: '/tmp/sijill-desktop.png', fullPage: true });
  assert.equal(await page.locator('.class-tab').count(), 7);
  assert.equal((await getWorkspace()).classrooms.reduce((n, c) => n + c.students.length, 0), 131);
  const score = page.locator('input[data-cell="0-0"]');
  await score.fill('4');
  await settle();
  const savedWorkspace = await getWorkspace();
  assert.equal(savedWorkspace.classrooms.find(c => c.id === '5-a').students[0].scores['8-test'], 4);
  assert.ok(savedWorkspace.classrooms.every(c => c.students.every((s, index) => s.position === index + 1)));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.waitForFunction(() => document.querySelector('.table-footnote')?.textContent?.includes('جميع التغييرات محفوظة'));
  assert.equal(await page.locator('input[data-cell="0-0"]').inputValue(), '4');
  await page.locator('input[data-cell="0-0"]').fill('9');
  assert.equal(await page.locator('input[data-cell="0-0"]').inputValue(), '4');
  assert.match(await page.locator('.table-guidance').innerText(), /بين 0 و5/);
  await page.getByRole('textbox', { name: 'البحث عن طالب' }).fill('تميم');
  assert.equal(await page.locator('.grade-table tbody tr').count(), 1);
  await page.getByRole('textbox', { name: 'البحث عن طالب' }).fill('');
  await page.getByLabel('تصفية الأسبوع').selectOption('9');
  assert.equal(await page.locator('.week-heading').count(), 1);
  await page.getByLabel('تصفية الأسبوع').selectOption('all');
  console.log('PASS: score persistence, reload, validation, search, week filtering');

  await page.getByRole('button', { name: 'خيارات السجل' }).click();
  await page.getByRole('button', { name: 'إدارة الطلاب', exact: true }).click();
  await page.getByLabel('اسم الطالب الجديد', { exact: true }).fill('طالب اختبار الحفظ');
  await page.getByRole('button', { name: 'إضافة طالب', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await settle();
  assert.equal((await getWorkspace()).classrooms.find(c => c.id === '5-a').students.length, 14);
  await page.getByRole('button', { name: 'خيارات السجل' }).click();
  await page.getByRole('button', { name: 'إدارة الطلاب', exact: true }).click();
  await page.getByRole('button', { name: 'حذف طالب اختبار الحفظ', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await settle();
  assert.equal((await getWorkspace()).classrooms.find(c => c.id === '5-a').students.length, 13);
  await page.locator('input[data-cell="0-0"]').fill('0');
  await settle();
  console.log('PASS: add and remove student, persisted roster');

  await page.getByRole('button', { name: 'تصدير PDF', exact: true }).click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), pagesFor('5-a'));
  await page.screenshot({ path: '/tmp/sijill-preview.png' });
  await page.locator('.export-stage').evaluate(el => { el.style.left = '0'; el.style.zIndex = '99999'; });
  await page.locator('.export-stage .print-page').first().screenshot({ path: '/tmp/sijill-print.png' });
  await page.locator('.export-stage').evaluate(el => { el.style.left = '-20000px'; el.style.zIndex = '-1'; });
  const downloadEvent = page.waitForEvent('download', { timeout: 90000 });
  await page.getByRole('button', { name: 'تنزيل ملف PDF', exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs('/tmp/sijill-test.pdf');
  await page.waitForFunction(() => !document.querySelector('.preview-footer .button-primary')?.disabled);
  const pdf = await readFile('/tmp/sijill-test.pdf');
  assert.ok(pdf.length > 20000);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, pagesFor('5-a'));
  assert.ok(pdf.toString('latin1').includes('/Subtype /Image'));
  console.log('PASS: Arabic PDF download,', pdf.length, 'bytes,', pagesFor('5-a'), 'A4 pages');
  await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click();

  await page.locator('.class-tab').filter({ hasText: 'الثاني المتوسط' }).click();
  await page.getByRole('button', { name: 'تصدير PDF', exact: true }).click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), pagesFor('2-m'));
  const longEvent = page.waitForEvent('download', { timeout: 90000 });
  await page.getByRole('button', { name: 'تنزيل ملف PDF', exact: true }).click();
  await (await longEvent).saveAs('/tmp/sijill-long.pdf');
  await page.waitForFunction(() => !document.querySelector('.preview-footer .button-primary')?.disabled);
  const longPdf = await readFile('/tmp/sijill-long.pdf');
  assert.equal((longPdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, pagesFor('2-m'));
  console.log('PASS: 27-student class exports', pagesFor('2-m'), 'complete pages,', longPdf.length, 'bytes');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: '/tmp/sijill-native.pdf', preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click();

  await page.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.toast-container')?.textContent?.includes('تم حفظ جميع الدرجات'));
  await page.getByRole('button', { name: 'السجلات المحفوظة', exact: true }).click();
  await page.waitForSelector('.saved-row');
  assert.ok(await page.locator('.saved-row').count() >= 1);
  await page.locator('.saved-row').first().getByRole('button', { name: 'استرجاع', exact: true }).click();
  await page.waitForSelector('[role="dialog"]');
  assert.match(await page.locator('[role="dialog"]').innerText(), /استبدال الدرجات/);
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.getByRole('button', { name: 'التقارير والإحصاءات', exact: true }).click();
  assert.equal(await page.locator('.report-table tbody tr').count(), 7);
  await page.getByRole('button', { name: 'الفصول والطلاب', exact: false }).first().click();
  assert.equal(await page.locator('.class-card').count(), 7);
  console.log('PASS: snapshots, archive, restore confirmation, reports and class views');

  const offlineContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const offline = await offlineContext.newPage();
  await offline.goto('/', { waitUntil: 'networkidle' });
  await offline.waitForSelector('.score-input:not(:disabled)');
  await offline.route('**/api/**', route => route.abort());
  await offline.locator('input[data-cell="0-0"]').fill('4');
  await offline.waitForFunction(() => document.querySelector('.table-footnote')?.textContent?.includes('محفوظ على الجهاز'));
  await offline.reload({ waitUntil: 'networkidle' });
  await offline.waitForSelector('.score-input:not(:disabled)');
  assert.equal(await offline.locator('input[data-cell="0-0"]').inputValue(), '4');
  await offline.unroute('**/api/**');
  await offline.locator('input[data-cell="0-0"]').fill('3');
  await offline.waitForFunction(async () => {
    const response = await fetch('/api/workspace');
    const data = await response.json();
    return data.classrooms.find(c => c.id === '5-a').students[0].scores['8-test'] === 3;
  }, null, { polling: 500, timeout: 15000 });
  await offline.locator('input[data-cell="0-0"]').fill('0');
  await offline.waitForFunction(async () => {
    const response = await fetch('/api/workspace');
    const data = await response.json();
    return data.classrooms.find(c => c.id === '5-a').students[0].scores['8-test'] === 0;
  }, null, { polling: 500, timeout: 15000 });
  await offlineContext.close();
  console.log('PASS: offline edits survive reload and synchronize after reconnecting');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: 'http://localhost:3000', isMobile: true, deviceScaleFactor: 1 });
  const phone = await mobile.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto('/', { waitUntil: 'networkidle' });
  await phone.waitForSelector('.score-input:not(:disabled)');
  await phone.screenshot({ path: '/tmp/sijill-mobile.png', fullPage: true });
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await phone.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await phone.getByRole('button', { name: 'الفصول والطلاب', exact: false }).first().click();
  assert.equal(await phone.locator('.class-card').count(), 7);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log('PASS: mobile layout, navigation, no horizontal page overflow, no runtime errors');
  const reports = await (await page.request.get('/api/reports')).json();
  for (const report of reports.filter(r => Date.parse(r.createdAt) >= Date.parse(started))) {
    await page.request.delete(`/api/reports/${report.id}`);
  }
  console.log('ALL TESTS PASSED. Test snapshots cleaned up.');
} finally {
  if (initialWorkspace) {
    const originalClass = initialWorkspace.classrooms.find(c => c.id === '5-a');
    await page.request.put('/api/classrooms', { data: originalClass });
  }
  await browser.close();
}
