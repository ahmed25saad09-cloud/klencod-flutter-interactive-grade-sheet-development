import { METRICS, WEEKS, MAX_WEEK, classWeeks, scoreKey, type Classroom, type Settings, type ScoreMap } from './data';

export function validLogo(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.length > 30 && value.length <= 700_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
}
export function validClass(value: unknown): value is Classroom {
  if (!value || typeof value !== 'object') return false;
  const c = value as Classroom;
  if (typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.id)) return false;
  if (![c.grade, c.section, c.subject, c.term, c.updatedAt].every(v => typeof v === 'string' && v.length <= 150)) return false;
  if (!c.grade.trim() || !c.subject.trim() || !Number.isFinite(Date.parse(c.updatedAt))) return false;
  if (c.weeks !== undefined && (!Array.isArray(c.weeks) || !c.weeks.length || c.weeks.length > MAX_WEEK || !c.weeks.every(w => Number.isInteger(w) && w >= 1 && w <= MAX_WEEK) || new Set(c.weeks).size !== c.weeks.length)) return false;
  const weeks = classWeeks(c);
  if (!Array.isArray(c.students) || c.students.length > 100) return false;
  const ids = new Set<string>();
  return c.students.every(s => {
    if (!s || typeof s.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(s.id) || ids.has(s.id)) return false;
    ids.add(s.id);
    if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 150 || !Number.isInteger(s.position) || s.position < 1) return false;
    if (!s.scores || typeof s.scores !== 'object' || Array.isArray(s.scores)) return false;
    return Object.entries(s.scores).every(([key, score]) => {
      const week = Number(key.split('-')[0]);
      const metric = METRICS.find(m => key === scoreKey(week, m.key));
      return !!metric && weeks.includes(week) && (score === null || (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= metric.max));
    });
  });
}
export function validSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false;
  const s = value as Settings;
  return [s.teacherName, s.school, s.campus, s.academicYear, s.updatedAt].every(v => typeof v === 'string' && v.length <= 180)
    && !!s.teacherName.trim() && !!s.school.trim() && Number.isFinite(Date.parse(s.updatedAt))
    && validLogo(s.rightLogo) && validLogo(s.leftLogo);
}
export function completeScores(scores: ScoreMap, weeks: number[] = [...WEEKS]): ScoreMap {
  return Object.fromEntries(weeks.flatMap(w => METRICS.map(m => [scoreKey(w, m.key), scores[scoreKey(w, m.key)] ?? null])));
}
