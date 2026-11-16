import { METRICS, classWeeks, scoreKey, type Classroom, type Student } from './data';
import type { FillChange } from './autofill';

export type QuickScope = 'current' | 'all';
export type QuickMode = 'missing' | 'overwrite';
export type QuizOptions = { week: number | 'all'; scope: QuickScope; mode: QuickMode; useHistory: boolean };
export type OtherOptions = { week: number | 'all'; scope: QuickScope; mode: QuickMode };
export type QuizChange = FillChange & { historyAverage: number | null; historyCount: number };
export const OTHER_METRICS = METRICS.filter(m => m.key !== 'test');

function randomInt(maxExclusive: number): number {
  const limit = 256 - (256 % maxExclusive);
  const bytes = new Uint8Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return bytes[0] % maxExclusive;
}
export function quizHistory(student: Student, targetWeek: number): { average: number | null; count: number } {
  const previous = Object.entries(student.scores)
    .map(([key, value]) => ({ week: Number(key.split('-')[0]), key, value }))
    .filter(item => item.key === scoreKey(item.week, 'test') && item.week < targetWeek && item.value !== null && item.value !== undefined && Number.isInteger(item.value) && item.value >= 0 && item.value <= 5)
    .sort((a, b) => a.week - b.week);
  if (!previous.length) return { average: null, count: 0 };
  let weighted = 0; let weights = 0;
  previous.forEach((item, index) => { const weight = index + 1; weighted += (item.value as number) * weight; weights += weight; });
  return { average: weighted / weights, count: previous.length };
}
function targetsFor(classrooms: Classroom[], activeId: string, scope: QuickScope) {
  return scope === 'all' ? classrooms : classrooms.filter(c => c.id === activeId);
}
function weeksFor(classroom: Classroom, week: number | 'all') {
  return week === 'all' ? classWeeks(classroom) : classWeeks(classroom).filter(w => w === week);
}

export function buildRandomQuizPlan(classrooms: Classroom[], activeId: string, options: QuizOptions) {
  const changes: QuizChange[] = [];
  const targets = targetsFor(classrooms, activeId, options.scope);
  const targetWeeks = new Set<number>();
  let targetCells = 0; let existingCells = 0; let targetStudentCount = 0; let historySamples = 0; let noHistorySamples = 0;
  for (const classroom of targets) {
    const weeks = weeksFor(classroom, options.week);
    if (weeks.length) targetStudentCount += classroom.students.length;
    for (const week of weeks) {
      targetWeeks.add(week);
      for (const student of classroom.students) {
        targetCells++;
        const key = scoreKey(week, 'test');
        const before = student.scores[key] ?? null;
        if (before !== null) existingCells++;
        if (options.mode === 'missing' && before !== null) continue;
        const history = options.useHistory ? quizHistory(student, week) : { average: null, count: 0 };
        const low = history.average === null ? 0 : Math.max(0, Math.ceil(history.average - 1));
        const high = history.average === null ? 5 : Math.min(5, Math.floor(history.average + 1));
        const after = low + randomInt(high - low + 1);
        if (history.average === null) noHistorySamples++; else historySamples++;
        if (before === after) continue;
        changes.push({ classroomId: classroom.id, studentId: student.id, week, metric: 'test', key, before, after, historyAverage: history.average, historyCount: history.count });
      }
    }
  }
  return { changes, targetCells, existingCells, targetStudentCount, targetClassCount: targets.length, targetWeekCount: targetWeeks.size, historySamples, noHistorySamples };
}

export function buildOtherMarksPlan(classrooms: Classroom[], activeId: string, options: OtherOptions) {
  const changes: FillChange[] = [];
  const targets = targetsFor(classrooms, activeId, options.scope);
  const targetWeeks = new Set<number>();
  let targetCells = 0; let existingCells = 0; let targetStudentCount = 0;
  for (const classroom of targets) {
    const weeks = weeksFor(classroom, options.week);
    if (weeks.length) targetStudentCount += classroom.students.length;
    for (const week of weeks) {
      targetWeeks.add(week);
      for (const student of classroom.students) {
        for (const metric of OTHER_METRICS) {
          targetCells++;
          const key = scoreKey(week, metric.key);
          const before = student.scores[key] ?? null;
          if (before !== null) existingCells++;
          if (options.mode === 'missing' && before !== null) continue;
          if (before === metric.max) continue;
          changes.push({ classroomId: classroom.id, studentId: student.id, week, metric: metric.key, key, before, after: metric.max });
        }
      }
    }
  }
  return { changes, targetCells, existingCells, targetStudentCount, targetClassCount: targets.length, targetWeekCount: targetWeeks.size };
}
