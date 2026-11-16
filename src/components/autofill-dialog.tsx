'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, CircleAlert, Copy, ListChecks, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { Modal } from './modal';
import { METRICS, className, classWeeks, weekName, type Classroom, type MetricKey } from '@/lib/data';
import { buildFillPlan, FULL_MARKS, validFillValues, type FillOptions } from '@/lib/autofill';

export function AutofillDialog({ classrooms, active, initialWeek, onApply, onClose }: {
  classrooms: Classroom[]; active: Classroom; initialWeek: number | 'all';
  onApply: (options: FillOptions) => void; onClose: () => void;
}) {
  const [options, setOptions] = useState<FillOptions>({ week: initialWeek, scope: 'current', mode: 'missing', preset: 'full', custom: { ...FULL_MARKS }, referenceWeek: classWeeks(active)[0] || 8 });
  const [acknowledged, setAcknowledged] = useState(false);
  const weeks = [...new Set((options.scope === 'all' ? classrooms : [active]).flatMap(classWeeks))].sort((a, b) => a - b);
  const plan = useMemo(() => buildFillPlan(classrooms, active.id, options), [classrooms, active.id, options]);
  const valuesValid = validFillValues(options);
  function updateOption<K extends keyof FillOptions>(key: K, value: FillOptions[K]) {
    setOptions(current => ({ ...current, [key]: value }));
    setAcknowledged(false);
  }
  const canApply = plan.changes.length > 0 && valuesValid && (options.mode !== 'overwrite' || acknowledged);
  return <Modal title="الملء التلقائي للدرجات" subtitle="اختر الأسبوع ونطاق الرصد والقيم، وراجع النتيجة قبل تطبيقها." onClose={onClose} wide>
    <form onSubmit={e => { e.preventDefault(); if (canApply) onApply(options); }}>
      <div className="modal-body autofill-body">
        <div className="autofill-intro"><span><WandSparkles size={22} /></span><div><strong>املأ الخانات بقيم واضحة تختارها</strong><p>الدرجة الكاملة، درجات مخصصة، أو نسخة من أسبوع سابق.</p></div></div>
        <div className="form-grid"><label className="field-label">الأسبوع المراد ملؤه<select aria-label="الأسبوع المراد ملؤه" value={options.week} onChange={e => updateOption('week', e.target.value === 'all' ? 'all' : Number(e.target.value))}><option value="all">جميع الأسابيع</option>{weeks.map(w => <option key={w} value={w}>الأسبوع {weekName(w)}</option>)}</select></label><label className="field-label">تطبيق الملء على<select aria-label="نطاق الملء التلقائي" value={options.scope} onChange={e => updateOption('scope', e.target.value as FillOptions['scope'])}><option value="current">هذا الفصل — {className(active)}</option><option value="all">جميع الفصول ({classrooms.length} فصول)</option></select></label></div>
        <fieldset className="fill-mode-fieldset"><legend>كيف نتعامل مع الدرجات الموجودة؟</legend><div className="fill-choice-grid"><label className={`fill-choice ${options.mode === 'missing' ? 'selected' : ''}`}><input type="radio" name="autofill-mode" value="missing" checked={options.mode === 'missing'} onChange={() => updateOption('mode', 'missing')} /><span><strong>الخانات الفارغة فقط</strong><small>يحافظ على الدرجات الحالية، بما فيها الصفر.</small></span><ShieldCheck size={17} /></label><label className={`fill-choice ${options.mode === 'overwrite' ? 'selected overwrite-selected' : ''}`}><input type="radio" name="autofill-mode" value="overwrite" checked={options.mode === 'overwrite'} onChange={() => updateOption('mode', 'overwrite')} /><span><strong>استبدال جميع الدرجات</strong><small>يستبدل القيم الحالية في النطاق المحدد.</small></span><Copy size={17} /></label></div></fieldset>
        <label className="field-label">القيم المستخدمة في الملء<select aria-label="طريقة الملء" value={options.preset} onChange={e => updateOption('preset', e.target.value as FillOptions['preset'])}><option value="full">الدرجة الكاملة لكل بند (الاختبار 5، الباقي 1)</option><option value="custom">درجات مخصصة لكل بند</option><option value="copy">نسخ درجات أسبوع مرجعي</option></select></label>
        {options.preset === 'full' && <div className="rubric-list autofill-rubric">{METRICS.map(m => <span key={m.key} className={`rubric-item metric-${m.color}`}>{m.short}<strong>{m.max}</strong></span>)}</div>}
        {options.preset === 'custom' && <div className="custom-marks-grid">{METRICS.map(m => <label key={m.key} className={`custom-mark metric-${m.color}`}><span>{m.short}</span><input type="number" min={0} max={m.max} step={1} required aria-label={`درجة ${m.label}`} value={Number.isFinite(options.custom[m.key]) ? options.custom[m.key] : ''} onChange={e => updateOption('custom', { ...options.custom, [m.key]: e.target.value === '' ? NaN : Number(e.target.value) } as Record<MetricKey, number>)} /><small>من 0 إلى {m.max}</small></label>)}</div>}
        {options.preset === 'copy' && <div className="copy-week-box"><label className="field-label">الأسبوع المرجعي<select aria-label="الأسبوع المرجعي" value={options.referenceWeek} onChange={e => updateOption('referenceWeek', Number(e.target.value))}>{weeks.map(w => <option key={w} value={w}>الأسبوع {weekName(w)}</option>)}</select></label><p>تُنسخ درجة كل طالب في كل بند كما هي. الخانات الفارغة في الأسبوع المرجعي لا تُنسخ. اختر أسبوعًا مختلفًا عن الأسبوع المراد ملؤه.</p></div>}
        {!valuesValid && <p className="form-error"><CircleAlert size={15} />أدخل درجة صحيحة لكل بند ضمن الحد المسموح.</p>}
        <div className="fill-preview-box"><div className="fill-preview-heading"><ListChecks size={17} /><strong>معاينة التنفيذ</strong><span>{plan.targetClassCount} فصول · {plan.targetWeekCount} أسابيع · {plan.targetStudentCount} طالبًا</span></div><div className="fill-preview-stats"><div><strong data-testid="autofill-count">{plan.changes.length}</strong><span>{options.mode === 'missing' ? 'خانة فارغة سيتم ملؤها' : 'خانة سيتم تعديلها'}</span></div><div><strong>{options.mode === 'missing' ? plan.existingCells : plan.targetCells - plan.changes.length}</strong><span>{options.mode === 'missing' ? 'درجة موجودة لن تتغير' : 'خانة مطابقة لن تتغير'}</span></div><div><strong>{plan.targetCells}</strong><span>إجمالي الخانات في النطاق</span></div></div>
          {plan.changes.length > 0 ? <div className="fill-sample-list">{plan.changes.slice(0, 3).map(change => { const c = classrooms.find(item => item.id === change.classroomId)!; const student = c.students.find(s => s.id === change.studentId)!; const metric = METRICS.find(m => m.key === change.metric)!; return <div key={`${change.classroomId}-${change.studentId}-${change.key}`}><span><strong>{student.name}</strong><small>{className(c)} · الأسبوع {change.week} · {metric.short}</small></span><span className="fill-value-change"><span>{change.before ?? 'فارغ'}</span><ArrowLeft size={13} /><strong>{change.after}</strong></span></div>; })}{plan.changes.length > 3 && <p>ومعاينة مماثلة لـ {plan.changes.length - 3} خانة أخرى.</p>}</div> : <p className="fill-no-changes"><CircleAlert size={15} />{options.preset === 'copy' && options.week === options.referenceWeek ? 'الأسبوع المرجعي هو نفسه الأسبوع المستهدف. اختر أسبوعًا آخر.' : 'لا توجد تغييرات مطلوبة بهذه القيم. جميع الخانات مطابقة أو مكتملة، أو أن الأسبوع المرجعي فارغ.'}</p>}
          {plan.skippedReference > 0 && <p className="fill-reference-note">{plan.skippedReference} خانة فارغة في الأسبوع المرجعي سيتم تجاهلها.</p>}
        </div>
        {options.mode === 'overwrite' && <label className="fill-overwrite-confirm"><input type="checkbox" required checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>أفهم أن الدرجات الحالية في هذا النطاق ستُستبدل بالقيم المحددة.</span></label>}
        <p className="form-hint"><ShieldCheck size={14} />تُحفظ النتيجة تلقائيًا. يمكنك التراجع عن آخر ملء خلال هذه الجلسة. راجع الدرجات قبل اعتماد السجل النهائي.</p>
      </div>
      <footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" data-testid="apply-autofill" disabled={!canApply}><Sparkles size={17} />{plan.changes.length ? `ملء ${plan.changes.length} خانة تلقائيًا` : 'تطبيق الملء التلقائي'}</button></footer>
    </form>
  </Modal>;
}
