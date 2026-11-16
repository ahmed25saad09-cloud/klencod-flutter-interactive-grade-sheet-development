import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { savedReports } from '@/db/schema';
import { validClass, validSettings } from '@/lib/validation';
import type { Workspace } from '@/lib/data';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const reports = await db.select({ id: savedReports.id, title: savedReports.title, teacherName: savedReports.teacherName, pages: savedReports.pages, createdAt: savedReports.createdAt }).from(savedReports).orderBy(desc(savedReports.createdAt)).limit(50);
    return Response.json(reports);
  } catch (error) {
    console.error('Reports read failed:', error);
    return Response.json({ error: 'تعذر تحميل النسخ المحفوظة.' }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as { title: unknown; pages: unknown; payload: Workspace };
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || !Number.isInteger(body.pages) || Number(body.pages) < 1 || Number(body.pages) > 1000 || !body.payload || !validSettings(body.payload.settings) || !Array.isArray(body.payload.classrooms) || body.payload.classrooms.length > 7 || !body.payload.classrooms.every(validClass)) {
      return Response.json({ error: 'بيانات النسخة غير صالحة.' }, { status: 400 });
    }
    const [report] = await db.insert(savedReports).values({ title: body.title.trim(), pages: Number(body.pages), payload: body.payload, teacherName: body.payload.settings.teacherName }).returning();
    return Response.json(report, { status: 201 });
  } catch (error) {
    console.error('Snapshot save failed:', error);
    return Response.json({ error: 'تعذر حفظ النسخة في قاعدة البيانات. يمكنك تنزيل نسخة JSON من الإعدادات.' }, { status: 503 });
  }
}
