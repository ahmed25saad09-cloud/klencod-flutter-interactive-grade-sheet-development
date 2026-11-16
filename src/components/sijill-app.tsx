'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Archive, ArrowDownToLine, ArrowLeft, Bell, BookOpen, CalendarDays, CalendarPlus, CalendarRange, ChartNoAxesCombined, Check, ChevronDown, ChevronLeft, CircleAlert, CircleCheck, CircleHelp, CloudCheck, Download, FileCheck2, FileText, FlaskConical, FolderArchive, GraduationCap, HardDrive, History, House, ImagePlus, Layers3, LoaderCircle, Menu, NotebookPen, Plus, Printer, Save, Settings2, ShieldCheck, Sparkles, Trash2, Undo2, UserRound, UsersRound, WandSparkles, X } from 'lucide-react';
import { AppLogo, SchoolEmblem } from './brand';
import { GradeTable } from './grade-table';
import { Modal } from './modal';
import { LogoUpload } from './logo-upload';
import { WeekManager } from './week-manager';
import { AutofillDialog } from './autofill-dialog';
import { RandomQuizDialog } from './random-quiz-dialog';
import { OtherMarksDialog } from './other-marks-dialog';
import { PrintOptionsDialog } from './print-options-dialog';
import type { QuizOptions, OtherOptions } from '@/lib/quick-fill';
import { applyFillPlan, buildFillPlan, type FillChange, type FillOptions } from '@/lib/autofill';
import { PrintSheets, makePrintPages, downloadPdf, type PrintPage } from './print-sheet';
import { className, classStats, classWeeks, METRICS, MAX_WEEK, maxTotal, pageCount, scoreKey, studentTotal, weekName, type Classroom, type LogoSide, type SavedReport, type Settings, type Student, type WeekSelection } from '@/lib/data';
import { useWorkspace } from '@/lib/use-workspace';

type View = 'records' | 'classes' | 'reports' | 'saved';
type Dialog = 'students' | 'settings' | 'help' | 'preview' | 'clear' | 'restore' | 'delete' | 'weeks' | 'autofill' | 'randomQuiz' | 'otherMarks' | 'printOptions' | null;
type ReportSummary = Omit<SavedReport, 'payload'>;
const VIEW_LABELS: Record<View, string> = { records: 'سجل متابعة الطلاب', classes: 'الفصول والطلاب', reports: 'التقارير والإحصاءات', saved: 'السجلات المحفوظة' };
const VIEW_DESCRIPTIONS: Record<View, string> = {
  records: 'تابع تقدّم طلابك، وارصد درجاتهم، واحتفظ بسجل منظّم لكل أسبوع.',
  classes: 'كل فصولك وطلابك في مكان واحد. اختر فصلًا وابدأ من حيث توقفت.',
  reports: 'صورة واضحة لمستوى الرصد وتقدّم الطلاب عبر جميع الفصول.',
  saved: 'نُسخ محفوظة من سجلاتك، للرجوع إليها واستعادتها وقتما تحتاج.',
};
const formatDate = (date: string) => new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

function StatCard({ label, value, note, icon, color }: { label: string; value: string | number; note: string; icon: ReactNode; color: string }) {
  return <article className="stat-card"><div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div><span className={`stat-icon ${color}`}>{icon}</span></article>;
}
function PreviewPages({ pages, settings }: { pages: PrintPage[]; settings: Settings }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(.7);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setScale(Math.min(1, (entries[0].contentRect.width - 8) / 1120)));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div className="preview-pages" ref={container}>{pages.map((page, i) => <div className="preview-paper" key={`${page.classroom.id}-${page.weeks.join('-')}-${i}`} style={{ width: 1120 * scale, height: 792 * scale }}><div style={{ transform: `scale(${scale})`, transformOrigin: 'top right', width: 1120, height: 792 }}><PrintSheets pages={[page]} settings={settings} /></div><span className="preview-page-label">{i + 1} / {pages.length}</span></div>)}</div>;
}

