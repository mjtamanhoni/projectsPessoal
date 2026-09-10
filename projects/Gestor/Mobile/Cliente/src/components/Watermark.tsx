/**
 * Watermark - Marca d'água decorativa com tema de alimentos
 *
 * Para DESATIVAR: mude ENABLE_WATERMARK para false
 * Para REVERTER: remova este componente do App.tsx
 */
export const ENABLE_WATERMARK = true;

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface Forma {
  tipo: string;
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  r?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: string;
  rot?: number;
}

function gerarFormasAlimento(rng: () => number): Forma[] {
  const formas: Forma[] = [];

  // Pizza
  const pizzaY = 50 + rng() * 200;
  const pizzaR = 16 + rng() * 12;
  formas.push({ tipo: 'pizza-circle', cx: 30, cy: pizzaY, r: pizzaR });
  for (let i = 0; i < 6; i++) {
    const ang = (i * 60) * Math.PI / 180;
    const x2 = 30 + Math.cos(ang) * pizzaR;
    const y2 = pizzaY + Math.sin(ang) * pizzaR;
    formas.push({ tipo: 'pizza-line', cx: 30, cy: pizzaY, x1: 30, y1: pizzaY, x2, y2 });
  }
  for (let i = 0; i < 3; i++) {
    const px = 22 + rng() * 16;
    const py = (pizzaY - 6) + rng() * 12;
    formas.push({ tipo: 'pizza-dot', cx: px, cy: py, r: 2 });
  }

  // Hamburger
  const burgY = 220 + rng() * 180;
  formas.push({ tipo: 'burg-top', cx: 30, cy: burgY, rx: 14, ry: 5 });
  formas.push({ tipo: 'burg-mid', cx: 30, cy: burgY + 6, rx: 12, ry: 2 });
  formas.push({ tipo: 'burg-bot', cx: 30, cy: burgY + 12, rx: 14, ry: 5 });

  // Batata frita
  const fritaY = 380 + rng() * 120;
  for (let i = 0; i < 5; i++) {
    const fx = 18 + rng() * 16;
    const fy = fritaY + i * 6;
    const rot = -15 + rng() * 30;
    formas.push({ tipo: 'fries', cx: fx, cy: fy, rot, width: 3, height: 14 });
  }

  // Copo de bebida
  const copoY = 100 + rng() * 280;
  formas.push({ tipo: 'copo', cx: 30, cy: copoY, width: 16, height: 24 });

  // Fatia de pizza (triângulo)
  const fatiaY = 320 + rng() * 200;
  const fr = 18 + rng() * 8;
  const pts = `${(30 - fr * 0.5).toFixed(1)},${(fatiaY + fr * 0.866).toFixed(1)} 30,${(fatiaY - fr * 0.3).toFixed(1)} ${(30 + fr * 0.5).toFixed(1)},${(fatiaY + fr * 0.866).toFixed(1)}`;
  formas.push({ tipo: 'fatia', cx: 30, cy: fatiaY, points: pts });

  // Donut
  const donutY = 480 + rng() * 100;
  formas.push({ tipo: 'donut-outer', cx: 30, cy: donutY, r: 10 });
  formas.push({ tipo: 'donut-inner', cx: 30, cy: donutY, r: 4 });

  // Pontos (migalhas)
  for (let i = 0; i < 15; i++) {
    const dx = 8 + rng() * 44;
    const dy = 30 + rng() * 540;
    const dr = 0.8 + rng() * 1.5;
    formas.push({ tipo: 'dot', cx: dx, cy: dy, r: dr });
  }

  return formas;
}

function renderForma(f: Forma, opacity: number) {
  const c = '#FFFFFF';
  switch (f.tipo) {
    case 'pizza-circle':
      return (
        <circle cx={f.cx} cy={f.cy} r={f.r} fill="none"
          stroke={c} strokeWidth="1.5" opacity={opacity + 0.04} />
      );
    case 'pizza-line':
      return (
        <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2}
          stroke={c} strokeWidth="1" opacity={opacity} />
      );
    case 'pizza-dot':
      return (
        <circle cx={f.cx} cy={f.cy} r={f.r} fill={c} opacity={opacity} />
      );
    case 'burg-top':
      return (
        <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
          fill={c} opacity={opacity + 0.02} />
      );
    case 'burg-mid':
      return (
        <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
          fill={c} opacity={opacity + 0.01} />
      );
    case 'burg-bot':
      return (
        <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
          fill={c} opacity={opacity} />
      );
    case 'fries':
      return (
        <rect x={f.cx} y={f.cy} width={f.width} height={f.height}
          rx="1.5" fill={c} opacity={opacity + 0.01}
          transform={`rotate(${f.rot} ${f.cx! + 1.5} ${f.cy! + 7})`} />
      );
    case 'copo':
      return (
        <path
          d={`M${f.cx! - 8},${f.cy} L${f.cx! - 5},${f.cy! + f.height!} Q${f.cx},${f.cy! + f.height! + 4} ${f.cx! + 5},${f.cy! + f.height!} L${f.cx! + 8},${f.cy} Z`}
          fill="none" stroke={c} strokeWidth="1.2" opacity={opacity} />
      );
    case 'fatia':
      return (
        <polygon points={f.points} fill="none"
          stroke={c} strokeWidth="1.2" opacity={opacity} />
      );
    case 'donut-outer':
      return (
        <circle cx={f.cx} cy={f.cy} r={f.r} fill="none"
          stroke={c} strokeWidth="2" opacity={opacity + 0.01} />
      );
    case 'donut-inner':
      return (
        <circle cx={f.cx} cy={f.cy} r={f.r} fill="none"
          stroke={c} strokeWidth="1" opacity={opacity} />
      );
    case 'dot':
      return (
        <circle cx={f.cx} cy={f.cy} r={f.r} fill={c} opacity={opacity} />
      );
    default:
      return null;
  }
}

export default function Watermark() {
  if (!ENABLE_WATERMARK) return null;

  const rng = createRng(hashString('chegou-watermark'));
  const formas = gerarFormasAlimento(rng);
  const opacity = 0.15;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 60,
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="60"
        height="600"
        viewBox="0 0 60 600"
        style={{ display: 'block' }}
      >
        {formas.map((f, i) => (
          <React.Fragment key={i}>{renderForma(f, opacity)}</React.Fragment>
        ))}
      </svg>
    </div>
  );
}

import React from 'react';
