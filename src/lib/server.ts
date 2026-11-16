import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { classrooms, settings, students } from '@/db/schema';
import { INITIAL_WORKSPACE, classWeeks, type Workspace } from './data';

let seedPromise: Promise<void> | undefined;
export function ensureSeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db.transaction(async tx => {
        await tx.insert(settings).values({ id: 'default', ...INITIAL_WORKSPACE.settings }).onConflictDoNothing();
        for (const classroom of INITIAL_WORKSPACE.classrooms) {
          const { students: roster, ...metadata } = classroom;
          const inserted = await tx.insert(classrooms).values(metadata).onConflictDoNothing().returning({ id: classrooms.id });
          if (inserted.length) {
            await tx.insert(students).values(roster.map(s => ({ ...s, classroomId: classroom.id })));
          }
        }
      });
    })().catch(error => { seedPromise = undefined; throw error; });
  }
  return seedPromise;
}

export async function getWorkspace(): Promise<Workspace> {
  await ensureSeed();
  const [teacher] = await db.select().from(settings).where(eq(settings.id, 'default'));
  const allClasses = await db.select().from(classrooms).orderBy(asc(classrooms.id));
  const allStudents = await db.select().from(students).orderBy(asc(students.position));
  const order = INITIAL_WORKSPACE.classrooms.map(c => c.id);
  allClasses.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return {
    settings: { ...teacher, rightLogo: teacher.rightLogo ?? null, leftLogo: teacher.leftLogo ?? null },
    classrooms: allClasses.map(c => ({ ...c, weeks: classWeeks(c), students: allStudents.filter(s => s.classroomId === c.id).map(s => ({
      id: s.id, name: s.name, position: s.position, scores: s.scores,
    })) })),
  };
}
