'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Ellipsis, UserRoundCog, Eraser, Download, Maximize2, Minimize2, ListFilter, CircleAlert, NotebookPen, SearchX, MoveHorizontal, CalendarPlus, CalendarDays, Printer, WandSparkles, Dices, ListChecks } from 'lucide-react';
import { METRICS, classWeeks, scoreKey, studentTotal, weekName, type Classroom } from '@/lib/data';

export function GradeTable({ classroom: c, query, onQuery, onScore, onManage, onClear, onBackup, ready, focusMode, onFocusMode, selectedWeek, onWeekChange, onAddWeek, onPrintWeek, onAutofill, onRandomQuiz, onOtherMarks }: {
  classroom: Classroom; query: string; onQuery: (value: string) => void;
  onScore: (studentId: string, key: string, value: number | null) => void;
  onManage: () => void; onClear: (week: number) => void; onBackup: () => void;
  ready: boolean; focusMode: boolean; onFocusMode: () => void;
  selectedWeek: number | 'all'; onWeekChange: (week: number | 'all') => void;
  onAddWeek: () => void; onPrintWeek: (week: number) => void; onAutofill: () => void; onRandomQuiz: () => void; onOtherMarks: () => void;
}) {
  const [pageState, setPageState] = useState({ key: '', value: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const availableWeeks = classWeeks(c);
  const week = selectedWeek !== 'all' && availableWeeks.includes(selectedWeek) ? selectedWeek : 'all';
  const weeks = week === 'all' ? availableWeeks : [week];
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').trim();
  const filtered = c.students.filter(s => normalize(s.name).includes(normalize(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const filterKey = `${c.id}|${query}|${week}|${pageSize}`;
  const currentPage = Math.min(pageState.key === filterKey ? pageState.value : 1, pages);
  function setPage(value: number) { setPageState({ key: filterKey, value }); }
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const maximum = weeks.length * 9;
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const escape = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [menu]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }, [error]);
  function navigate(event: KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    let nextRow = row; let nextCol = col;
    if (event.key === 'Enter' || event.key === 'ArrowDown') nextRow++;
    else if (event.key === 'ArrowUp') nextRow--;
    else if (event.key === 'ArrowLeft') nextCol++;
    else if (event.key === 'ArrowRight') nextCol--;
    else return;
    event.preventDefault();
    const target = tableRef.current?.querySelector<HTMLInputElement>(`input[data-cell="${nextRow}-${nextCol}"]`);
    if (target) { target.focus(); target.select(); }
    else if (event.key === 'Enter' && currentPage < pages) { setPage(currentPage + 1); setTimeout(() => tableRef.current?.querySelector<HTMLInputElement>(`input[data-cell="0-${col}"]`)?.focus(), 60); }
  }
  return <section className="gradebook-panel" aria-label="سجل الدرجات التفاعلي">
    <div className="table-toolbar">
      <div className="table-title"><NotebookPen size={19} /><h2>سجل الدرجات</h2><span className="count-pill">{c.students.length} طالبًا</span><button className="add-week-inline" onClick={onAddWeek} disabled={!ready} title="إنشاء جدول لأسبوع جديد، مثل الأسبوع الثاني عشر" aria-label="أسبوع جديد"><CalendarPlus size={16} /><span>أسبوع جديد</span></button><button className="autofill-inline" onClick={onAutofill} disabled={!ready} title="ملء أسبوع محدد أو جميع الأسابيع تلقائيًا" aria-label="الملء التلقائي"><WandSparkles size={16} /><span>ملء تلقائي</span></button></div>
      <div className="table-tools">
        <label className="search-field"><Search size={16} /><input value={query} onChange={e => onQuery(e.target.value)} placeholder="ابحث عن طالب..." aria-label="البحث عن طالب" />{query && <button onClick={() => onQuery('')} aria-label="مسح البحث">×</button>}</label>
        <label className="select-wrap week-select"><ListFilter size={15} /><select aria-label="تصفية الأسبوع" value={week} onChange={e => onWeekChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}><option value="all">جميع الأسابيع</option>{availableWeeks.map(w => <option key={w} value={w}>الأسبوع {weekName(w)}</option>)}</select><ChevronDown size={13} /></label>
        <button className="icon-button bordered" title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'} aria-label={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'} onClick={onFocusMode}>{focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        <div className="dropdown-anchor" ref={menuRef}><button className={`icon-button bordered ${menu ? 'selected' : ''}`} title="خيارات السجل" aria-label="خيارات السجل" aria-expanded={menu} onClick={() => setMenu(!menu)}><Ellipsis size={19} /></button>
          {menu && <div className="dropdown-menu"><button onClick={() => { setMenu(false); onManage(); }}><UserRoundCog size={16} />إدارة الطلاب</button><button onClick={() => { setMenu(false); onAddWeek(); }}><CalendarPlus size={16} />إنشاء جدول أسبوعي</button><button disabled={!ready} onClick={() => { setMenu(false); onAutofill(); }}><WandSparkles size={16} />ملء الدرجات تلقائيًا</button><button disabled={week === 'all'} onClick={() => { setMenu(false); if (week !== 'all') onPrintWeek(week); }}><Printer size={16} />تصدير هذا الأسبوع PDF</button><button disabled={week === 'all'} onClick={() => { setMenu(false); if (week !== 'all') onClear(week); }}><Eraser size={16} />تفريغ درجات الأسبوع</button><button onClick={() => { setMenu(false); onBackup(); }}><Download size={16} />تنزيل نسخة احتياطية</button>{week === 'all' && <small>حدّد أسبوعًا لطباعته أو تفريغ درجاته.</small>}</div>}
        </div>
      </div>
    </div>
    {error ? <div className="table-guidance guidance-error" role="alert"><div><CircleAlert size={14} /><span>{error}</span></div></div> : <div className="week-context"><span><span className="live-dot" />{week === 'all' ? `${availableWeeks.length} أسابيع · جميع خانات الرصد تُحفظ تلقائيًا` : `جدول الأسبوع ${weekName(week)} · ${c.students.length} طالبًا`}</span><span>الاختبار من <b>5</b><span className="guidance-divider">|</span>باقي البنود من <b>1</b></span></div>}
    <div className="quick-fill-actions" aria-label="إجراءات إدخال الدرجات"><span className="quick-fill-actions-label">إجراءات سريعة</span><button className="quick-action-button quick-action-random" onClick={onRandomQuiz} disabled={!ready} aria-label="الاختبارات العشوائية" title="توزيع درجات الاختبارات القصيرة من 0 إلى 5 مع مراعاة الأسابيع السابقة"><Dices size={16} /><span>الاختبارات العشوائية</span></button><button className="quick-action-button quick-action-other" onClick={onOtherMarks} disabled={!ready} aria-label="إكمال البنود الأخرى" title="ملء المشاركة والواجبات والأنشطة والمهام الأدائية بالدرجة 1 دفعة واحدة"><ListChecks size={16} /><span>إكمال البنود الأخرى</span></button><span className="quick-fill-actions-note"><CalendarDays size={13} />{week === 'all' ? 'جميع الأسابيع' : `الأسبوع ${weekName(week)}`} · الفصل الحالي</span></div>
    <div className="mobile-scroll-hint"><MoveHorizontal size={14} />مرّر الجدول أفقيًا لعرض جميع الأسابيع والبنود</div>
    <div className="table-scroll">
      <table className={`grade-table ${week !== 'all' ? 'single-week' : ''}`} style={week === 'all' ? { minWidth: Math.max(968, 274 + weeks.length * 180) } : undefined} ref={tableRef}>
        <colgroup><col className="number-col" /><col className="name-col" />{weeks.flatMap(w => METRICS.map(m => <col className="score-col" style={week === 'all' ? { width: `${73 / (weeks.length * 5)}%` } : undefined} key={`${w}-${m.key}`} />))}<col className="total-col" /></colgroup>
        <thead><tr><th className="sticky-number" rowSpan={2}>م</th><th className="sticky-name" rowSpan={2}>اسم الطالب</th>{weeks.map((w, i) => <th className={`week-heading ${i % 2 ? 'alternate' : ''}`} colSpan={5} key={w}><span>الأسبوع {weekName(w)}</span><span className="week-number">{String(w).padStart(2, '0')}</span></th>)}<th className="total-heading" rowSpan={2}>المجموع<span>من {maximum}</span></th></tr>
          <tr>{weeks.flatMap(w => METRICS.map((m, i) => <th className={`metric-heading metric-${m.color} ${i === 4 ? 'week-end' : ''}`} key={`${w}-${m.key}`}><span>{m.label}</span><small>من {m.max}</small></th>))}</tr></thead>
        <tbody>{visible.map((student, row) => <tr key={student.id}><td className="sticky-number student-number">{student.position}</td><td className="sticky-name student-name" title={student.name}>{student.name}</td>{weeks.flatMap(w => METRICS.map((metric, col) => {
          const index = weeks.indexOf(w) * 5 + col;
          const key = scoreKey(w, metric.key);
          const value = student.scores[key];
          return <td className={`score-cell ${col === 4 ? 'week-end' : ''}`} key={key}><input className={`score-input metric-${metric.color} ${value === 0 ? 'zero-score' : ''}`} type="text" inputMode="numeric" maxLength={1} autoComplete="off" disabled={!ready} value={value ?? ''} placeholder="—" aria-label={`${student.name}، الأسبوع ${weekName(w)}، ${metric.label}، من ${metric.max}`} title={`${metric.label}: من ${metric.max}`} data-cell={`${row}-${index}`} onFocus={e => e.target.select()} onKeyDown={e => navigate(e, row, index)} onChange={e => {
            const raw = e.target.value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
            if (raw !== '' && !/^\d$/.test(raw)) return;
            const number = raw === '' ? null : Number(raw);
            if (number !== null && number > metric.max) { setError(`${metric.label}: الدرجة يجب أن تكون بين 0 و${metric.max}.`); return; }
            onScore(student.id, key, number);
          }} /></td>;
        }))}<td className="student-total"><span>{weeks.every(w => METRICS.every(m => student.scores[scoreKey(w, m.key)] == null)) ? '—' : studentTotal(student, weeks)}</span><small>/{maximum}</small></td></tr>)}
          {!visible.length && <tr><td colSpan={weeks.length * 5 + 3}><div className="empty-state table-empty"><SearchX size={34} /><h3>{query ? 'لم نعثر على طالب بهذا الاسم' : 'لا يوجد طلاب في هذا الفصل بعد'}</h3><p>{query ? 'جرّب اسمًا آخر أو امسح البحث لعرض جميع الطلاب.' : 'أضف طالبًا جديدًا لبدء رصد الدرجات.'}</p><button className="button button-secondary" onClick={() => query ? onQuery('') : onManage()}>{query ? 'عرض جميع الطلاب' : 'إضافة طالب'}</button></div></td></tr>}
        </tbody>
      </table>
    </div>
    <footer className="table-pagination"><div className="pagination-description">عرض <strong>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</strong> من <strong>{filtered.length}</strong> طالبًا<span className="pagination-divider" /><label>الصفوف<select aria-label="عدد الصفوف في الصفحة" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={15}>15</option><option value={25}>25</option><option value={100}>الكل</option></select></label></div><div className="pagination-buttons"><button className="icon-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="الصفحة السابقة"><ChevronRight size={17} /></button>{Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - currentPage) <= 1).map(p => <button key={p} className={`page-number ${p === currentPage ? 'active' : ''}`} onClick={() => setPage(p)} aria-label={`الصفحة ${p}`} aria-current={p === currentPage ? 'page' : undefined}>{p}</button>)}<button className="icon-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="الصفحة التالية"><ChevronLeft size={17} /></button></div></footer>
  </section>;
}
