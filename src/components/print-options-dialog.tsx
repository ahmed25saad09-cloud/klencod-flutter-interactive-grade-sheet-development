'use client';
import { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCheck, GraduationCap, Layers3, Printer } from 'lucide-react';
import { Modal } from './modal';
import { className, classWeeks, pageCount, weekName, type Classroom, type WeekSelection } from '@/lib/data';

export function PrintOptionsDialog({ classrooms, active, initialWeek, onPreview, onClose }: {
  classrooms: Classroom[]; active: Classroom; initialWeek: WeekSelection;
  onPreview: (classrooms: Classroom[], weeks: WeekSelection) => void; onClose: () => void;
}) {
  const [stage, setStage] = useState<'menu' | 'allWeeks' | 'single'>('menu');
  const [classId, setClassId] = useState(active.id);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>(() => initialWeek === 'all' ? [] : Array.isArray(initialWeek) ? initialWeek : [initialWeek]);
  const selectedClass = classrooms.find(c => c.id === classId) || active;
  const targets = stage === 'single' ? [selectedClass] : classrooms;
  const availableWeeks = [...new Set(targets.flatMap(classWeeks))].sort((a, b) => a - b);
  const pages = selectedWeeks.length ? targets.reduce((sum, c) => sum + pageCount(c, selectedWeeks), 0) : 0;
  const allPages = classrooms.reduce((sum, c) => sum + pageCount(c, 'all'), 0);
  function toggleWeek(week: number) { setSelectedWeeks(current => current.includes(week) ? current.filter(w => w !== week) : [...current, week].sort((a, b) => a - b)); }
  function openSingle() { setStage('single'); setClassId(active.id); setSelectedWeeks(classWeeks(active)); }
  function changeClass(id: string) { setClassId(id); const c = classrooms.find(item => item.id === id); setSelectedWeeks(c ? classWeeks(c) : []); }
  const choosing = stage !== 'menu';
  return <Modal title="خيارات الطباعة" subtitle="اختر طريقة الطباعة، ثم عاين السجل أو نزّله بصيغة PDF." onClose={onClose} wide>
    <div className="modal-body print-options-body">
      {!choosing ? <div className="print-option-cards">
        <button className="print-option-card" data-testid="print-all-selected-weeks" onClick={() => { setStage('allWeeks'); setSelectedWeeks(initialWeek === 'all' ? [] : Array.isArray(initialWeek) ? initialWeek : [initialWeek]); }}><span className="print-option-icon mint"><Layers3 size={24} /></span><span className="print-option-copy"><strong>كل الفصول · أسبوع أو عدة أسابيع</strong><small>اختر الأسابيع المطلوبة واطبع جميع الفصول دفعة واحدة.</small></span><Printer size={18} /></button>
        <button className="print-option-card" data-testid="print-all-weeks" onClick={() => onPreview(classrooms, 'all')}><span className="print-option-icon blue"><CalendarDays size={24} /></span><span className="print-option-copy"><strong>كل الفصول · جميع الأسابيع</strong><small>طباعة كاملة لكل الفصول ولكل الأسابيع في ملف واحد. {allPages} صفحة.</small></span><Printer size={18} /></button>
        <button className="print-option-card" data-testid="print-single-class" onClick={openSingle}><span className="print-option-icon amber"><GraduationCap size={24} /></span><span className="print-option-copy"><strong>فصل محدد · أسبوع أو عدة أسابيع</strong><small>اختر الفصل والأسابيع التي تريد طباعتها فقط.</small></span><Printer size={18} /></button>
      </div> : <>
        <button className="print-back-button" onClick={() => setStage('menu')}><ArrowRight size={15} />العودة إلى خيارات الطباعة</button>
        <div className="print-selection-heading"><span className="print-option-icon mint">{stage === 'single' ? <GraduationCap size={22} /> : <Layers3 size={22} />}</span><div><h3>{stage === 'single' ? 'اختيار الفصل والأسابيع' : 'اختيار الأسابيع لجميع الفصول'}</h3><p>{stage === 'single' ? 'حدد الفصل، ثم علّم على أسبوع واحد أو عدة أسابيع.' : `سيتم تجهيز ${classrooms.length} فصول للأسابيع التي تحددها.`}</p></div></div>
        {stage === 'single' && <label className="field-label">الفصل المطلوب طباعته<select aria-label="الفصل المطلوب طباعته" value={classId} onChange={e => changeClass(e.target.value)}>{classrooms.map(c => <option key={c.id} value={c.id}>{className(c)} — {c.subject} ({c.students.length} طالبًا)</option>)}</select></label>}
        <div className="print-weeks-header"><strong>الأسابيع المطلوب طباعتها</strong><div><button type="button" onClick={() => setSelectedWeeks(availableWeeks)}><CheckCheck size={14} />تحديد الكل</button><button type="button" onClick={() => setSelectedWeeks([])}>مسح التحديد</button></div></div>
        <div className="print-week-grid">{availableWeeks.map(week => <label key={week} className={`print-week-choice ${selectedWeeks.includes(week) ? 'selected' : ''}`}><input type="checkbox" aria-label={`تحديد الأسبوع ${week} للطباعة`} checked={selectedWeeks.includes(week)} onChange={() => toggleWeek(week)} /><span>الأسبوع {weekName(week)}</span><small>{week}</small></label>)}</div>
        <div className="print-selection-summary"><Printer size={17} /><span><strong>{targets.length}</strong> فصول · <strong>{selectedWeeks.length}</strong> أسابيع · <strong data-testid="print-page-count">{pages}</strong> صفحة A4</span></div>
        {!selectedWeeks.length && <p className="form-error"><Printer size={15} />حدد أسبوعًا واحدًا على الأقل للمتابعة.</p>}
        <p className="form-hint">عند اختيار أكثر من أربعة أسابيع، تُقسّم تلقائيًا إلى صفحات متتابعة مع تكرار ترويسة كل فصل.</p>
      </>}
    </div>
    <footer className="modal-footer">
      {choosing && <button className="button button-secondary" onClick={() => setStage('menu')}>رجوع</button>}
      <button className="button button-secondary" onClick={onClose}>{choosing ? 'إلغاء' : 'إغلاق'}</button>
      {choosing && <button className="button button-primary" data-testid="preview-print-selection" disabled={!selectedWeeks.length || !pages} onClick={() => onPreview(targets, [...selectedWeeks].sort((a, b) => a - b))}><Printer size={17} />معاينة الطباعة</button>}
    </footer>
  </Modal>;
}
