import { db } from '@/db';
import { classrooms, students } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validClass, completeScores } from '@/lib/validation';
import { classWeeks } from '@/lib/data';
import { ensureSeed } from '@/lib/server';

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!validClass(body)) return Response.json({ error: 'بيانات غير صالحة. تحقق من الأسماء والأسابيع والدرجات (الاختبار من 5، وباقي البنود من 1).' }, { status: 400 });
    await ensureSeed();
    const updatedAt = new Date().toISOString();
    const { id, grade, section, subject, term } = body;
    const weeks = classWeeks(body);
    const saved = await db.transaction(async tx => {
      const result = await tx.update(classrooms).set({ grade, section, subject, term, weeks, updatedAt }).where(eq(classrooms.id, id)).returning();
      if (!result.length) return null;
      const rows = body.students.map((s, index) => ({ id: s.id, classroomId: id, name: s.name.trim(), position: index + 1, scores: completeScores(s.scores, weeks) }));
      await tx.delete(students).where(eq(students.classroomId, id));
      if (rows.length) await tx.insert(students).values(rows);
      return { ...result[0], students: rows.map((s, index) => ({ id: s.id, name: s.name, position: index + 1, scores: s.scores })) };
    });
    if (!saved) return Response.json({ error: 'الفصل غير موجود.' }, { status: 404 });
    return Response.json(saved);
  } catch (error) {
    console.error('Classroom save failed:', error);
    return Response.json({ error: 'لم يكتمل الحفظ في قاعدة البيانات. درجاتك محفوظة على هذا الجهاز؛ حاول مجددًا.' }, { status: 503 });
  }
}
