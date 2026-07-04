'use client';

import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * "Yangi X qo'shish" kabi formalarni och/yop qilish uchun qayta
 * ishlatiladigan konteyner. CSS grid-template-rows texnikasi bilan
 * silliq animatsiya beradi (JS balandlik o'lchashsiz, "sakrash" yo'q).
 */
export default function CollapsibleCard({ open, onToggle, title, children }: CollapsibleCardProps) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
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
  );
}
