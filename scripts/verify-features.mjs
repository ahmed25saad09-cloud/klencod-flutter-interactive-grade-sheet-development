import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseURL = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const original = await (await page.request.get('/api/workspace')).json();
const remote = async () => (await page.request.get('/api/workspace')).json();
const waitSaved = async () => {
  await page.waitForFunction(() => document.querySelector('.table-footnote')?.textContent?.includes('جميع التغييرات محفوظة'), null, { timeout: 20000 });
};
async function image(label, color) {
  const data = await page.evaluate(({ label, color }) => {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 180;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f3f8f5'; ctx.fillRect(0, 0, 480, 180);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(75, 90, 49, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 42px Arial'; ctx.fillText(label, 150, 106);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { label, color });
  return Buffer.from(data, 'base64');
}
try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  const right = await image('SCHOOL', '#167d70');
  const left = await image('NCLE', '#ae8b48');
  await page.locator('.report-branding input[data-logo-input="rightLogo"]').setInputFiles({ name: 'school.png', mimeType: 'image/png', buffer: right });
  await page.waitForSelector('.report-branding img[alt="شعار يمين الترويسة"]');
  await page.locator('.report-branding input[data-logo-input="leftLogo"]').setInputFiles({ name: 'company.png', mimeType: 'image/png', buffer: left });
  await page.waitForSelector('.report-branding img[alt="شعار يسار الترويسة"]');
  await waitSaved();
  assert.ok((await remote()).settings.rightLogo.startsWith('data:image/png;base64,'));
  assert.ok((await remote()).settings.leftLogo.startsWith('data:image/png;base64,'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  assert.equal(await page.locator('.report-branding img').count(), 2);
  const beforeInvalid = await page.locator('.report-branding img').first().getAttribute('src');
  await page.locator('.report-branding input[data-logo-input="rightLogo"]').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await page.waitForSelector('.report-branding .logo-upload-error');
  assert.equal(await page.locator('.report-branding img').first().getAttribute('src'), beforeInvalid);
  await page.locator('.report-branding input[data-logo-input="rightLogo"]').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  assert.match(await page.locator('.report-branding .logo-upload-error').first().innerText(), /5 ميجابايت/);
  await page.getByRole('button', { name: 'إزالة شعار يمين الترويسة', exact: true }).click();
  await waitSaved();
  assert.equal((await remote()).settings.rightLogo, null);
  await page.locator('.report-branding input[data-logo-input="rightLogo"]').setInputFiles({ name: 'school.png', mimeType: 'image/png', buffer: right });
  await page.waitForSelector('.report-branding img[alt="شعار يمين الترويسة"]');
  await waitSaved();
  await page.getByRole('button', { name: 'إعدادات المعلم', exact: true }).click();
  assert.equal(await page.locator('[role="dialog"] .logo-upload').count(), 2);
  await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click();
  console.log('PASS: both logo uploads, persistence, remove, settings, invalid and oversized images');

  await page.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  await page.getByLabel('رقم الأسبوع الجديد').fill('12');
  assert.match(await page.locator('.week-name-preview').innerText(), /الثاني عشر/);
  await page.getByLabel('نطاق إنشاء الأسبوع').selectOption('all');
  await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="تصفية الأسبوع"]')?.value === '12');
  await page.waitForFunction(async () => {
    const w = await (await fetch('/api/workspace')).json();
    return w.classrooms.every(c => c.weeks.includes(12) && c.students.every(s => Object.keys(s.scores).filter(k => k.startsWith('12-')).length === 5));
  }, null, { polling: 500, timeout: 20000 });
  assert.equal(await page.locator('.week-heading').count(), 1);
  assert.match(await page.locator('.week-heading').innerText(), /الثاني عشر/);
  await page.locator('input[data-cell="0-0"]').fill('5');
  await page.locator('input[data-cell="0-1"]').fill('1');
  await page.locator('input[data-cell="0-2"]').fill('١');
  assert.equal(await page.locator('input[data-cell="0-2"]').inputValue(), '1');
  await waitSaved();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.score-input:not(:disabled)');
  await page.getByLabel('تصفية الأسبوع').selectOption('12');
  assert.equal(await page.locator('input[data-cell="0-0"]').inputValue(), '5');
  assert.equal(await page.locator('input[data-cell="0-1"]').inputValue(), '1');
  assert.equal((await remote()).classrooms.find(c => c.id === '5-a').students[0].scores['12-test'], 5);
  assert.equal((await remote()).classrooms.find(c => c.id === '5-a').students[0].scores['8-test'], original.classrooms.find(c => c.id === '5-a').students[0].scores['8-test']);
  assert.equal(await page.locator('.stat-value').nth(2).innerText(), '5');
  await page.screenshot({ path: '/tmp/sijill-features-desktop.png', fullPage: true });
  console.log('PASS: week 12 across all classes, Arabic name, blank scores, Arabic input, persistence, original grades preserved');

  await page.getByRole('button', { name: 'تصدير PDF', exact: true }).click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), 1);
  assert.equal(await page.locator('.export-stage img').count(), 2);
  assert.match(await page.locator('.preview-toolbar').innerText(), /الثاني عشر فقط/);
  assert.equal(await page.locator('.export-stage thead tr').first().locator('th').count(), 3);
  await page.locator('.export-stage').evaluate(el => { el.style.left = '0'; el.style.zIndex = '99999'; });
  await page.locator('.export-stage .print-page').screenshot({ path: '/tmp/sijill-week12-print.png' });
  await page.locator('.export-stage').evaluate(el => { el.style.left = '-20000px'; el.style.zIndex = '-1'; });
  const event = page.waitForEvent('download', { timeout: 90000 });
  await page.getByRole('button', { name: 'تنزيل ملف PDF', exact: true }).click();
  await (await event).saveAs('/tmp/sijill-week12.pdf');
  await page.waitForFunction(() => !document.querySelector('.preview-footer .button-primary')?.disabled);
  const pdf = await readFile('/tmp/sijill-week12.pdf');
  assert.ok(pdf.length > 20000);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
  await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click();
  await page.getByLabel('تصفية الأسبوع').selectOption('all');
  await page.getByRole('button', { name: 'تصدير PDF', exact: true }).click();
  await page.waitForSelector('.preview-paper');
  assert.equal(await page.locator('.preview-paper').count(), 2);
  assert.equal(await page.locator('.export-stage .print-page').first().locator('thead tr').first().locator('th').count(), 6);
  assert.equal(await page.locator('.export-stage .print-page').nth(1).locator('thead tr').first().locator('th').count(), 3);
  await page.getByRole('button', { name: 'إغلاق النافذة', exact: true }).click();
  console.log('PASS: weekly PDF includes both uploaded logos; all-week export paginates four weeks per A4 page');

  await page.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  await page.getByLabel('رقم الأسبوع الجديد').fill('12');
  assert.ok(await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'فتح الأسبوع الثاني عشر', exact: true }).click();
  assert.equal(await page.getByLabel('تصفية الأسبوع').inputValue(), '12');
  await page.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  await page.getByLabel('رقم الأسبوع الجديد').fill('0');
  assert.ok(await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).isDisabled());
  await page.getByLabel('رقم الأسبوع الجديد').fill('41');
  assert.ok(await page.getByRole('button', { name: 'إنشاء جدول الأسبوع', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
  assert.deepEqual(errors, []);
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, isMobile: true });
  const phone = await mobileContext.newPage();
  await phone.goto('/', { waitUntil: 'networkidle' });
  await phone.waitForSelector('.score-input:not(:disabled)');
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await phone.locator('.report-branding .logo-upload').count(), 2);
  await phone.screenshot({ path: '/tmp/sijill-features-mobile.png', fullPage: true });
  await phone.getByRole('button', { name: 'أسبوع جديد', exact: true }).click();
  assert.ok(await phone.locator('[role="dialog"]').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
  await mobileContext.close();
  console.log('PASS: duplicate prevention, week range validation, mobile uploads and weekly dialog');
} finally {
  for (const classroom of original.classrooms) {
    const response = await page.request.put('/api/classrooms', { data: classroom });
    assert.equal(response.status(), 200, 'Restore original classroom after feature testing');
  }
  const settingsResponse = await page.request.put('/api/settings', { data: original.settings });
  assert.equal(settingsResponse.status(), 200);
  const restored = await remote();
  assert.deepEqual(restored.classrooms.map(c => c.students), original.classrooms.map(c => c.students));
  assert.equal(restored.settings.rightLogo, original.settings.rightLogo);
  assert.equal(restored.settings.leftLogo, original.settings.leftLogo);
  await browser.close();
  console.log('Original classrooms, weeks, grades, and logos restored after testing.');
}
