import { useEffect, useRef, useState } from 'react';

interface Props {
  onClick: () => void;
}

const BTN = 56;
const MARGIN = 12;
const STORAGE_KEY = 'fab_pos_encomenda';

export default function PlusButton({ onClick }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let p: { x: number; y: number } | null = null;
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        const v = JSON.parse(s);
        if (typeof v.x === 'number' && typeof v.y === 'number') p = v;
      }
    } catch { /* ignore */ }
    if (!p) {
      p = { x: window.innerWidth - BTN - MARGIN, y: window.innerHeight - BTN - MARGIN };
    }
    p.x = Math.max(MARGIN, Math.min(window.innerWidth - BTN - MARGIN, p.x));
    p.y = Math.max(MARGIN, Math.min(window.innerHeight - BTN - MARGIN, p.y));
    setPos(p);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    btnRef.current?.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    d.x = Math.max(MARGIN, Math.min(window.innerWidth - BTN - MARGIN, d.x + dx));
    d.y = Math.max(MARGIN, Math.min(window.innerHeight - BTN - MARGIN, d.y + dy));
    if (btnRef.current) {
      btnRef.current.style.left = `${d.x}px`;
      btnRef.current.style.top = `${d.y}px`;
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (!d.moved) {
      onClick();
      return;
    }
    const x = Math.max(MARGIN, Math.min(window.innerWidth - BTN - MARGIN, d.x));
    const y = Math.max(MARGIN, Math.min(window.innerHeight - BTN - MARGIN, d.y));
    setPos({ x, y });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
    } catch { /* ignore */ }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      className="list-plus"
      aria-label="Nova encomenda"
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}