'use client';
import { useState } from 'react';
import { ArrowLeft, CircleAlert, Dices, History, ListChecks, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal } from './modal';
import { className, classWeeks, weekName, type Classroom } from '@/lib/data';
import { buildRandomQuizPlan, type QuizChange, type QuizOptions } from '@/lib/quick-fill';

export function RandomQuizDialog({ classrooms, active, initialWeek, onApply, onClose }: {
  classrooms: Classroom[]; active: Classroom; initialWeek: number | 'all';
  onApply: (changes: QuizChange[], options: QuizOptions) => void; onClose: () => void;
}) {
  const [options, setOptions] = useState<QuizOptions>({ week: initialWeek, scope: 'current', mode: 'missing', useHistory: true });
  const [plan, setPlan] = useState(() => buildRandomQuizPlan(classrooms, active.id, { week: initialWeek, scope: 'current', mode: 'missing', useHistory: true }));
  const [acknowledged, setAcknowledged] = useState(false);
  const targets = options.scope === 'all' ? classrooms : [active];
  const weeks = [...new Set(targets.flatMap(classWeeks))].sort((a, b) => a - b);
  function refresh(next: QuizOptions) { setOptions(next); setPlan(buildRandomQuizPlan(classrooms, active.id, next)); setAcknowledged(false); }
  function changeScope(scope: QuizOptions['scope']) {
    const available = (scope === 'all' ? classrooms : [active]).flatMap(classWeeks);
    refresh({ ...options, scope, week: options.week !== 'all' && !available.includes(options.week) ? 'all' : options.week });
  }
  const canApply = plan.changes.length > 0 && (options.mode !== 'overwrite' || acknowledged);
  return <Modal title="درجات عشوائية للاختبارات القصيرة" subtitle="توزيع من 0 إلى 5، مع مراعاة درجات الطالب في الأسابيع السابقة." onClose={onClose} wide>
    <form onSubmit={e => { e.preventDefault(); if (canApply) onApply(plan.changes, options); }}>
      <div className="modal-body quick-fill-body">
        <div className="quick-fill-intro quiz-intro"><span><Dices size={23} /></span><div><strong>اختبارات قصيرة فقط · من 0 إلى 5</strong><p>لا تتغير المشاركة أو الواجبات أو الأنشطة أو المهام الأدائية.</p></div></div>
        <div className="form-grid"><label className="field-label">الأسبوع المستهدف<select aria-label="أسبوع الاختبارات العشوائية" value={options.week} onChange={e => refresh({ ...options, week: e.target.value === 'all' ? 'all' : Number(e.target.value) })}><option value="all">جميع الأسابيع</option>{weeks.map(w => <option key={w} value={w}>الأسبوع {weekName(w)}</option>)}</select></label><label className="field-label">الفصول المستهدفة<select aria-label="نطاق الاختبارات العشوائية" value={options.scope} onChange={e => changeScope(e.target.value as QuizOptions['scope'])}><option value="current">هذا الفصل — {className(active)}</option><option value="all">جميع الفصول ({classrooms.length})</option></select></label></div>
        <label className={`history-choice ${options.useHistory ? 'selected' : ''}`}><input type="checkbox" aria-label="مراعاة درجات الأسابيع السابقة" checked={options.useHistory} onChange={e => refresh({ ...options, useHistory: e.target.checked })} /><History size={19} /><span><strong>مراعاة درجات الأسابيع السابقة</strong><small>نحسب متوسط اختبارات الطالب السابقة بوزن أكبر للأحدث، ثم نختار درجة قريبة منه بفارق يصل إلى درجة واحدة. دون سجل سابق يكون الاختيار عشوائيًا من 0 إلى 5.</small></span></label>
        <fieldset className="fill-mode-fieldset"><legend>الدرجات الموجودة في الاختبارات القصيرة</legend><div className="fill-choice-grid"><label className={`fill-choice ${options.mode === 'missing' ? 'selected' : ''}`}><input type="radio" name="quiz-mode" checked={options.mode === 'missing'} onChange={() => refresh({ ...options, mode: 'missing' })} /><span><strong>ملء الفراغات فقط</strong><small>يحافظ على الدرجات المرصودة، بما فيها الصفر.</small></span><ShieldCheck size={17} /></label><label className={`fill-choice ${options.mode === 'overwrite' ? 'selected overwrite-selected' : ''}`}><input type="radio" name="quiz-mode" checked={options.mode === 'overwrite'} onChange={() => refresh({ ...options, mode: 'overwrite' })} /><span><strong>استبدال درجات الاختبارات</strong><small>يعيد توزيع الاختبارات القصيرة فقط.</small></span><Dices size={17} /></label></div></fieldset>
        <div className="fill-preview-box"><div className="fill-preview-heading"><ListChecks size={17} /><strong>معاينة التوزيع المقترح</strong><span>{plan.targetClassCount} فصول · {plan.targetWeekCount} أسابيع · {plan.targetStudentCount} طالبًا</span></div><div className="fill-preview-stats"><div><strong data-testid="random-quiz-count">{plan.changes.length}</strong><span>درجة اختبار سيتم إدخالها</span></div><div><strong>{options.mode === 'missing' ? plan.existingCells : plan.targetCells - plan.changes.length}</strong><span>{options.mode === 'missing' ? 'درجة موجودة لن تتغير' : 'درجة مطابقة لن تتغير'}</span></div><div><strong>{plan.historySamples}</strong><span>درجة مقترحة وفق سجل سابق</span></div></div>
          {plan.changes.length ? <div className="fill-sample-list quiz-sample-list">{plan.changes.slice(0, 5).map(change => { const c = classrooms.find(item => item.id === change.classroomId)!; const student = c.students.find(s => s.id === change.studentId)!; return <div key={`${change.classroomId}-${change.studentId}-${change.key}`}><span><strong>{student.name}</strong><small>{className(c)} · الأسبوع {change.week} · {change.historyAverage === null ? 'لا يوجد سجل سابق' : `متوسط السابق ${change.historyAverage.toFixed(1)} من 5`}</small></span><span className="fill-value-change"><span>{change.before ?? 'فارغ'}</span><ArrowLeft size={13} /><strong>{change.after}</strong></span></div>; })}{plan.changes.length > 5 && <p>و{plan.changes.length - 5} درجة أخرى في نفس التوزيع.</p>}</div> : <p className="fill-no-changes"><CircleAlert size={15} />لا توجد درجات تحتاج إلى تغيير. الخانات مكتملة أو مطابقة للاقتراح؛ يمكنك إعادة الاقتراح أو اختيار الاستبدال.</p>}
        </div>
        <div className="quiz-regenerate-row"><button type="button" className="button button-secondary button-small" onClick={() => refresh(options)}><RefreshCw size={15} />اقتراح توزيع آخر</button><span>المعاينة هي نفسها التي ستُحفظ عند التأكيد.</span></div>
        {options.mode === 'overwrite' && <label className="fill-overwrite-confirm"><input type="checkbox" required checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>أفهم أن درجات الاختبارات القصيرة الحالية في النطاق المحدد ستُستبدل.</span></label>}
        <p className="form-hint"><CircleAlert size={14} />هذه درجات عشوائية مقترحة وليست تقييمًا فعليًا لأداء الطلاب. راجعها قبل اعتماد السجل. يمكن التراجع عن آخر إدخال خلال الجلسة.</p>
      </div>
      <footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" data-testid="apply-random-quiz" disabled={!canApply}><Dices size={17} />إدخال الدرجات العشوائية</button></footer>
    </form>
  </Modal>;
}
