import { BookOpen } from 'lucide-react';
export function AppLogo() {
  return <div className="app-brand"><span className="app-brand-icon"><BookOpen size={25} strokeWidth={1.7} /></span><div><span className="brand-word">سِجِلّ<span className="brand-dot">.</span></span><span className="brand-tagline">مساحة المعلم</span></div></div>;
}
export function SchoolEmblem({ muted = false }: { muted?: boolean }) {
  return <svg width="49" height="57" viewBox="0 0 60 70" fill="none" aria-label="شعار المدرسة" role="img">
    <path d="M30 2C40 8 48 8 57 9L55 39C54 52 43 61 30 68C17 61 6 52 5 39L3 9C12 8 20 8 30 2Z" fill={muted ? '#e7efeb' : '#f4e7bd'} stroke={muted ? '#92aaa0' : '#c6a452'} strokeWidth="1.4" />
    <path d="M30 8C38 12 45 13 50 13L49 38C48 49 40 56 30 62C20 56 12 49 11 38L10 13C15 13 22 12 30 8Z" stroke={muted ? '#92aaa0' : '#c6a452'} strokeWidth=".8" />
    <path d="M17 28C22 26 26 27 30 30C34 27 38 26 43 28V43C38 41 34 42 30 45C26 42 22 41 17 43V28Z" fill={muted ? '#f8fbf9' : '#fffdf5'} stroke={muted ? '#6d8d80' : '#a28642'} strokeWidth="1.3" />
    <path d="M30 30V45M20 32L26 33M20 36L26 37M34 33L40 32M34 37L40 36" stroke={muted ? '#6d8d80' : '#a28642'} strokeWidth="1" />
    <path d="M29 24C24 20 27 16 30 14C30 18 35 19 31 24" fill={muted ? '#6d8d80' : '#b39851'} />
    <text x="30" y="55" textAnchor="middle" fill={muted ? '#6d8d80' : '#9c813e'} fontSize="8" fontFamily="Arial" fontWeight="700">1958</text>
  </svg>;
}
