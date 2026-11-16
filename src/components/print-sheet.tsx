'use client';
/* eslint-disable @next/next/no-img-element -- Local resized raster logos are embedded directly in printable documents. */
import { forwardRef, type CSSProperties } from 'react';
import { METRICS, className, classWeeks, pageCount, scoreKey, weekName, type Classroom, type Settings, type WeekSelection } from '@/lib/data';
import { SchoolEmblem } from './brand';

export type PrintPage = { classroom: Classroom; students: Classroom['students']; weeks: number[]; page: number; pages: number };
export function makePrintPages(classrooms: Classroom[], selectedWeek: WeekSelection = 'all'): PrintPage[] {
  return classrooms.flatMap(classroom => {
    const weeks = classWeeks(classroom).filter(w => selectedWeek === 'all' || (Array.isArray(selectedWeek) ? selectedWeek.includes(w) : w === selectedWeek));
    if (!weeks.length) return [];
    const groups = Array.from({ length: Math.ceil(weeks.length / 4) }, (_, i) => weeks.slice(i * 4, i * 4 + 4));
    const studentPages = Math.max(1, Math.ceil(classroom.students.length / 19));
    const total = pageCount(classroom, selectedWeek);
    return groups.flatMap((group, groupIndex) => Array.from({ length: studentPages }, (_, page) => ({
      classroom, students: classroom.students.slice(page * 19, (page + 1) * 19), weeks: group,
      page: groupIndex * studentPages + page + 1, pages: total,
    })));
  });
}
const colors = ['#fcf0e3', '#eeebf5', '#edf3e8', '#f7eaea', '#eeeedd'];
export const PrintSheets = forwardRef<HTMLDivElement, { pages: PrintPage[]; settings: Settings }>(function PrintSheets({ pages, settings }, ref) {
  return <div ref={ref} className="print-output" dir="rtl" style={{ fontFamily: '"IBM Plex Sans Arabic", Arial, sans-serif', color: '#253449', background: '#ffffff' }}>
    {pages.map(({ classroom: c, students, weeks, page, pages: total }, index) => <section className="print-page" key={`${c.id}-${weeks.join('-')}-${page}`} style={{ boxSizing: 'border-box', width: 1120, height: 792, padding: '20px 25px', background: '#ffffff', position: 'relative', overflow: 'hidden', breakAfter: 'page', pageBreakAfter: index === pages.length - 1 ? 'auto' : 'always' }}>
      <div style={{ border: '2px solid #46516b', padding: 5, background: '#fbecda', height: 132, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', height: 57 }}>
          {settings.rightLogo ? <img src={settings.rightLogo} alt="شعار يمين الترويسة" style={{ width: 220, height: 57, objectFit: 'contain' }} /> : <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><SchoolEmblem /><div><div style={{ fontSize: 22, fontWeight: 700, color: '#963e45', lineHeight: 1.35 }}>{settings.school}</div><div style={{ fontSize: 9, color: '#a18444', letterSpacing: 1 }}>TARBYH NAMOUTHAIJAH SCHOOLS · 1958</div></div></div>}
          {settings.leftLogo ? <img src={settings.leftLogo} alt="شعار يسار الترويسة" style={{ width: 220, height: 57, objectFit: 'contain' }} /> : <div style={{ textAlign: 'left', color: '#356778' }}><div style={{ fontSize: 27, fontWeight: 700, letterSpacing: 5, lineHeight: 1 }}>NCLE</div><div style={{ fontSize: 10, marginTop: 6 }}>الشركة الوطنية للتربية والتعليم</div><div style={{ fontSize: 7, letterSpacing: .3 }}>NATIONAL COMPANY FOR LEARNING & EDUCATION</div></div>}
        </div>
        <svg width="1060" height="62" viewBox="0 0 1060 70" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0 }} aria-hidden="true"><path d="M0 40C200 40 230 2 480 2C750 2 800 32 1060 25V70H0Z" fill="#ffffff" stroke="#243b53" strokeWidth="3" /><path d="M0 43C280 47 330 12 570 12C800 12 950 40 1060 36" fill="none" stroke="#dbab72" strokeWidth="2" /></svg>
        <div style={{ position: 'absolute', top: 78, right: 180, left: 180, textAlign: 'center', zIndex: 1, lineHeight: 1.3 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#94762d' }}>{settings.school} - {settings.campus}</div><div style={{ fontSize: 15, fontWeight: 700, color: '#a34c50', marginTop: 3 }}>سجل متابعة الطلاب{weeks.length === 1 ? ` — الأسبوع ${weekName(weeks[0])}` : ''}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '.7fr 1.2fr .7fr 1.2fr .8fr 1.2fr .9fr 1.8fr', border: '1px solid #e5dccb', marginTop: 12, fontSize: 11, textAlign: 'center', height: 34, alignItems: 'center', background: '#f9eddc' }}>
        <strong>المادة</strong><span style={{ background: '#edf0e5', height: '100%', display: 'grid', placeItems: 'center' }}>{c.subject}</span><strong>الصف</strong><span style={{ background: '#edf0e5', height: '100%', display: 'grid', placeItems: 'center' }}>{className(c)}</span><strong>الفصل الدراسي</strong><span style={{ background: '#edf0e5', height: '100%', display: 'grid', placeItems: 'center' }}>{c.term.replace('الفصل الدراسي ', '')}</span><strong>معلم المادة</strong><span style={{ background: '#edf0e5', height: '100%', display: 'grid', placeItems: 'center' }}>{settings.teacherName}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 12, fontSize: 10 }}>
        <colgroup><col style={{ width: 30 }} /><col style={{ width: weeks.length === 1 ? 350 : 252 }} />{weeks.flatMap(w => METRICS.map(m => <col key={`${w}-${m.key}`} />))}</colgroup>
        <thead><tr><th rowSpan={2} style={printHead}>م</th><th rowSpan={2} style={printHead}>اسم الطالب</th>{weeks.map(week => <th colSpan={5} key={week} style={{ ...printHead, height: 29 }}>الأسبوع {weekName(week)}</th>)}</tr>
          <tr>{weeks.flatMap(week => METRICS.map((m, i) => <th key={`${week}-${m.key}`} style={{ ...printHead, background: colors[i], height: 43, fontSize: weeks.length === 1 ? 11 : 9, fontWeight: 500, padding: '2px 5px', lineHeight: 1.45 }}>{m.label}<br /><span style={{ fontSize: 8, color: '#667085' }}>({m.max})</span></th>))}</tr></thead>
        <tbody>{students.map(student => <tr key={student.id} style={{ height: 21 }}><td style={{ ...printCell, background: '#edf1f6', fontWeight: 600 }}>{student.position}</td><td style={{ ...printCell, textAlign: 'right', padding: '1px 9px', whiteSpace: 'nowrap', fontSize: 10 }}>{student.name}</td>{weeks.flatMap(week => METRICS.map((m, i) => <td key={`${week}-${m.key}`} style={{ ...printCell, background: colors[i], fontSize: 11, fontWeight: 500 }}>{student.scores[scoreKey(week, m.key)] ?? '—'}</td>))}</tr>)}</tbody>
      </table>
      {!students.length && <p style={{ textAlign: 'center', color: '#8b929c', padding: 30, fontSize: 12 }}>لا يوجد طلاب في هذا الفصل بعد.</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 23, fontSize: 10, textAlign: 'center' }}>
        <div><strong style={{ color: '#a34249' }}>معلم المادة: </strong>{settings.teacherName}<div style={{ borderBottom: '1px dotted #aab2bc', width: 140, margin: '14px auto 0' }} /></div>
        <div><strong style={{ color: '#a34249' }}>مشرف المادة: </strong>غدير الهديب<div style={{ borderBottom: '1px dotted #aab2bc', width: 120, margin: '14px auto 0' }} /></div>
        <div><strong style={{ color: '#a34249' }}>المشرف الأكاديمي: </strong>عبد الحكيم عامر النهدي<div style={{ borderBottom: '1px dotted #aab2bc', width: 150, margin: '14px auto 0' }} /></div>
        <div><strong style={{ color: '#a34249' }}>مدير المدرسة: </strong>رشيد الرشيد<div style={{ borderBottom: '1px dotted #aab2bc', width: 120, margin: '14px auto 0' }} /></div>
      </div>
      <div style={{ position: 'absolute', bottom: 15, left: 27, right: 27, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e9ed', paddingTop: 6, color: '#8b929c', fontSize: 8 }}><span>{settings.school} · {settings.academicYear} · {c.subject}</span><span>{weeks.length === 1 ? `الأسبوع ${weekName(weeks[0])}` : `الأسابيع ${weeks[0]}–${weeks[weeks.length - 1]}`}</span><span>سجل متابعة الطلاب · صفحة {page} من {total}</span></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: '#46516b' }} />
    </section>)}
  </div>;
});
const printHead: CSSProperties = { border: '1px solid #9da9b7', background: '#e5ecf4', fontWeight: 600, padding: '3px 4px', textAlign: 'center' };
const printCell: CSSProperties = { border: '1px solid #b7bdc6', textAlign: 'center', padding: '1px 3px' };

export async function downloadPdf(container: HTMLElement, filename: string, onProgress?: (current: number, total: number) => void) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas-pro')]);
  await document.fonts.ready;
  await Promise.all(Array.from(container.querySelectorAll('img')).map(image => image.decode()));
  const elements = Array.from(container.querySelectorAll<HTMLElement>('.print-page'));
  if (!elements.length) throw new Error('لا توجد صفحات للطباعة');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: filename, subject: 'Student follow-up record', creator: 'Sijill' });
  for (let i = 0; i < elements.length; i++) {
    if (i > 0) pdf.addPage('a4', 'landscape');
    const canvas = await html2canvas(elements[i], { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 1440, windowHeight: 1000, scrollX: 0, scrollY: 0 });
    const width = Math.min(283, 196 * canvas.width / canvas.height);
    const height = canvas.height * width / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (297 - width) / 2, (210 - height) / 2, width, height, undefined, 'FAST');
    onProgress?.(i + 1, elements.length);
  }
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
