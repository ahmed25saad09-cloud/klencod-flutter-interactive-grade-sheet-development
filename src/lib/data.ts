export const WEEKS = [8, 9, 10, 11] as const;
export const METRICS = [
  { key: 'test', label: 'الاختبارات القصيرة', short: 'الاختبار', max: 5, color: 'peach' },
  { key: 'participation', label: 'المشاركة', short: 'المشاركة', max: 1, color: 'lilac' },
  { key: 'homework', label: 'الواجبات', short: 'الواجبات', max: 1, color: 'sage' },
  { key: 'activity', label: 'الأنشطة الصفية', short: 'الأنشطة', max: 1, color: 'rose' },
  { key: 'task', label: 'المهام الأدائية', short: 'المهام', max: 1, color: 'olive' },
] as const;
export type MetricKey = (typeof METRICS)[number]['key'];
export type ScoreMap = Record<string, number | null>;
export type Student = { id: string; name: string; position: number; scores: ScoreMap };
export type Classroom = {
  id: string; grade: string; section: string; subject: string; term: string;
  weeks: number[]; updatedAt: string; students: Student[];
};
export type LogoSide = 'rightLogo' | 'leftLogo';
export type Settings = {
  teacherName: string; school: string; campus: string; academicYear: string;
  rightLogo: string | null; leftLogo: string | null; updatedAt: string;
};
export type Workspace = { settings: Settings; classrooms: Classroom[] };
export type SavedReport = {
  id: string; title: string; createdAt: string; pages: number; teacherName: string; payload: Workspace;
};
export const scoreKey = (week: number, metric: string) => `${week}-${metric}`;
export const DEFAULT_SETTINGS: Settings = {
  teacherName: 'أحمد متولي سعد متولي',
  school: 'مدارس التربية النموذجية',
  campus: 'مجمع إشبيليا - بنين',
  academicYear: '1447 هـ',
  rightLogo: null,
  leftLogo: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function roster(names: string, tests: string) {
  const allNames = names.trim().split('\n').map(n => n.trim());
  const allTests = tests.trim().split('\n').map(row => row.trim().split(/\s+/).map(Number));
  return allNames.map((name, i) => ({
    id: '', name, position: i + 1,
    scores: Object.fromEntries(WEEKS.flatMap((week, w) => METRICS.map(metric => [
      scoreKey(week, metric.key), metric.key === 'test' ? (allTests[i]?.[w] ?? 0) : 1,
    ]))),
  }));
}

const fifthA = roster(`أحمد علي القحطاني
تميم عبدالرحمن الحسن
حمود فيصل العتيبي
سعود ثامر المرشد
ضيدان فراج ضيدان ابوثنين
عبدالعزيز سعود الغامدي
عبدالمجيد فهد الخريجي
عزام فارس الحربي
غيث عبدالعزيز المطيري
فهد محمد القرني
فيصل عائض عدله المطيري
معاذ عبدالكريم العنزي
يزيد احمد الحركان`, `0 3 0 1
5 5 5 5
0 0 2 2
0 4 4 4
0 0 0 0
5 5 5 5
0 5 0 0
5 5 5 5
4 4 1 4
0 1 5 5
3 3 3 3
4 4 4 4
4 4 4 4`);
const fifthB = roster(`ركان عادل الغامدي
زياد طارق المطيري
سلطان عبدالرحمن الغامدي
طلال فيصل
عبدالرحمن عبدالعزيز الثقفي
عبدالله عسكر
عبدالملك محمد سفر الغامدي
فهد بدر الرشيدي
فيصل بدر الشمري
فيصل عبدالله آل فهاد
محمد منصور العنزي
محمد وليد العتيبي
ناصر مسعود القحطاني
وليد وسبي عيان العنزي`, `5 5 5 5
5 5 5 5
2 0 2 2
4 4 1 4
5 5 5 5
0 2 3 3
5 5 5 5
3 3 3 3
5 5 5 5
1 0 0 0
5 5 5 5
5 5 5 5
5 5 5 5
2 2 2 2`);
const sixthA = roster(`بتال محمد العنزي
بدر عبدالسالم الهذلول
بدر فايز عبدالله الحربي
تميم عبدالعزيز المطيري
ثامر دخيل دغيم الحربي
ثامر محمد سليمان الزويد
جابر عبدالوهاب عايض العتيبي
خالد جمعان العمري
خالد مطلق خالد المطيري
راكان عبدالعزيز الشمري
سعد فايز عيد العنزي
صقر شاكر المطيري
علي مساعده الشمالي
فهد بندر محمد العتيبي`, `1 3 0 0
2 3 3 3
5 5 5 5
0 0 2 2
3 2 3 3
0 0 0 0
2 2 2 2
3 5 3 5
0 0 0 0
0 0 5 5
0 0 1 1
2 2 2 2
3 3 3 3
0 0 1 1`);
const sixthB = roster(`اسامه فوز فالح العنزي
خالد عبدالله الثقفي
صقر عبدالعزيز الهذيل
طه ابراهيم حميد
عبدالله علي محمد الغامدي
عبدالمحسن عبدالرحمن العويس
عساف عبدالله القحطاني
علي حمد عبود القحطاني
علي صقر الشهراني
فهد سعود العنزي
محمد احمد حمد آل حمدان
محمد عادل القحطاني
نايف محمد صالح العيسي`, `5 5 5 3
1 3 0 2
3 3 3 3
1 0 1 1
5 5 5 5
0 0 0 0
5 0 4 4
1 1 1 1
5 5 5 5
5 5 5 5
2 2 2 2
0 0 1 1
1 1 1 5`);
const middle = roster(`إبراهيم عبدالله علي آل جمعه
الوليد محمد ناصر العتيبي
بتال عادل الغامدي
بندر ناصر الحربي
جاسر عبدالرحمن الغامدي
خالد محمد السبيعي
خالد وليد الغامدي
راكان عبدالاله فليح المطيري
صقر عبدالهادي غانم الجروي
طارق فوز فالح العنزي
عبدالرحمن بندر الغامدي
عبدالرحمن عبدالعزيز الرويلي
عبدالعزيز عبدالله الشهري
عبدالله محمد محمد الحويلعي
عبدالله حمد عبود القحطاني
عبدالملك فهد القحطاني
علي سعيد علي محمد الشهراني
فارس رياض العمري
فهد محمد القحطاني
فيصل ابراهيم العيسي
محمد بندر الخريم
محمد سلمان المطيري
محمد صالح غازي العتيبي
محمد عبدالرحمن العويس
محمد علي حامد الحبرقي
محمد مشاري محمد المطيري
مشعل سعود التوم`, `0 0 0 0
5 5 5 5
5 5 5 5
5 5 5 5
3 3 3 3
0 0 0 0
0 0 0 0
5 5 5 5
1 1 1 1
5 5 5 5
1 1 1 1
0 0 0 0
3 3 3 3
5 5 5 5
2 2 2 2
5 5 5 5
5 5 5 5
4 4 4 4
4 4 4 4
4 4 4 4
1 1 1 1
1 1 1 1
5 5 5 5
5 5 5 5
0 0 5 5
5 5 5 5
0 0 0 0`);
const secondaryNames = `بندر نايف الشمري
تركي بدر محمد المسلم
حمود شجاع السبيعي
زايد سلطان السمير
سعود مساعد خلف العنزي
سلطان محمد رفاع العتيبي
سليمان نادر سليمان الحربي
عبدالرؤوف محمد ابراهيم الجنيدل
عبدالسلام عبدالله عائض القحطاني
عبدالله محمد مبارك المسعودي
عمار ياسر حسين
عمر مشيب عبدالله القحطاني
غيث منصور قاسم الرويلي
فهد بدر الغامدي
فهد محمد ظافر الشهري
مالك عبدالله الحربي
محمد سعد الغامدي
محمد فرحان عايض المطيري
مشعل مشاري محمد العجيبي
منصور زيد السبيعي
نايف عبدالعزيز نايف الصالحي
نواف محمد علي الحربي
هشام عبدالرحمن الحميد
وليد حمد العنزي
وليد محمد العنزي`;
const biology = roster(secondaryNames, `0 0 0 2
2 2 2 2
0 0 0 0
3 3 3 3
4 4 4 4
1 1 1 1
0 2 0 0
0 0 0 0
5 5 5 5
4 4 4 4
5 5 5 5
0 0 0 0
5 5 5 5
0 0 1 1
5 5 5 5
5 5 2 2
2 0 0 0
0 0 4 4
5 5 5 5
0 0 0 0
2 0 0 0
0 0 2 2
0 0 0 0
2 2 0 0
0 0 2 2`);
const chemistry = roster(secondaryNames, `5 5 5 5
2 0 5 5
0 3 0 2
3 3 3 3
0 0 0 0
2 0 5 5
0 2 2 2
0 0 0 0
5 5 5 5
0 0 0 0
4 4 4 4
0 0 0 0
5 5 5 5
0 2 0 0
5 5 5 5
0 0 2 2
2 0 0 0
0 0 4 4
5 5 5 5
0 0 0 0
2 0 0 0
0 0 5 5
0 0 0 0
2 2 2 2
0 0 0 0`);

export const INITIAL_WORKSPACE: Workspace = {
  settings: DEFAULT_SETTINGS,
  classrooms: [
    { id: '5-a', grade: 'الخامس', section: 'أ', subject: 'العلوم' },
    { id: '5-b', grade: 'الخامس', section: 'ب', subject: 'العلوم' },
    { id: '6-a', grade: 'السادس', section: 'أ', subject: 'العلوم' },
    { id: '6-b', grade: 'السادس', section: 'ب', subject: 'العلوم' },
    { id: '2-m', grade: 'الثاني المتوسط', section: '', subject: 'العلوم' },
    { id: '1-s-bio', grade: 'الأول الثانوي', section: '', subject: 'الأحياء' },
    { id: '1-s-chem', grade: 'الأول الثانوي', section: '', subject: 'الكيمياء' },
  ].map((c, i) => ({
    ...c, term: 'الفصل الدراسي الأول', weeks: [...WEEKS], updatedAt: DEFAULT_SETTINGS.updatedAt,
    students: [fifthA, fifthB, sixthA, sixthB, middle, biology, chemistry][i]
      .map((s, index) => ({ ...s, id: `${c.id}-student-${index + 1}`, scores: { ...s.scores } })),
  })),
};
export const MAX_WEEK = 40;
export type WeekSelection = number | number[] | 'all';
export const className = (c: Classroom) => `${c.grade}${c.section ? ` - ${c.section}` : ''}`;
export const classWeeks = (c: Pick<Classroom, 'weeks'>): number[] => Array.isArray(c.weeks) && c.weeks.length ? [...new Set(c.weeks)].sort((a, b) => a - b) : [...WEEKS];
export const weekName = (week: number): string => {
  const names = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر'];
  if (week >= 1 && week <= 19) return names[week - 1];
  const tens: Record<number, string> = { 20: 'العشرون', 30: 'الثلاثون', 40: 'الأربعون' };
  return tens[week] || `${names[(week % 10) - 1]} و${tens[Math.floor(week / 10) * 10]}`;
};
export const classStats = (c: Classroom) => {
  const keys = classWeeks(c).flatMap(w => METRICS.map(m => scoreKey(w, m.key)));
  const values = c.students.flatMap(s => keys.map(key => s.scores[key]));
  const entered = values.filter(v => v !== null && v !== undefined).length;
  const total = c.students.length * keys.length;
  return { entered, total, percent: total ? Math.round(entered / total * 100) : 0 };
};
export const studentTotal = (s: Student, weeks: number[] = [...WEEKS]) => weeks.reduce((sum, w) => sum + METRICS.reduce((subtotal, m) => subtotal + (s.scores[scoreKey(w, m.key)] ?? 0), 0), 0);
export const maxTotal = (c: Classroom) => classWeeks(c).length * METRICS.reduce((sum, m) => sum + m.max, 0);
export const pageCount = (c: Classroom, selectedWeek: WeekSelection = 'all') => {
  const available = classWeeks(c);
  const weeks = selectedWeek === 'all' ? available : Array.isArray(selectedWeek) ? available.filter(w => selectedWeek.includes(w)) : available.filter(w => w === selectedWeek);
  if (!weeks.length) return 0;
  return Math.max(1, Math.ceil(c.students.length / 19)) * Math.max(1, Math.ceil(weeks.length / 4));
};
