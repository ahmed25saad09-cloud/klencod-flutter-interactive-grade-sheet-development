import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/tajawal/800.css';
import './globals.css';
import './features.css';
import './autofill.css';
import './quick-fill.css';
import './print-options.css';

export const metadata: Metadata = {
  title: 'سِجِلّ | سجل متابعة الطلاب — أحمد متولي سعد متولي',
  description: 'سجل تفاعلي لرصد درجات الطلاب وحفظها تلقائيًا، مع تصدير سجلات الفصول بصيغة PDF. مدارس التربية النموذجية — مجمع إشبيليا بنين.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
