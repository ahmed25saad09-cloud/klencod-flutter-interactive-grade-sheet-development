'use client';
/* eslint-disable @next/next/no-img-element -- Local resized raster logos are embedded directly in printable documents. */
import { useId, useRef, useState, type DragEvent } from 'react';
import { Upload, X, LoaderCircle, ImagePlus } from 'lucide-react';
import type { LogoSide } from '@/lib/data';
import { SchoolEmblem } from './brand';

export function LogoUpload({ side, value, onChange, disabled = false }: {
  side: LogoSide; value: string | null | undefined; onChange: (value: string | null) => void; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const label = side === 'rightLogo' ? 'يمين الترويسة' : 'يسار الترويسة';
  async function processFile(file?: File) {
    if (!file || disabled || busy) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('اختر صورة PNG أو JPG أو WebP. ملفات SVG غير مدعومة.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.'); return; }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('dimensions');
      const scale = Math.min(1, 640 / image.naturalWidth, 320 / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('canvas');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL('image/png');
      if (data.length > 700_000) data = canvas.toDataURL('image/webp', .86);
      if (data.length > 700_000) throw new Error('size');
      onChange(data);
    } catch { setError('تعذر تجهيز الصورة. جرّب صورة أصغر وبصيغة PNG أو JPG.'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }
  function drop(event: DragEvent<HTMLButtonElement>) { event.preventDefault(); setDragging(false); void processFile(event.dataTransfer.files[0]); }
  return <div className={`logo-upload-wrap ${dragging ? 'is-dragging' : ''}`}>
    <div className="logo-upload">
      <button type="button" className="logo-drop-zone" disabled={disabled || busy} aria-label={`رفع شعار ${label}`} title="اضغط لاختيار صورة أو اسحبها إلى هنا" onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); if (!disabled && !busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
        <span className={`logo-thumbnail ${value ? 'has-image' : ''}`}>{busy ? <LoaderCircle size={22} className="spin" /> : value ? <img src={value} alt={`شعار ${label}`} /> : side === 'rightLogo' ? <SchoolEmblem /> : <span className="default-company-logo">NCLE</span>}</span>
        <span className="logo-upload-copy"><strong>شعار {label}</strong><small>{busy ? 'جارٍ تجهيز الصورة...' : value ? 'اضغط لتغيير الصورة' : 'ارفع صورة الشعار'}</small></span>
        {busy ? null : value ? <ImagePlus size={15} className="logo-upload-action" /> : <Upload size={15} className="logo-upload-action" />}
      </button>
      {value && <button type="button" className="logo-remove" disabled={disabled || busy} aria-label={`إزالة شعار ${label}`} title="إزالة الشعار" onClick={() => { onChange(null); setError(''); }}><X size={12} /></button>}
    </div>
    <input ref={input} id={id} data-logo-input={side} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label={`ملف شعار ${label}`} onChange={e => { void processFile(e.target.files?.[0]); e.target.value = ''; }} />
    {error && <p className="logo-upload-error" role="alert">{error}</p>}
  </div>;
}
