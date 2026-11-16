'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, CircleAlert, ListChecks, ShieldCheck } from 'lucide-react';
import { Modal } from './modal';
import { className, classWeeks, weekName, type Classroom } from '@/lib/data';
import { buildOtherMarksPlan, OTHER_METRICS, type OtherOptions } from '@/lib/quick-fill';
import type { FillChange } from '@/lib/autofill';

export function OtherMarksDialog({ classrooms, active, initialWeek, onApply, onClose }: {
  classrooms: Classroom[]; active: Classroom; initialWeek: number | 'all';
  onApply: (changes: FillChange[], options: OtherOptions) => void; onClose: () => void;
}) {
  const [options, setOptions] = useState<OtherOptions>({ week: initialWeek, scope: 'current', mode: 'missing' });
  const [acknowledged, setAcknowledged] = useState(false);
  const targets = options.scope === 'all' ? classrooms : [active];
  const weeks = [...new Set(targets.flatMap(classWeeks))].sort((a, b) => a - b);
  const plan = useMemo(() => buildOtherMarksPlan(classrooms, active.id, options), [classrooms, active.id, options]);
  function update(next: OtherOptions) { setOptions(next); setAcknowledged(false); }
  function changeScope(scope: OtherOptions['scope']) {
    const available = (scope === 'all' ? classrooms : [active]).flatMap(classWeeks);
    update({ ...options, scope, week: options.week !== 'all' && !available.includes(options.week) ? 'all' : options.week });
  }
  const canApply = plan.changes.length > 0 && (options.mode !== 'overwrite' || acknowledged);
  return <Modal title="إكمال البنود الأخرى دفعة واحدة" subtitle="المشاركة والواجبات والأنشطة الصفية والمهام الأدائية بالدرجة الكاملة." onClose={onClose} wide>
    <form onSubmit={e => { e.preventDefault(); if (canApply) onApply(plan.changes, options); }}>
      <div className="modal-body quick-fill-body">
        <div className="quick-fill-intro other-intro"><span><ListChecks size={23} /></span><div><strong>أربعة بنود · الدرجة الكاملة 1 لكل بند</strong><p>لن تتغير درجات الاختبارات القصيرة إطلاقًا.</p></div></div>
        <div className="rubric-list other-marks-rubric">{OTHER_METRICS.map(m => <span key={m.key} className={`rubric-item metric-${m.color}`}>{m.label}<strong>1</strong></span>)}</div>
        <div className="form-grid"><label className="field-label">الأسبوع المستهدف<select aria-label="أسبوع البنود الأخرى" value={options.week} onChange={e => update({ ...options, week: e.target.value === 'all' ? 'all' : Number(e.target.value) })}><option value="all">جميع الأسابيع</option>{weeks.map(w => <option key={w} value={w}>الأسبوع {weekName(w)}</option>)}</select></label><label className="field-label">الفصول المستهدفة<select aria-label="نطاق البنود الأخرى" value={options.scope} onChange={e => changeScope(e.target.value as OtherOptions['scope'])}><option value="current">هذا الفصل — {className(active)}</option><option value="all">جميع الفصول ({classrooms.length})</option></select></label></div>
        <fieldset className="fill-mode-fieldset"><legend>كيف نتعامل مع الدرجات الموجودة؟</legend><div className="fill-choice-grid"><label className={`fill-choice ${options.mode === 'missing' ? 'selected' : ''}`}><input type="radio" name="other-mode" checked={options.mode === 'missing'} onChange={() => update({ ...options, mode: 'missing' })} /><span><strong>الخانات الفارغة فقط</strong><small>يكمل البنود الناقصة ويحافظ على الصفر والدرجات الحالية.</small></span><ShieldCheck size={17} /></label><label className={`fill-choice ${options.mode === 'overwrite' ? 'selected overwrite-selected' : ''}`}><input type="radio" name="other-mode" checked={options.mode === 'overwrite'} onChange={() => update({ ...options, mode: 'overwrite' })} /><span><strong>منح الدرجة الكاملة للجميع</strong><small>يستبدل البنود الأربعة بالدرجة 1، دون المساس بالاختبارات.</small></span><ListChecks size={17} /></label></div></fieldset>
        <div className="fill-preview-box"><div className="fill-preview-heading"><ListChecks size={17} /><strong>معاينة الإكمال</strong><span>{plan.targetClassCount} فصول · {plan.targetWeekCount} أسابيع · {plan.targetStudentCount} طالبًا</span></div><div className="fill-preview-stats"><div><strong data-testid="other-marks-count">{plan.changes.length}</strong><span>خانة سيتم إدخال الدرجة 1 بها</span></div><div><strong>{options.mode === 'missing' ? plan.existingCells : plan.targetCells - plan.changes.length}</strong><span>{options.mode === 'missing' ? 'درجة موجودة لن تتغير' : 'خانة مكتملة لن تتغير'}</span></div><div><strong>{plan.targetCells}</strong><span>إجمالي خانات البنود الأربعة</span></div></div>
          {plan.changes.length ? <div className="fill-sample-list">{plan.changes.slice(0, 3).map(change => { const c = classrooms.find(item => item.id === change.classroomId)!; const student = c.students.find(s => s.id === change.studentId)!; const metric = OTHER_METRICS.find(m => m.key === change.metric)!; return <div key={`${change.classroomId}-${change.studentId}-${change.key}`}><span><strong>{student.name}</strong><small>{className(c)} · الأسبوع {change.week} · {metric.short}</small></span><span className="fill-value-change"><span>{change.before ?? 'فارغ'}</span><ArrowLeft size={13} /><strong>1</strong></span></div>; })}{plan.changes.length > 3 && <p>و{plan.changes.length - 3} خانة أخرى.</p>}</div> : <p className="fill-no-changes"><CircleAlert size={15} />البنود الأربعة مكتملة بالفعل في هذا النطاق، أو مطابقة للدرجة الكاملة.</p>}
        </div>
        {options.mode === 'overwrite' && <label className="fill-overwrite-confirm"><input type="checkbox" required checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>أفهم أن درجات البنود الأربعة الحالية ستُستبدل بالدرجة 1. لن تتغير الاختبارات القصيرة.</span></label>}
        <p className="form-hint"><ShieldCheck size={14} />تُحفظ النتيجة تلقائيًا، ويمكن التراجع عن آخر إدخال خلال هذه الجلسة. راجع الدرجات قبل الاعتماد النهائي.</p>
      </div>
      <footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" data-testid="apply-other-marks" disabled={!canApply}><ListChecks size={17} />إكمال البنود الأخرى</button></footer>
    </form>
  </Modal>;
}
