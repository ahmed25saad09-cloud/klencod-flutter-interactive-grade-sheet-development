import { getWorkspace } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(await getWorkspace(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Workspace read failed:', error);
    return Response.json({ error: 'تعذر الاتصال بقاعدة البيانات. يمكنك متابعة الإدخال والحفظ على هذا الجهاز.' }, { status: 503 });
  }
}
