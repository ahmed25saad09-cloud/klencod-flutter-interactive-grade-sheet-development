'use client';
import { useState } from 'react';
import { CalendarPlus, CalendarDays, ArrowLeft, CircleAlert, Layers3, ShieldCheck } from 'lucide-react';
import { Modal } from './modal';
import { className, classWeeks, MAX_WEEK, weekName, type Classroom } from '@/lib/data';

export function WeekManager({ classroom, classroomCount, onCreate, onOpen, onClose }: {
  classroom: Classroom; classroomCount: number;
  onCreate: (week: number, scope: 'current' | 'all', openAfter: boolean) => void;
  onOpen: (week: number) => void; onClose: () => void;
}) {
  const weeks = classWeeks(classroom);
  const [value, setValue] = useState(String(Math.min(MAX_WEEK, Math.max(...weeks) + 1)));
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [openAfter, setOpenAfter] = useState(true);
  const week = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(week) && week >= 1 && week <= MAX_WEEK;
  const exists = weeks.includes(week);
  return <Modal title="جدول جديد لكل أسبوع" subtitle="أضف أسبوعًا جديدًا، وانتقل إلى رصد درجاته مباشرة." onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); if (valid && !exists) onCreate(week, scope, openAfter); }}>
      <div className="modal-body week-manager-body">
        <div className="week-existing"><span><CalendarDays size={16} />جداول {className(classroom)} الحالية</span><div>{weeks.map(w => <button type="button" key={w} onClick={() => onOpen(w)} title={`فتح الأسبوع ${weekName(w)}`}>الأسبوع {w}<ArrowLeft size={12} /></button>)}</div></div>
        <div className="form-grid week-number-grid"><label className="field-label">رقم الأسبوع<input aria-label="رقم الأسبوع الجديد" type="number" min={1} max={MAX_WEEK} step={1} required value={value} onChange={e => setValue(e.target.value)} placeholder="مثال: 12" /><small>من 1 إلى {MAX_WEEK}</small></label><div className="week-name-preview"><span>عنوان الجدول الجديد</span><strong>{valid ? `الأسبوع ${weekName(week)}` : 'أدخل رقم الأسبوع'}</strong><small>5 بنود تقييم · {classroom.students.length} طالبًا</small></div></div>
        <label className="field-label">إضافة الجدول إلى<select aria-label="نطاق إنشاء الأسبوع" value={scope} onChange={e => setScope(e.target.value as 'current' | 'all')}><option value="current">هذا الفصل فقط — {className(classroom)}</option><option value="all">جميع الفصول ({classroomCount} فصول)</option></select></label>
        {scope === 'all' && <p className="week-scope-note"><Layers3 size={15} />يُضاف الأسبوع إلى الفصول التي لا تحتويه؛ تبقى درجات الفصول الأخرى كما هي.</p>}
        <label className="week-open-checkbox"><input type="checkbox" checked={openAfter} onChange={e => setOpenAfter(e.target.checked)} /><span>فتح جدول الأسبوع الجديد بعد إنشائه</span></label>
        {exists ? <div className="week-exists-note"><CircleAlert size={18} /><div><strong>هذا الأسبوع موجود بالفعل</strong><p>افتح جدوله لمتابعة الرصد؛ لن ننشئ نسخة مكررة.</p><button type="button" className="text-link" onClick={() => onOpen(week)}>فتح الأسبوع {weekName(week)}<ArrowLeft size={14} /></button></div></div> : !valid && value !== '' ? <p className="form-error"><CircleAlert size={15} />أدخل رقمًا صحيحًا بين 1 و{MAX_WEEK}.</p> : <div className="info-callout"><ShieldCheck size={18} /><p>يبدأ الجدول بخانات فارغة وبنفس أسماء الطلاب وبنود التقييم. درجات الأسابيع السابقة محفوظة ولن تتغير.</p></div>}
      </div>
      <footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" disabled={!valid || exists}><CalendarPlus size={17} />إنشاء جدول الأسبوع</button></footer>
    </form>
  </Modal>;
}
