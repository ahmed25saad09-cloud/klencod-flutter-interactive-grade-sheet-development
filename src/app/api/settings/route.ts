import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { validSettings } from '@/lib/validation';
import { ensureSeed } from '@/lib/server';
export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!validSettings(body)) return Response.json({ error: 'يرجى إدخال اسم المعلم واسم المدرسة بشكل صحيح.' }, { status: 400 });
    await ensureSeed();
    const updatedAt = new Date().toISOString();
    const [saved] = await db.update(settings).set({ teacherName: body.teacherName.trim(), school: body.school.trim(), campus: body.campus.trim(), academicYear: body.academicYear.trim(), rightLogo: body.rightLogo ?? null, leftLogo: body.leftLogo ?? null, updatedAt }).where(eq(settings.id, 'default')).returning();
    return Response.json(saved);
  } catch (error) {
    console.error('Settings save failed:', error);
    return Response.json({ error: 'تعذر حفظ الإعدادات على الخادم. النسخة المحلية محفوظة.' }, { status: 503 });
  }
}
