import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { savedReports } from '@/db/schema';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'معرّف غير صالح.' }, { status: 400 });
  try {
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    return report ? Response.json(report) : Response.json({ error: 'النسخة غير موجودة.' }, { status: 404 });
  } catch {
    return Response.json({ error: 'تعذر تحميل النسخة.' }, { status: 503 });
  }
}
export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'معرّف غير صالح.' }, { status: 400 });
  try {
    const deleted = await db.delete(savedReports).where(eq(savedReports.id, id)).returning({ id: savedReports.id });
    return deleted.length ? Response.json({ ok: true }) : Response.json({ error: 'النسخة غير موجودة.' }, { status: 404 });
  } catch {
    return Response.json({ error: 'تعذر حذف النسخة.' }, { status: 503 });
  }
}
