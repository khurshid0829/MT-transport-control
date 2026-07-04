'use client';

import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * "Yangi X qo'shish" formalari uchun konteyner.
 *  - Desktop: joyida silliq ochiladigan/yopiladigan karta (grid-rows texnikasi).
 *  - Mobil (<860px): pastdan chiqadigan "Bottom Sheet" (drawer) — orqa fonda
 *    xiralashtiruvchi qatlam (backdrop) bilan, zamonaviy ilovalar uslubida
 *    (masalan iOS action sheet). Backdrop bosilsa yopiladi.
 */
export default function CollapsibleCard({ open, onToggle, title, children }: CollapsibleCardProps) {
  return (
    <>
      <div className={'bottom-sheet-backdrop' + (open ? ' open' : '')} onClick={onToggle} />
      <div className={'card bottom-sheet-card' + (open ? ' open' : '')} style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        <div className="bottom-sheet-handle" />
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <h2>{title}</h2>
          <ChevronDown size={18} className={'collapsible-chevron' + (open ? ' open' : '')} color="var(--text-secondary)" />
        </button>

        <div className={'collapsible' + (open ? ' open' : '')}>
          <div>
            <div style={{ padding: '0 24px 24px' }}>{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
