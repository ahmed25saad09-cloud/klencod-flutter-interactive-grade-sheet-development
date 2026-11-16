import { METRICS, MAX_WEEK, classWeeks, scoreKey, type Classroom, type MetricKey } from './data';

export type FillOptions = {
  week: number | 'all';
  scope: 'current' | 'all';
  mode: 'missing' | 'overwrite';
  preset: 'full' | 'custom' | 'copy';
  custom: Record<MetricKey, number>;
  referenceWeek: number;
};
export type FillChange = { classroomId: string; studentId: string; week: number; metric: MetricKey; key: string; before: number | null; after: number };
export const FULL_MARKS = Object.fromEntries(METRICS.map(m => [m.key, m.max])) as Record<MetricKey, number>;

export function validFillValues(options: FillOptions): boolean {
  return options.preset !== 'custom' || METRICS.every(m => Number.isInteger(options.custom[m.key]) && options.custom[m.key] >= 0 && options.custom[m.key] <= m.max);
}
export function buildFillPlan(classrooms: Classroom[], activeId: string, options: FillOptions) {
  const changes: FillChange[] = [];
  let targetCells = 0;
  let existingCells = 0;
  let skippedReference = 0;
  let targetStudentCount = 0;
  const targetWeeks = new Set<number>();
  const targets = options.scope === 'all' ? classrooms : classrooms.filter(c => c.id === activeId);
  const validWeek = options.week === 'all' || (Number.isInteger(options.week) && options.week >= 1 && options.week <= MAX_WEEK);
  if (validWeek && validFillValues(options) && (options.preset !== 'copy' || Number.isInteger(options.referenceWeek))) {
    for (const classroom of targets) {
      const available = classWeeks(classroom);
      const weeks = options.week === 'all' ? available : available.filter(w => w === options.week);
      if (weeks.length) targetStudentCount += classroom.students.length;
      for (const week of weeks) {
        targetWeeks.add(week);
        for (const student of classroom.students) {
          for (const metric of METRICS) {
            targetCells++;
            const key = scoreKey(week, metric.key);
            const before = student.scores[key] ?? null;
            if (before !== null) existingCells++;
            const after = options.preset === 'full' ? metric.max : options.preset === 'custom' ? options.custom[metric.key] : student.scores[scoreKey(options.referenceWeek, metric.key)] ?? null;
            if (after === null) { skippedReference++; continue; }
            if (options.mode === 'missing' && before !== null) continue;
            if (before === after) continue;
            changes.push({ classroomId: classroom.id, studentId: student.id, week, metric: metric.key, key, before, after });
          }
        }
      }
    }
  }
  return { changes, targetCells, existingCells, skippedReference, targetStudentCount, targetClassCount: targets.length, targetWeekCount: targetWeeks.size };
}
export type FillPlan = ReturnType<typeof buildFillPlan>;

export function applyFillPlan(classrooms: Classroom[], changes: FillChange[]): Classroom[] {
  const updates = new Map<string, Map<string, Record<string, number>>>();
  for (const change of changes) {
    if (!updates.has(change.classroomId)) updates.set(change.classroomId, new Map());
    const students = updates.get(change.classroomId)!;
    students.set(change.studentId, { ...students.get(change.studentId), [change.key]: change.after });
  }
  return classrooms.filter(c => updates.has(c.id)).map(c => ({
    ...c,
    students: c.students.map(s => updates.get(c.id)?.has(s.id) ? { ...s, scores: { ...s.scores, ...updates.get(c.id)!.get(s.id) } } : s),
  }));
}