export default function SijillApp() {
  const { workspace, saveState, ready, dirty, lastSaved, updateClass, updateClasses, updateSettings, replaceWorkspace, flush, createSnapshot } = useWorkspace();
  const [view, setView] = useState<View>('records');
  const [activeId, setActiveId] = useState('5-a');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [lastFill, setLastFill] = useState<{ changes: FillChange[]; label: string } | null>(null);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [unread, setUnread] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'warning' | 'error' } | null>(null);
  const [editorClass, setEditorClass] = useState<Classroom | null>(null);
  const [draftStudents, setDraftStudents] = useState<Student[]>([]);
  const [newName, setNewName] = useState('');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorTerm, setEditorTerm] = useState('');
  const [editorError, setEditorError] = useState('');
  const [draftSettings, setDraftSettings] = useState(workspace.settings);
  const [clearWeek, setClearWeek] = useState(8);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<SavedReport | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ReportSummary | null>(null);
  const [preview, setPreview] = useState<{ classrooms: Classroom[]; settings: Settings; weekFilter: WeekSelection } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const printRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const active = workspace.classrooms.find(c => c.id === activeId) || workspace.classrooms[0];
  const allWeeks = [...new Set(workspace.classrooms.flatMap(classWeeks))].sort((a, b) => a - b);
  const totalStudents = workspace.classrooms.reduce((sum, c) => sum + c.students.length, 0);
  const entered = workspace.classrooms.reduce((sum, c) => sum + classStats(c).entered, 0);
  const totalCells = workspace.classrooms.reduce((sum, c) => sum + classStats(c).total, 0);
  const completion = totalCells ? Math.round(entered / totalCells * 100) : 0;
  const pages = useMemo(() => preview ? makePrintPages(preview.classrooms, preview.weekFilter) : [], [preview]);
  const notify = useCallback((message: string, kind: 'success' | 'warning' | 'error' = 'success') => setToast({ message, kind }), []);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!notifications) return;
    const close = (event: MouseEvent) => { if (!notificationRef.current?.contains(event.target as Node)) setNotifications(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [notifications]);
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const response = await fetch('/api/reports', { cache: 'no-store' });
      if (!response.ok) throw new Error('reports');
      setReports(await response.json());
    } catch { notify('تعذر تحميل النسخ المحفوظة. حاول مرة أخرى.', 'error'); }
    finally { setReportsLoading(false); }
  }, [notify]);
  useEffect(() => {
    if (view !== 'saved') return;
    const timer = setTimeout(() => void loadReports(), 0);
    return () => clearTimeout(timer);
  }, [view, loadReports]);

  function navigate(next: View) { setView(next); setMobileNav(false); setFocusMode(false); setNotifications(false); }
  function openClass(c: Classroom) { setActiveId(c.id); setSelectedWeek('all'); setQuery(''); navigate('records'); }
  function openSettings() { setDraftSettings({ ...workspace.settings }); setDialog('settings'); setMobileNav(false); }
  function openWeekManager() { setDialog('weeks'); setMobileNav(false); }
  function openAutofill() { setDialog('autofill'); setMobileNav(false); }
  function openPrintOptions() { setDialog('printOptions'); setMobileNav(false); }
  function openRandomQuiz() { setDialog('randomQuiz'); setMobileNav(false); }
  function openOtherMarks() { setDialog('otherMarks'); setMobileNav(false); }
  function commitFillChanges(changes: FillChange[], describe: (count: number) => string, week: number | 'all') {
    const applicable = changes.filter(change => {
      const student = workspace.classrooms.find(c => c.id === change.classroomId)?.students.find(s => s.id === change.studentId);
      return student && (student.scores[change.key] ?? null) === change.before;
    });
    if (!applicable.length) { notify('لا توجد خانات قابلة للتغيير بهذه القيم، أو تغيّرت الدرجات بعد المعاينة.', 'warning'); return; }
    updateClasses(applyFillPlan(workspace.classrooms, applicable));
    const label = describe(applicable.length);
    setLastFill({ changes: applicable, label });
    setDialog(null); setSelectedWeek(week); setQuery(''); navigate('records');
    const skipped = changes.length - applicable.length;
    notify(`${label} تُحفظ تلقائيًا، ويمكنك التراجع عن آخر ملء.${skipped ? ` تم تجاهل ${skipped} خانة تغيّرت بعد المعاينة.` : ''}`);
  }
  function applyAutofill(options: FillOptions) {
    const plan = buildFillPlan(workspace.classrooms, active.id, options);
    if (!plan.changes.length) { notify('لا توجد خانات تحتاج إلى تغيير بهذه القيم.', 'warning'); return; }
    commitFillChanges(plan.changes, count => `تم ملء ${count} خانة ${options.week === 'all' ? 'في جميع الأسابيع' : `في الأسبوع ${weekName(options.week)}`} ${options.scope === 'all' ? 'لجميع الفصول' : `للفصل ${className(active)}`}.`, options.week);
  }
  function applyRandomQuiz(changes: FillChange[], options: QuizOptions) {
    commitFillChanges(changes, count => `تم إدخال ${count} درجة اختبار قصيرة عشوائية ${options.week === 'all' ? 'في جميع الأسابيع' : `في الأسبوع ${weekName(options.week)}`}${options.useHistory ? ' مع مراعاة السجل السابق' : ''}.`, options.week);
  }
  function applyOtherMarks(changes: FillChange[], options: OtherOptions) {
    commitFillChanges(changes, count => `تم إكمال ${count} خانة في المشاركة والواجبات والأنشطة والمهام الأدائية بالدرجة 1، دون تغيير الاختبارات.`, options.week);
  }
  function undoAutofill() {
    if (!lastFill) return;
    const patches = new Map<string, Map<string, Record<string, number | null>>>();
    let restored = 0;
    for (const change of lastFill.changes) {
      const student = workspace.classrooms.find(c => c.id === change.classroomId)?.students.find(s => s.id === change.studentId);
      if (!student || (student.scores[change.key] ?? null) !== change.after) continue;
      if (!patches.has(change.classroomId)) patches.set(change.classroomId, new Map());
      const students = patches.get(change.classroomId)!;
      students.set(change.studentId, { ...students.get(change.studentId), [change.key]: change.before });
      restored++;
    }
    if (!restored) { setLastFill(null); notify('تغيّرت القيم أو الطلاب بعد الملء، لذلك لم تُستبدل أي تعديلات لاحقة.', 'warning'); return; }
    updateClasses(workspace.classrooms.filter(c => patches.has(c.id)).map(c => ({ ...c, students: c.students.map(s => patches.get(c.id)?.has(s.id) ? { ...s, scores: { ...s.scores, ...patches.get(c.id)!.get(s.id) } } : s) })));
    setLastFill(null);
    const skipped = lastFill.changes.length - restored;
    notify(`تم التراجع عن ${restored} خانة.${skipped ? ` احتفظنا بـ ${skipped} قيمة تغيّرت بعد الملء.` : ''}`);
  }
  function openWeeklyTable(week: number) { setSelectedWeek(week); setQuery(''); setDialog(null); navigate('records'); }
  function createWeek(week: number, scope: 'current' | 'all', openAfter: boolean) {
    if (!Number.isInteger(week) || week < 1 || week > MAX_WEEK) return;
    const targets = (scope === 'all' ? workspace.classrooms : [active]).filter(c => !classWeeks(c).includes(week));
    if (!targets.length) { notify('هذا الأسبوع موجود بالفعل في الفصول المحددة.', 'warning'); return; }
    updateClasses(targets.map(c => ({ ...c, weeks: [...classWeeks(c), week].sort((a, b) => a - b), students: c.students.map(s => ({ ...s, scores: { ...Object.fromEntries(METRICS.map(m => [scoreKey(week, m.key), null])), ...s.scores } })) })));
    setDialog(null);
    if (openAfter) { setSelectedWeek(week); setQuery(''); navigate('records'); }
    notify(`تم إنشاء جدول الأسبوع ${weekName(week)} ${scope === 'all' ? `في ${targets.length} فصول` : `للفصل ${className(active)}`}. ابدأ بإدخال الدرجات.`);
  }
  function changeLogo(side: LogoSide, value: string | null) {
    updateSettings({ ...workspace.settings, [side]: value });
    notify(value ? 'تم تحديث الشعار. سيظهر في معاينة الطباعة وملفات PDF.' : 'تمت إزالة الشعار واستعادة الترويسة الافتراضية.');
  }
  function openStudents(c: Classroom) {
    setEditorClass(c); setDraftStudents(c.students.map(s => ({ ...s, scores: { ...s.scores } })));
    setEditorSubject(c.subject); setEditorTerm(c.term); setNewName(''); setEditorError(''); setDialog('students');
  }
  function changeScore(studentId: string, key: string, value: number | null) {
    updateClass({ ...active, students: active.students.map(s => s.id === studentId ? { ...s, scores: { ...s.scores, [key]: value } } : s) });
  }
  async function saveAll() {
    if (busy) return;
    setBusy(true);
    const saved = await flush([...dirty]);
    try {
      if (!saved) { notify('تعذّر الاتصال بالخادم. تعديلاتك محفوظة على هذا الجهاز، حاول المزامنة لاحقًا.', 'warning'); return; }
      await createSnapshot(`سجلات المتابعة — ${workspace.settings.academicYear}`, workspace.classrooms.reduce((sum, c) => sum + pageCount(c), 0));
      notify('تم حفظ جميع الدرجات وإنشاء نسخة في السجلات المحفوظة.');
      if (view === 'saved') await loadReports();
    } catch { notify('حُفظت الدرجات، لكن تعذّر إنشاء نسخة إضافية في الأرشيف.', 'warning'); }
    finally { setBusy(false); }
  }
  function backup() {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `sijill-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('تم تنزيل نسخة احتياطية تتضمن جميع الفصول والدرجات.');
  }
  function openPreview(classrooms: Classroom[], weekFilter: WeekSelection = 'all') {
    setPreview({ classrooms: structuredClone(classrooms), settings: { ...workspace.settings }, weekFilter }); setDialog('preview');
    if (dirty.length) void flush([...dirty]);
  }
  async function exportPdf() {
    if (!printRef.current || !preview || exporting || !pages.length) return;
    setExporting(true); setExportProgress({ current: 0, total: pages.length });
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const weekSuffix = preview.weekFilter === 'all' ? '' : Array.isArray(preview.weekFilter) ? (preview.weekFilter.length === 1 ? `-الأسبوع-${weekName(preview.weekFilter[0])}` : `-الأسابيع-${preview.weekFilter.join('-')}`) : `-الأسبوع-${weekName(preview.weekFilter)}`;
      const name = preview.classrooms.length === 1 ? `سجل-${className(preview.classrooms[0])}-${preview.classrooms[0].subject}${weekSuffix}` : `سجلات-متابعة-الطلاب-${preview.classrooms.length === workspace.classrooms.length ? 'جميع-الفصول' : 'فصول-محددة'}${weekSuffix}`;
      await downloadPdf(printRef.current, name, (current, total) => setExportProgress({ current, total }));
      notify(`تم إنشاء ملف PDF بنجاح (${pages.length} صفحة).`);
    } catch { notify('تعذّر إنشاء ملف PDF. يمكنك استخدام زر الطباعة وحفظ الملف كـ PDF.', 'error'); }
    finally { setExporting(false); }
  }
  async function printPages() {
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(printRef.current?.querySelectorAll('img') || []).map(image => image.decode()));
      window.print();
    } catch { notify('تعذر تحميل أحد الشعارات للطباعة. حاول مجددًا.', 'error'); }
  }
  function addDraftStudent() {
    const name = newName.trim();
    if (!name) { setEditorError('اكتب اسم الطالب أولًا.'); return; }
    if (draftStudents.length >= 100) { setEditorError('الحد الأقصى 100 طالب في الفصل.'); return; }
    const scores = Object.fromEntries(classWeeks(editorClass || active).flatMap(w => METRICS.map(m => [scoreKey(w, m.key), null])));
    setDraftStudents([...draftStudents, { id: crypto.randomUUID(), name, position: draftStudents.length + 1, scores }]);
    setNewName(''); setEditorError('');
  }
  function saveStudents() {
    if (!editorClass) return;
    if (!editorSubject.trim()) { setEditorError('يرجى إدخال اسم المادة.'); return; }
    if (draftStudents.some(s => !s.name.trim())) { setEditorError('جميع أسماء الطلاب مطلوبة. احذف الصف الفارغ أو أكمل الاسم.'); return; }
    updateClass({ ...editorClass, subject: editorSubject.trim(), term: editorTerm, students: draftStudents.map((s, i) => ({ ...s, name: s.name.trim(), position: i + 1 })) });
    setDialog(null); notify('تم تحديث بيانات الفصل وقائمة الطلاب.');
  }
  async function restoreReport() {
    if (!restoreCandidate) return;
    setBusy(true);
    replaceWorkspace(restoreCandidate.payload);
    setLastFill(null);
    setSelectedWeek('all');
    setActiveId(restoreCandidate.payload.classrooms[0].id); setDialog(null); navigate('records'); setBusy(false);
    notify('تم استرجاع السجل. ستتم مزامنة النسخة المسترجعة تلقائيًا.');
  }
  async function deleteReport() {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/reports/${deleteCandidate.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete');
      setReports(reports.filter(r => r.id !== deleteCandidate.id)); setDialog(null); notify('تم حذف النسخة المحفوظة. الدرجات الحالية لم تتغير.');
    } catch { notify('تعذر حذف النسخة. حاول مرة أخرى.', 'error'); }
    finally { setBusy(false); }
  }
  async function previewReport(report: ReportSummary) {
    setBusy(true);
    try {
      const response = await fetch(`/api/reports/${report.id}`);
      if (!response.ok) throw new Error('preview');
      const saved = await response.json() as SavedReport;
      setPreview({ classrooms: saved.payload.classrooms, settings: saved.payload.settings, weekFilter: 'all' });
      setDialog('preview');
    } catch { notify('تعذر تحميل النسخة لمعاينتها.', 'error'); }
    finally { setBusy(false); }
  }
  async function openRestore(report: ReportSummary) {
    setBusy(true);
    try {
      const response = await fetch(`/api/reports/${report.id}`);
      if (!response.ok) throw new Error('restore');
      setRestoreCandidate(await response.json()); setDialog('restore');
    } catch { notify('تعذر فتح النسخة المحفوظة.', 'error'); }
    finally { setBusy(false); }
  }

  const saveLabel = saveState === 'saving' || saveState === 'loading' ? 'جارٍ الحفظ...' : saveState === 'local' ? 'محفوظ على الجهاز' : saveState === 'error' ? 'الحفظ يحتاج اتصالًا' : 'جميع التغييرات محفوظة';
  const SaveIcon = saveState === 'saving' || saveState === 'loading' ? LoaderCircle : saveState === 'local' || saveState === 'error' ? HardDrive : CloudCheck;
  const stats = <div className="stats-grid">
    <StatCard label="الفصول الدراسية" value={workspace.classrooms.length} note="جميع فصولك في مكان واحد" icon={<Layers3 size={23} />} color="mint" />
    <StatCard label="إجمالي الطلاب" value={totalStudents} note="طالبًا في سجلات المتابعة" icon={<UsersRound size={23} />} color="blue" />
    <StatCard label="أسابيع المتابعة" value={allWeeks.length} note={allWeeks.length > 1 ? `من الأسبوع ${weekName(allWeeks[0])} إلى ${weekName(allWeeks[allWeeks.length - 1])}` : `الأسبوع ${weekName(allWeeks[0] || 1)}`} icon={<CalendarDays size={23} />} color="amber" />
    <StatCard label="اكتمال رصد الدرجات" value={`${completion}%`} note={completion === 100 ? 'جميع الدرجات مرصودة وجاهزة' : `${entered} من ${totalCells} خانة تم رصدها`} icon={<CircleCheck size={23} />} color="purple" />
  </div>;

  return <>
    <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`} dir="rtl">
      {mobileNav && <button className="sidebar-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <button className="brand-button" onClick={() => navigate('records')} aria-label="سجل — الصفحة الرئيسية"><AppLogo /></button>
        <button className="school-switcher" onClick={openSettings}><span className="school-emblem"><SchoolEmblem muted /></span><span><strong>{workspace.settings.school}</strong><small>{workspace.settings.campus}</small></span><ChevronDown size={14} /></button>
        <div className="nav-section-label">مساحة العمل</div>
        <nav className="primary-nav" aria-label="القائمة الرئيسية">
          {([{ id: 'records', label: 'سجل المتابعة', icon: NotebookPen }, { id: 'classes', label: 'الفصول والطلاب', icon: UsersRound }, { id: 'reports', label: 'التقارير والإحصاءات', icon: ChartNoAxesCombined }, { id: 'saved', label: 'السجلات المحفوظة', icon: Archive }] as const).map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.id === 'classes' && <span className="nav-count">{workspace.classrooms.length}</span>}{item.id === 'records' && view === 'records' && <span className="nav-active-dot" />}</button>)}
        </nav>
        <div className="nav-divider" /><div className="nav-section-label">أدوات المعلم</div>
        <nav className="secondary-nav" aria-label="أدوات المعلم"><button className="nav-item" onClick={openWeekManager} disabled={!ready}><CalendarPlus size={19} strokeWidth={1.7} /><span>الجداول الأسبوعية</span><Plus size={13} className="weekly-nav-plus" /></button><button className="nav-item" onClick={openAutofill} disabled={!ready}><WandSparkles size={19} strokeWidth={1.7} /><span>الملء التلقائي</span><Sparkles size={13} className="autofill-nav-icon" /></button><button className="nav-item" onClick={openPrintOptions} disabled={!ready}><Printer size={19} strokeWidth={1.7} /><span>خيارات الطباعة</span><Printer size={13} className="print-nav-icon" /></button><button className="nav-item" onClick={() => { setDialog('help'); setMobileNav(false); }}><CircleHelp size={19} strokeWidth={1.7} /><span>دليل الاستخدام</span><span className="help-shortcut">؟</span></button><button className="nav-item" onClick={openSettings}><Settings2 size={19} strokeWidth={1.7} /><span>الإعدادات</span></button></nav>
        <div className="sidebar-bottom"><div className="safe-card"><span className="safe-icon"><ShieldCheck size={23} strokeWidth={1.6} /></span><h3>تركيزك على التعليم،<br />وحفظ درجاتك علينا.</h3><p>تُحفظ تعديلاتك تلقائيًا، لتبقى<br />على اطلاع بكل تفاصيل طلابك.</p><span className="safe-status"><span className={`live-dot ${saveState === 'local' || saveState === 'error' ? 'amber-dot' : ''}`} />{saveState === 'local' || saveState === 'error' ? 'الحفظ المحلي متاح' : 'الحفظ التلقائي مفعّل'}</span></div><button className="sidebar-profile" onClick={openSettings}><span className="avatar">أ م</span><span><strong>{workspace.settings.teacherName}</strong><small>معلم المادة</small></span><Settings2 size={16} /></button></div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="فتح القائمة" onClick={() => setMobileNav(true)}><Menu size={21} /></button><House size={16} /><ChevronLeft size={13} /><span>مساحة المعلم</span><ChevronLeft size={13} /><strong>{view === 'records' ? 'سجل المتابعة' : VIEW_LABELS[view]}</strong></div><div className="topbar-actions"><span className="academic-year"><CalendarDays size={15} />العام الدراسي <strong>{workspace.settings.academicYear}</strong></span><span className="topbar-divider" /><div className="dropdown-anchor" ref={notificationRef}><button className="icon-button notification-button" aria-label="الإشعارات" aria-expanded={notifications} onClick={() => { setNotifications(!notifications); setUnread(false); }}><Bell size={19} />{unread && <span className="notification-dot" />}</button>{notifications && <div className="notification-popover"><h3>مساحة عملك، بخطوات بسيطة</h3><div><span className="notice-icon"><Sparkles size={17} /></span><p><strong>أهلًا بك، {workspace.settings.teacherName.split(' ')[0]}</strong><small>فصولك ودرجات طلابك جاهزة للمتابعة.</small></p></div><div><span className="notice-icon"><SaveIcon size={17} /></span><p><strong>{saveLabel}</strong><small>{lastSaved ? `آخر مزامنة: ${lastSaved.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'ابدأ بتعديل أي درجة وسيُحفظ التغيير تلقائيًا.'}</small></p></div><button onClick={() => { setNotifications(false); setDialog('help'); }}>تعرّف على أدوات سجل<ArrowLeft size={15} /></button></div>}</div><button className="top-avatar" onClick={openSettings} aria-label="إعدادات المعلم">أ</button></div></header>
        <main className="main-content">
          <div className="page-heading"><div><div className="heading-eyebrow"><span className="live-dot" />مساحة عمل المعلّم</div><h1>{VIEW_LABELS[view]}</h1><p>{VIEW_DESCRIPTIONS[view]}</p></div><div className="heading-actions"><button className="button button-secondary print-options-button" onClick={openPrintOptions} disabled={!ready}><Printer size={17} /><span>خيارات الطباعة</span></button><button className="button button-secondary" onClick={() => void saveAll()} disabled={busy || !ready} title="حفظ الدرجات وإنشاء نسخة قابلة للاسترجاع">{busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}<span>{busy ? 'جارٍ الحفظ...' : view === 'saved' ? 'حفظ نسخة جديدة' : 'حفظ الدرجات'}</span></button><button className="button button-primary" onClick={() => openPreview(view === 'reports' || view === 'saved' ? workspace.classrooms : [active], view === 'records' ? selectedWeek : 'all')} disabled={!ready}><Download size={17} /><span>{view === 'reports' || view === 'saved' ? 'تصدير جميع الفصول' : 'تصدير PDF'}</span></button></div></div>
          {(view === 'records' || view === 'reports') && stats}
          {view === 'records' && <>
            <section className="class-navigation" aria-label="اختيار الفصل"><div className="section-label"><h2>فصولي الدراسية</h2><span>اختر الفصل لعرض سجل المتابعة</span></div><div className="class-tabs">{workspace.classrooms.map(c => <button key={c.id} className={`class-tab ${active.id === c.id ? 'active' : ''}`} onClick={() => { setActiveId(c.id); setSelectedWeek('all'); setQuery(''); }} aria-pressed={active.id === c.id}><span>{c.section ? className(c) : `${c.grade} · ${c.subject}`}</span><small>{c.students.length}</small></button>)}</div></section>
            <section className="class-details" aria-label="بيانات السجل"><button className="detail-item" onClick={() => openStudents(active)}><FlaskConical size={19} /><span><small>المادة الدراسية</small><strong>{active.subject}</strong></span></button><button className="detail-item" onClick={() => openStudents(active)}><GraduationCap size={20} /><span><small>الصف الدراسي</small><strong>{className(active)}</strong></span></button><button className="detail-item" onClick={() => openStudents(active)}><CalendarRange size={19} /><span><small>الفصل الدراسي</small><strong>{active.term}</strong></span></button><button className="detail-item teacher-detail" onClick={openSettings}><UserRound size={19} /><span><small>معلم المادة</small><strong>{workspace.settings.teacherName}</strong></span><Settings2 className="detail-edit" size={13} /></button></section>
            <section className="report-branding" aria-label="شعارات ترويسة الملف"><LogoUpload side="rightLogo" value={workspace.settings.rightLogo} onChange={value => changeLogo('rightLogo', value)} disabled={!ready || busy} /><div className="branding-note"><span className="branding-mark"><ImagePlus size={19} /></span><div><h3>ترويسة سجلك المدرسي</h3><p>ارفع الشعارين ليظهرا في المعاينة وملف PDF</p></div></div><LogoUpload side="leftLogo" value={workspace.settings.leftLogo} onChange={value => changeLogo('leftLogo', value)} disabled={!ready || busy} /></section>
            {lastFill && <div className="autofill-undo" role="status"><CircleCheck size={19} /><span><strong>{lastFill.label}</strong> يمكنك التراجع ما لم تُغيّر القيم يدويًا.</span><button onClick={undoAutofill} disabled={busy || !ready}><Undo2 size={15} />تراجع عن آخر ملء</button></div>}
            <GradeTable onAutofill={openAutofill} onRandomQuiz={openRandomQuiz} onOtherMarks={openOtherMarks} classroom={active} query={query} onQuery={setQuery} onScore={changeScore} ready={ready && !busy} onManage={() => openStudents(active)} onClear={week => { setClearWeek(week); setDialog('clear'); }} onBackup={backup} focusMode={focusMode} onFocusMode={() => setFocusMode(!focusMode)} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} onAddWeek={openWeekManager} onPrintWeek={week => openPreview([active], week)} />
            <div className="table-footnote"><span><SaveIcon size={14} className={saveState === 'saving' ? 'spin' : ''} />{saveLabel}{saveState === 'saved' ? ' على هذا الجهاز وفي قاعدة البيانات' : ''}</span><span className="keyboard-hint"><kbd>Enter</kbd> للانتقال إلى الطالب التالي<span className="footnote-dot">·</span><kbd>↑</kbd><kbd>↓</kbd> للتنقل بين الدرجات</span></div>
          </>}
          {view === 'classes' && <><div className="section-label classes-section-label"><h2>فصولك لهذا العام <span className="count-pill">{workspace.classrooms.length}</span></h2><span>{totalStudents} طالبًا · {workspace.settings.academicYear}</span></div><div className="class-cards">{workspace.classrooms.map((c, i) => { const stats = classStats(c); return <article className="class-card" key={c.id}><div className="class-card-top"><span className={`class-card-icon ${['mint', 'blue', 'purple', 'amber'][i % 4]}`}><GraduationCap size={26} /></span><span className="subject-badge"><FlaskConical size={13} />{c.subject}</span></div><h2>{className(c)}</h2><p>{c.term}</p><div className="class-card-numbers"><span><UsersRound size={16} />{c.students.length} طالبًا</span><span><CalendarDays size={16} />{classWeeks(c).length} أسابيع</span></div><div className="progress-label"><span>اكتمال الرصد</span><strong>{stats.percent}%</strong></div><div className="progress-track"><span style={{ width: `${stats.percent}%` }} /></div><footer><button className="button button-primary" onClick={() => openClass(c)}>فتح السجل<ArrowLeft size={15} /></button><button className="icon-button bordered" title="إدارة الطلاب" aria-label={`إدارة طلاب ${className(c)}`} onClick={() => openStudents(c)}><UsersRound size={17} /></button></footer></article>; })}</div></>}
          {view === 'reports' && <section className="reports-panel"><div className="simple-panel-heading"><div><ChartNoAxesCombined size={20} /><h2>ملخّص متابعة الفصول</h2></div><span className="subtle-badge">{allWeeks.length} أسابيع · 5 بنود تقييم</span></div><div className="table-scroll"><table className="report-table"><thead><tr><th>الفصل الدراسي</th><th>المادة</th><th>الطلاب</th><th>متوسط الدرجات</th><th>اكتمال الرصد</th><th>السجل</th></tr></thead><tbody>{workspace.classrooms.map(c => { const stats = classStats(c); const avg = c.students.length ? (c.students.reduce((sum, s) => sum + studentTotal(s, classWeeks(c)), 0) / c.students.length).toFixed(1) : '0'; return <tr key={c.id}><td><button className="text-link" onClick={() => openClass(c)}>{className(c)}</button></td><td><span className="subject-badge">{c.subject}</span></td><td>{c.students.length}</td><td><strong>{avg}</strong><small className="muted"> / {maxTotal(c)}</small></td><td><div className="report-progress"><div className="progress-track"><span style={{ width: `${stats.percent}%` }} /></div><span>{stats.percent}%</span></div></td><td><button className="button button-small button-secondary" onClick={() => openPreview([c])}><FileText size={15} />معاينة PDF</button></td></tr>; })}</tbody></table></div><div className="report-note"><CircleHelp size={16} /><p>متوسط الدرجات هو مجموع بنود المتابعة خلال الأسابيع المضافة لكل فصل، ويُعرض بجانب الدرجة القصوى الخاصة به. اكتمال الرصد يوضح الخانات المُدخلة، وليس النسبة المئوية لتحصيل الطالب.</p></div></section>}
          {view === 'saved' && <section className="saved-panel"><div className="simple-panel-heading"><div><FolderArchive size={20} /><h2>أرشيف السجلات</h2><span className="count-pill">{reports.length}</span></div><button className="button button-small button-secondary" disabled={reportsLoading} onClick={() => void loadReports()}><History size={15} />تحديث القائمة</button></div>{reportsLoading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><h3>جارٍ تحميل السجلات المحفوظة...</h3></div> : !reports.length ? <div className="empty-state archive-empty"><span className="empty-icon"><FolderArchive size={37} strokeWidth={1.4} /></span><h3>احتفظ بنسخة من كل خطوة</h3><p>اضغط «حفظ الدرجات» لإنشاء نسخة من سجلاتك.<br />ستجدها هنا، جاهزة للاسترجاع أو التصدير متى احتجت.</p><button className="button button-primary" disabled={busy || !ready} onClick={() => void saveAll()}><Plus size={17} />حفظ نسخة الآن</button><span className="empty-note"><CloudCheck size={14} />الحفظ التلقائي للدرجات مفعّل دائمًا</span></div> : <div className="saved-list">{reports.map(report => <article className="saved-row" key={report.id}><span className="saved-file-icon"><FileCheck2 size={25} /></span><div className="saved-row-info"><h3>{report.title}</h3><p>{report.teacherName}<span>·</span>{formatDate(report.createdAt)}</p></div><span className="subtle-badge">{report.pages} صفحة</span><div className="saved-row-actions"><button className="button button-small button-secondary" disabled={busy} onClick={() => void openRestore(report)}><History size={15} />استرجاع</button><button className="icon-button bordered" disabled={busy} aria-label={`تصدير ${report.title}`} title="معاينة النسخة وتصديرها" onClick={() => void previewReport(report)}><Download size={17} /></button><button className="icon-button danger-hover" disabled={busy} aria-label={`حذف ${report.title}`} title="حذف النسخة" onClick={() => { setDeleteCandidate(report); setDialog('delete'); }}><Trash2 size={16} /></button></div></article>)}</div>}</section>}
          <footer className="page-footer"><span><BookOpen size={13} />سِجِلّ · رفيق المعلم في كل أسبوع</span><span>{workspace.settings.school}<span className="footnote-dot">·</span>{workspace.settings.academicYear}</span></footer>
        </main>
      </div>
    </div>

    {dialog === 'printOptions' && <PrintOptionsDialog classrooms={workspace.classrooms} active={active} initialWeek={selectedWeek} onPreview={openPreview} onClose={() => setDialog(null)} />}
    {dialog === 'randomQuiz' && <RandomQuizDialog classrooms={workspace.classrooms} active={active} initialWeek={selectedWeek} onApply={applyRandomQuiz} onClose={() => setDialog(null)} />}
    {dialog === 'otherMarks' && <OtherMarksDialog classrooms={workspace.classrooms} active={active} initialWeek={selectedWeek} onApply={applyOtherMarks} onClose={() => setDialog(null)} />}
    {dialog === 'autofill' && <AutofillDialog classrooms={workspace.classrooms} active={active} initialWeek={selectedWeek} onApply={applyAutofill} onClose={() => setDialog(null)} />}
    {dialog === 'weeks' && <WeekManager classroom={active} classroomCount={workspace.classrooms.length} onCreate={createWeek} onOpen={openWeeklyTable} onClose={() => setDialog(null)} />}
    {dialog === 'students' && editorClass && <Modal title="إدارة الفصل والطلاب" subtitle={`${className(editorClass)} · عدّل البيانات وأضف الطلاب أو احذفهم.`} onClose={() => setDialog(null)} wide><form onSubmit={e => { e.preventDefault(); saveStudents(); }}><div className="modal-body"><div className="form-grid"><label className="field-label">المادة الدراسية<input required maxLength={60} value={editorSubject} onChange={e => setEditorSubject(e.target.value)} /></label><label className="field-label">الفصل الدراسي<select value={editorTerm} onChange={e => setEditorTerm(e.target.value)}><option>الفصل الدراسي الأول</option><option>الفصل الدراسي الثاني</option><option>الفصل الدراسي الثالث</option></select></label></div><div className="editor-list-heading"><h3>قائمة الطلاب <span className="count-pill">{draftStudents.length}</span></h3><span>الاسم كما يظهر في السجل المطبوع</span></div><div className="student-editor-list">{draftStudents.map((student, i) => <div className="student-editor-row" key={student.id}><span>{i + 1}</span><input aria-label={`اسم الطالب ${i + 1}`} maxLength={150} value={student.name} onChange={e => setDraftStudents(draftStudents.map(s => s.id === student.id ? { ...s, name: e.target.value } : s))} /><button type="button" className="icon-button danger-hover" aria-label={`حذف ${student.name}`} title="حذف الطالب ودرجاته" onClick={() => setDraftStudents(draftStudents.filter(s => s.id !== student.id))}><Trash2 size={16} /></button></div>)}</div><div className="add-student-row"><input placeholder="اسم الطالب الجديد" aria-label="اسم الطالب الجديد" maxLength={150} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraftStudent(); } }} /><button type="button" className="button button-secondary" onClick={addDraftStudent}><Plus size={17} />إضافة طالب</button></div>{editorError && <p className="form-error"><CircleAlert size={15} />{editorError}</p>}<p className="form-hint">تُحفظ تغييرات الأسماء والحذف عند الضغط على «حفظ التغييرات».</p></div><footer className="modal-footer"><button type="button" className="button button-secondary" onClick={() => setDialog(null)}>إلغاء</button><button className="button button-primary" type="submit"><Check size={17} />حفظ التغييرات</button></footer></form></Modal>}
    {dialog === 'settings' && <Modal title="إعدادات سجل المتابعة" subtitle="تظهر هذه البيانات في ترويسة السجل وفي جميع ملفات PDF." onClose={() => setDialog(null)}><form onSubmit={e => { e.preventDefault(); updateSettings(draftSettings); setDialog(null); notify('تم تحديث إعدادات السجل.'); }}><div className="modal-body"><div className="logo-settings-heading"><ImagePlus size={17} />شعارا ترويسة الملف</div><div className="logo-settings-grid"><LogoUpload side="rightLogo" value={draftSettings.rightLogo} onChange={value => setDraftSettings({ ...draftSettings, rightLogo: value })} /><LogoUpload side="leftLogo" value={draftSettings.leftLogo} onChange={value => setDraftSettings({ ...draftSettings, leftLogo: value })} /></div><p className="logo-format-hint">PNG أو JPG أو WebP، حتى 5 ميجابايت. اضغط على المكان أو اسحب الصورة إليه. تُحفظ الشعارات عند حفظ الإعدادات.</p><label className="field-label">اسم معلم المادة<input required maxLength={150} value={draftSettings.teacherName} onChange={e => setDraftSettings({ ...draftSettings, teacherName: e.target.value })} /></label><div className="form-grid"><label className="field-label">اسم المدرسة<input required maxLength={150} value={draftSettings.school} onChange={e => setDraftSettings({ ...draftSettings, school: e.target.value })} /></label><label className="field-label">المجمع<input maxLength={150} value={draftSettings.campus} onChange={e => setDraftSettings({ ...draftSettings, campus: e.target.value })} /></label></div><label className="field-label">العام الدراسي<input required maxLength={30} value={draftSettings.academicYear} onChange={e => setDraftSettings({ ...draftSettings, academicYear: e.target.value })} /></label><div className="backup-box"><span className="backup-icon"><HardDrive size={23} /></span><div><h3>نسخة احتياطية من درجاتك</h3><p>نزّل جميع الفصول والطلاب والدرجات في ملف JSON.</p></div><button type="button" className="icon-button bordered" onClick={backup} aria-label="تنزيل نسخة احتياطية" title="تنزيل النسخة الاحتياطية"><ArrowDownToLine size={18} /></button></div><p className="form-hint"><ShieldCheck size={14} />الحفظ التلقائي مفعّل. تُحفظ الدرجات في قاعدة البيانات ونسخة محلية على جهازك.</p></div><footer className="modal-footer"><button type="button" className="button button-secondary" onClick={() => setDialog(null)}>إلغاء</button><button type="submit" className="button button-primary"><Save size={17} />حفظ الإعدادات</button></footer></form></Modal>}
    {dialog === 'help' && <Modal title="كل أسبوع، أسهل من قبل" subtitle="دليل سريع لاستخدام سجل متابعة الطلاب." onClose={() => setDialog(null)}><div className="modal-body help-body"><div className="help-step"><span>01</span><div><h3>اختر الفصل وابدأ الرصد</h3><p>اختر أحد الفصول السبعة، ثم عدّل الدرجة مباشرة في الجدول. لإنشاء جدول جديد، اضغط «أسبوع جديد» وأدخل رقمًا مثل 12، واختر هذا الفصل أو جميع الفصول.</p></div></div><div className="help-step"><span>02</span><div><h3>درجاتك تُحفظ تلقائيًا</h3><p>يُحفظ كل تعديل على الجهاز، ثم يُزامَن مع قاعدة البيانات. زر «حفظ الدرجات» ينشئ أيضًا نسخة يمكن استرجاعها من الأرشيف.</p></div></div><div className="help-step"><span>03</span><div><h3>راجع الحدود الدنيا والعليا</h3><div className="rubric-list">{METRICS.map(m => <span key={m.key} className={`rubric-item metric-${m.color}`}>{m.short}<strong>0–{m.max}</strong></span>)}</div><p>الخانة الفارغة تعني «لم تُرصد»، والصفر درجة مرصودة. استخدم الأسهم أو Enter للتنقل بين الخانات.</p></div></div><div className="help-step"><span>04</span><div><h3>سجل جاهز للطباعة</h3><p>اختر «تصدير PDF» للمعاينة، ثم نزّل الملف أو اطبعه بحجم A4 أفقي. تُكرّر الترويسة والتوقيعات تلقائيًا. عند تصدير جميع الأسابيع، تُقسّم إلى مجموعات من أربعة أسابيع في كل صفحة. اختر أسبوعًا من المرشّح لتصدير جدوله وحده، أو استخدم «خيارات الطباعة» لطباعة كل الفصول بأسابيع محددة أو بجميع الأسابيع، أو فصل محدد بأسابيع تختارها.</p></div></div><div className="help-step"><span>05</span><div><h3>املأ الخانات تلقائيًا</h3><p>اضغط «الملء التلقائي»، واختر أسبوعًا أو جميع الأسابيع، وهذا الفصل أو جميع الفصول. استخدم الدرجة الكاملة أو قيمًا مخصصة أو انسخ أسبوع مرجعي. الافتراضي ملء الفراغات فقط؛ الاستبدال يحتاج تأكيدًا، وآخر ملء قابل للتراجع خلال الجلسة.</p></div></div><div className="help-step"><span>06</span><div><h3>إجراءات سريعة ومنفصلة</h3><p>زر «الاختبارات العشوائية» يوزع درجات الاختبارات القصيرة من 0 إلى 5، ويمكنه مراعاة متوسط اختبارات الطالب السابقة. زر «إكمال البنود الأخرى» يملأ المشاركة والواجبات والأنشطة والمهام الأدائية بالدرجة 1 دفعة واحدة، دون تغيير الاختبارات.</p></div></div><div className="info-callout"><CircleHelp size={18} /><p>تم نقل الأسماء والدرجات من الصور المرفقة، مع إزالة الصفحات المكررة. يُرجى مراجعتها قبل اعتماد السجل النهائي.</p></div></div><footer className="modal-footer"><button className="button button-primary" onClick={() => setDialog(null)}>فهمت، لنبدأ<ArrowLeft size={16} /></button></footer></Modal>}
    {dialog === 'clear' && <Modal title="تفريغ درجات الأسبوع؟" subtitle={`الأسبوع ${weekName(clearWeek)} · ${className(active)}`} onClose={() => setDialog(null)}><div className="modal-body confirm-body"><span className="confirm-icon"><CircleAlert size={30} /></span><p>ستُمسح جميع درجات البنود الخمسة لهذا الأسبوع فقط، وسيبقى الطلاب وباقي الأسابيع كما هم. يمكنك إعادة الرصد مباشرة بعد التفريغ.</p><span className="muted">{active.students.length} طالبًا · {active.students.length * 5} خانة تقييم</span></div><footer className="modal-footer"><button className="button button-secondary" onClick={() => setDialog(null)}>الاحتفاظ بالدرجات</button><button className="button button-danger" onClick={() => { updateClass({ ...active, students: active.students.map(s => ({ ...s, scores: { ...s.scores, ...Object.fromEntries(METRICS.map(m => [scoreKey(clearWeek, m.key), null])) } })) }); setDialog(null); notify('تم تفريغ درجات الأسبوع المحدد. يمكنك بدء الرصد من جديد.'); }}><Trash2 size={16} />تفريغ الأسبوع</button></footer></Modal>}
    {dialog === 'restore' && restoreCandidate && <Modal title="استرجاع النسخة المحفوظة" subtitle={restoreCandidate.title} onClose={() => setDialog(null)}><div className="modal-body confirm-body"><span className="confirm-icon restore-icon"><History size={30} /></span><p>سيتم استبدال الدرجات الحالية وإعدادات المعلم ببيانات هذه النسخة، المحفوظة بتاريخ {formatDate(restoreCandidate.createdAt)}.</p><div className="info-callout"><CircleAlert size={18} /><p>للاحتفاظ بالدرجات الحالية، نزّل نسخة احتياطية أولًا. الفصول غير الموجودة في النسخة لن تتغير.</p></div><button className="button button-secondary" onClick={backup}><Download size={16} />تنزيل الدرجات الحالية</button></div><footer className="modal-footer"><button className="button button-secondary" onClick={() => setDialog(null)}>إلغاء</button><button className="button button-primary" disabled={busy} onClick={() => void restoreReport()}><History size={16} />استرجاع السجل</button></footer></Modal>}
    {dialog === 'delete' && deleteCandidate && <Modal title="حذف النسخة المحفوظة؟" subtitle={deleteCandidate.title} onClose={() => setDialog(null)}><div className="modal-body confirm-body"><span className="confirm-icon"><Trash2 size={29} /></span><p>ستُحذف هذه النسخة من الأرشيف نهائيًا. لن تتأثر الدرجات الحالية أو النسخ الأخرى.</p></div><footer className="modal-footer"><button className="button button-secondary" onClick={() => setDialog(null)}>إلغاء</button><button className="button button-danger" disabled={busy} onClick={() => void deleteReport()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}حذف النسخة</button></footer></Modal>}
    {dialog === 'preview' && preview && <>
      <div className="export-stage" aria-hidden="true"><PrintSheets ref={printRef} pages={pages} settings={preview.settings} /></div>
      <Modal title="معاينة السجل قبل الطباعة" subtitle={`${pages.length} صفحة · A4 أفقي · ترويسة مدرسية وتوقيعات اعتماد`} onClose={() => { if (!exporting) setDialog(null); }} wide><div className="preview-toolbar"><span><FileCheck2 size={17} />{preview.classrooms.length === 1 ? `${className(preview.classrooms[0])} · ${preview.classrooms[0].subject}` : `${preview.classrooms.length} فصول دراسية`}</span>{preview.weekFilter !== 'all' && <span className="week-preview-label"><CalendarDays size={13} />{Array.isArray(preview.weekFilter) ? (preview.weekFilter.length === 1 ? `الأسبوع ${weekName(preview.weekFilter[0])} فقط` : `الأسابيع ${preview.weekFilter.join('، ')}`) : `الأسبوع ${weekName(preview.weekFilter)} فقط`}</span>}<span>تنسيق جاهز للطباعة</span></div><PreviewPages pages={pages} settings={preview.settings} /><footer className="modal-footer preview-footer"><span className="preview-hint"><ShieldCheck size={15} />الخطوط العربية مضمّنة بصريًا في الملف</span><button className="button button-secondary" disabled={exporting} onClick={() => void printPages()}><Printer size={17} />طباعة</button><button className="button button-primary" disabled={exporting || !pages.length} onClick={() => void exportPdf()}>{exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}{exporting ? `جارٍ التصدير ${exportProgress.current} / ${exportProgress.total}` : 'تنزيل ملف PDF'}</button></footer></Modal>
    </>}
    {toast && <div className={`toast-container toast-${toast.kind}`} role="status" dir="rtl">{toast.kind === 'success' ? <CircleCheck size={21} /> : <CircleAlert size={21} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="إغلاق الإشعار"><X size={17} /></button></div>}
  </>;
}
