import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import brasilUfsJson from '@/data/brasil-ufs.json';
import estadosJson from '@/data/estados.json';
import municipiosJson from '@/data/municipios.json';

export interface Municipio {
  codigo_ibge: string;
  nome: string;
  uf: string;
  latitude: number;
  longitude: number;
}

interface Estado {
  codigo_uf: number;
  uf: string;
  nome: string;
}

interface GeoFeature {
  type: string;
  properties: { codarea?: string };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoCollection {
  type: string;
  features: GeoFeature[];
}

interface Caixa {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  codigo?: string;
}

interface Rotulo {
  municipio: Municipio;
  x: number;
  y: number;
  tx: number;
  ty: number;
  anchor: 'start' | 'middle' | 'end';
}

type Projetar = (lon: number, lat: number) => [number, number];

interface Projecao {
  largura: number;
  altura: number;
  projetar: Projetar;
}

const estados = estadosJson as Estado[];
const municipios = municipiosJson as Municipio[];
const geojson = brasilUfsJson as unknown as GeoCollection;

const municipiosPorUf = new Map<string, Municipio[]>();
for (const m of municipios) {
  const lista = municipiosPorUf.get(m.uf);
  if (lista) lista.push(m);
  else municipiosPorUf.set(m.uf, [m]);
}

const LARGURA_BRASIL = 780;
const LARGURA_ESTADO = 820;
const ALTURA_ESTADO = 560;
const FONTE_ROTULO = 13;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_PASSO = 0.25;
const ZOOM_TODOS_ROTULOS = 1.3;
const CAPITAIS = new Set([
  '1200401', '2704302', '1600303', '1302603', '2927408', '2304400', '5300108', '3205309',
  '5208707', '2111300', '5103403', '5002704', '3106200', '1501402', '2507507', '4106902',
  '2611606', '2211001', '3304557', '2408102', '4314902', '1100205', '1400100', '4205407',
  '3550308', '2800308', '1721000',
]);

const estadosOrdenados = [...estados].sort((a, b) => a.nome.localeCompare(b.nome));

interface CoresEstado {
  cor: string;
  borda: string;
}

const coresPorUf = new Map<string, CoresEstado>(
  estadosOrdenados.map((estado, indice): [string, CoresEstado] => {
    const matiz = Math.round((indice * 137.508) % 360);
    return [
      estado.uf,
      {
        cor: `hsl(${matiz} 60% 66%)`,
        borda: `hsl(${matiz} 55% 40%)`,
      },
    ];
  }),
);

interface Arraste {
  pointerId: number;
  x: number;
  y: number;
  panX: number;
  panY: number;
}

function ufDaFeature(feature: GeoFeature): string {
  return estados.find((e) => String(e.codigo_uf).padStart(2, '0') === feature.properties.codarea)?.uf ?? '';
}

function visitarCoordenadas(coords: unknown, visitar: (lon: number, lat: number) => void) {
  if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    visitar(coords[0] as number, coords[1] as number);
    return;
  }
  if (Array.isArray(coords)) {
    for (const item of coords) visitarCoordenadas(item, visitar);
  }
}

function criarProjecao(features: GeoFeature[], largura: number, altura: number, preenchimento = 0): Projecao {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    visitarCoordenadas(feature.geometry.coordinates, (lon, lat) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  }

  const folgaLon = (maxLon - minLon) * preenchimento;
  const folgaLat = (maxLat - minLat) * preenchimento;
  minLon -= folgaLon;
  maxLon += folgaLon;
  minLat -= folgaLat;
  maxLat += folgaLat;

  const escala = Math.min(largura / (maxLon - minLon), altura / (maxLat - minLat));
  const usadoLargura = (maxLon - minLon) * escala;
  const usadoAltura = (maxLat - minLat) * escala;
  const deslocamentoX = (largura - usadoLargura) / 2;
  const deslocamentoY = (altura - usadoAltura) / 2;

  const projetar: Projetar = (lon, lat) => [
    deslocamentoX + (lon - minLon) * escala,
    deslocamentoY + (maxLat - lat) * escala,
  ];

  return { largura, altura, projetar };
}

function geometriaParaPath(geometry: GeoFeature['geometry'], projetar: Projetar): string {
  const ringParaPath = (ring: number[][]) =>
    ring
      .map((coord, i) => {
        const [x, y] = projetar(coord[0], coord[1]);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][]).map(ringParaPath).join(' ');
  }
  return (geometry.coordinates as number[][][][])
    .map((poly) => poly.map(ringParaPath).join(' '))
    .join(' ');
}

function pontoDoSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ponto = svg.createSVGPoint();
  ponto.x = clientX;
  ponto.y = clientY;
  const matriz = svg.getScreenCTM();
  if (!matriz) return { x: 0, y: 0 };
  const local = ponto.matrixTransform(matriz.inverse());
  return { x: local.x, y: local.y };
}

function rotulosCidades(
  cidades: Municipio[],
  selecionados: Map<string, Municipio>,
  projecao: Projecao,
  zoom: number,
): Rotulo[] {
  const { projetar } = projecao;
  const ocupados: Caixa[] = cidades.map((m) => {
    const [x, y] = projetar(m.longitude, m.latitude);
    return { x1: x - 4, y1: y - 4, x2: x + 4, y2: y + 4, codigo: m.codigo_ibge };
  });

  const candidatas =
    zoom >= ZOOM_TODOS_ROTULOS
      ? cidades
      : cidades.filter((m) => selecionados.has(m.codigo_ibge) || CAPITAIS.has(m.codigo_ibge));

  const ordenadas = [...candidatas].sort((a, b) => {
    const aSel = selecionados.has(a.codigo_ibge) ? 1 : 0;
    const bSel = selecionados.has(b.codigo_ibge) ? 1 : 0;
    if (aSel !== bSel) return bSel - aSel;
    const aCap = CAPITAIS.has(a.codigo_ibge) ? 1 : 0;
    const bCap = CAPITAIS.has(b.codigo_ibge) ? 1 : 0;
    if (aCap !== bCap) return bCap - aCap;
    return a.nome.localeCompare(b.nome);
  });

  const rotulos: Rotulo[] = [];
  const alturaTexto = FONTE_ROTULO + 4;

  for (const municipio of ordenadas) {
    const [x, y] = projetar(municipio.longitude, municipio.latitude);
    const larguraTexto = municipio.nome.length * FONTE_ROTULO * 0.55 + 6;
    const candidatos: Array<Pick<Rotulo, 'tx' | 'ty' | 'anchor'>> = [
      { tx: x + 7, ty: y, anchor: 'start' },
      { tx: x - 7, ty: y, anchor: 'end' },
      { tx: x, ty: y - 11, anchor: 'middle' },
      { tx: x, ty: y + 13, anchor: 'middle' },
      { tx: x + 7, ty: y - 11, anchor: 'start' },
      { tx: x - 7, ty: y - 11, anchor: 'end' },
      { tx: x + 7, ty: y + 13, anchor: 'start' },
      { tx: x - 7, ty: y + 13, anchor: 'end' },
    ];

    for (const candidato of candidatos) {
      const x1 =
        candidato.anchor === 'start'
          ? candidato.tx
          : candidato.anchor === 'end'
            ? candidato.tx - larguraTexto
            : candidato.tx - larguraTexto / 2;
      const caixa: Caixa = {
        x1: x1 - 2,
        y1: candidato.ty - alturaTexto / 2 - 1,
        x2: x1 + larguraTexto + 2,
        y2: candidato.ty + alturaTexto / 2 + 1,
        codigo: municipio.codigo_ibge,
      };

      if (
        ocupados.some(
          (o) =>
            o.codigo !== municipio.codigo_ibge &&
            !(caixa.x2 < o.x1 || caixa.x1 > o.x2 || caixa.y2 < o.y1 || caixa.y1 > o.y2),
        )
      )
        continue;

      ocupados.push(caixa);
      rotulos.push({ municipio, x, y, ...candidato });
      break;
    }
  }

  return rotulos;
}

interface Props {
  ufAtiva: string | null;
  onSelecionarUf: (uf: string) => void;
  selecionados: Map<string, Municipio>;
  onToggleCidade: (municipio: Municipio) => void;
  alturaMaxima?: string;
}

export function RegioesEntregaMapa({ ufAtiva, onSelecionarUf, selecionados, onToggleCidade, alturaMaxima = 'max-h-[560px]' }: Props) {
  const [zoomUf, setZoomUf] = useState<string | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const arrasteRef = useRef<Arraste | null>(null);
  const moveuRef = useRef(false);

  useEffect(() => {
    if (zoomUf && zoomUf !== ufAtiva) setZoomUf(null);
  }, [ufAtiva, zoomUf]);

  useEffect(() => {
    setZoom(ZOOM_MIN);
    setPan({ x: 0, y: 0 });
    setArrastando(false);
    arrasteRef.current = null;
    moveuRef.current = false;
  }, [zoomUf]);

  const projecaoBrasil = useMemo(
    () => criarProjecao(geojson.features, LARGURA_BRASIL, LARGURA_BRASIL, 0.02),
    [],
  );

  const featurePorUf = useMemo(() => {
    const mapa = new Map<string, GeoFeature>();
    for (const feature of geojson.features) {
      const uf = ufDaFeature(feature);
      if (uf) mapa.set(uf, feature);
    }
    return mapa;
  }, []);

  const featureAtiva = ufAtiva ? featurePorUf.get(ufAtiva) : undefined;
  const ampliado = Boolean(zoomUf && zoomUf === ufAtiva && featureAtiva);

  const projecaoEstado = useMemo(
    () => (featureAtiva ? criarProjecao([featureAtiva], LARGURA_ESTADO, ALTURA_ESTADO, 0.07) : null),
    [featureAtiva],
  );

  const projecao = ampliado && projecaoEstado ? projecaoEstado : projecaoBrasil;

  const projecaoZoom = useMemo(() => {
    if (!projecaoEstado) return null;
    const centroX = projecaoEstado.largura / 2;
    const centroY = projecaoEstado.altura / 2;
    const projetar: Projetar = (lon, lat) => {
      const [x, y] = projecaoEstado.projetar(lon, lat);
      return [centroX + (x - centroX) * zoom, centroY + (y - centroY) * zoom];
    };
    return { ...projecaoEstado, projetar };
  }, [projecaoEstado, zoom]);

  const caminhosBrasil = useMemo(
    () =>
      geojson.features.map((feature) => ({
        uf: ufDaFeature(feature),
        d: geometriaParaPath(feature.geometry, projecaoBrasil.projetar),
      })),
    [projecaoBrasil],
  );

  const caminhoEstado = useMemo(
    () =>
      ampliado && featureAtiva && projecaoEstado
        ? geometriaParaPath(featureAtiva.geometry, projecaoEstado.projetar)
        : null,
    [ampliado, featureAtiva, projecaoEstado],
  );

  const cidadesDaUf = useMemo(() => (ufAtiva ? municipiosPorUf.get(ufAtiva) ?? [] : []), [ufAtiva]);
  const selecionadasForaDaUf = useMemo(
    () => Array.from(selecionados.values()).filter((m) => m.uf !== ufAtiva),
    [selecionados, ufAtiva],
  );

  const corEstado = ufAtiva ? coresPorUf.get(ufAtiva) : undefined;

  const rotulos = useMemo(
    () =>
      ampliado && projecaoZoom
        ? rotulosCidades(cidadesDaUf, selecionados, projecaoZoom, zoom)
        : [],
    [ampliado, projecaoZoom, cidadesDaUf, selecionados, zoom],
  );

  const limitarPan = (valor: { x: number; y: number }, escala = zoom) => {
    const largura = projecaoEstado?.largura ?? LARGURA_ESTADO;
    const altura = projecaoEstado?.altura ?? ALTURA_ESTADO;
    const limiteX = Math.max(0, (largura * (escala - 1)) / 2);
    const limiteY = Math.max(0, (altura * (escala - 1)) / 2);
    return {
      x: Math.max(-limiteX, Math.min(limiteX, valor.x)),
      y: Math.max(-limiteY, Math.min(limiteY, valor.y)),
    };
  };

  const alterarZoom = (novo: number) => {
    const escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(novo.toFixed(2))));
    setZoom(escala);
    setPan((atual) => limitarPan(atual, escala));
  };

  const resetarZoom = () => {
    setZoom(ZOOM_MIN);
    setPan({ x: 0, y: 0 });
  };

  const selecionarEstado = (uf: string) => {
    if (!uf) return;
    onSelecionarUf(uf);
    setZoom(ZOOM_MIN);
    setPan({ x: 0, y: 0 });
    setZoomUf(uf);
  };

  const iniciarArraste = (evento: ReactPointerEvent<SVGSVGElement>) => {
    if (!ampliado || evento.button !== 0) return;
    moveuRef.current = false;
    if (zoom <= ZOOM_MIN) return;

    const ponto = pontoDoSvg(evento.currentTarget, evento.clientX, evento.clientY);
    arrasteRef.current = {
      pointerId: evento.pointerId,
      x: ponto.x,
      y: ponto.y,
      panX: pan.x,
      panY: pan.y,
    };
    setArrastando(true);
  };

  const moverArraste = (evento: ReactPointerEvent<SVGSVGElement>) => {
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;

    const ponto = pontoDoSvg(evento.currentTarget, evento.clientX, evento.clientY);
    const deltaX = ponto.x - arraste.x;
    const deltaY = ponto.y - arraste.y;

    if (!moveuRef.current && Math.hypot(deltaX, deltaY) > 2) {
      moveuRef.current = true;
      evento.currentTarget.setPointerCapture(evento.pointerId);
    }
    if (!moveuRef.current) return;

    evento.preventDefault();
    setPan(limitarPan({ x: arraste.panX + deltaX, y: arraste.panY + deltaY }));
  };

  const finalizarArraste = (evento: ReactPointerEvent<SVGSVGElement>) => {
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;
    arrasteRef.current = null;
    setArrastando(false);
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
  };

  const sairArraste = (evento: ReactPointerEvent<SVGSVGElement>) => {
    if (!moveuRef.current) finalizarArraste(evento);
  };

  const cliquePermitido = () => {
    if (!moveuRef.current) return true;
    moveuRef.current = false;
    return false;
  };

  const transformacaoEstado =
    ampliado && projecaoEstado
      ? `translate(${pan.x} ${pan.y}) translate(${projecaoEstado.largura / 2} ${projecaoEstado.altura / 2}) scale(${zoom}) translate(${-projecaoEstado.largura / 2} ${-projecaoEstado.altura / 2})`
      : undefined;

  const nomeEstado = estados.find((e) => e.uf === ufAtiva)?.nome ?? ufAtiva ?? '';

  return (
    <div className="w-full">
      <div className="mb-3 flex items-start gap-3">
        {ampliado && (
          <button
            type="button"
            onClick={() => setZoomUf(null)}
            title="Voltar ao mapa do Brasil"
            aria-label="Voltar ao mapa do Brasil"
            className="shrink-0 rounded-lg border border-border-primary bg-bg-card p-1 transition-colors hover:bg-bg-muted"
          >
            <svg
              viewBox={`0 0 ${projecaoBrasil.largura} ${projecaoBrasil.altura}`}
              className="h-14 w-14"
              role="img"
              aria-label="Mapa do Brasil - voltar"
            >
              {caminhosBrasil.map((estado) => {
                const cores = estado.uf ? coresPorUf.get(estado.uf) : undefined;
                return (
                  <path
                    key={estado.uf || estado.d}
                    d={estado.d}
                    fill={estado.uf === ufAtiva ? cores?.cor ?? 'rgba(59,130,246,0.5)' : 'rgba(148,163,184,0.35)'}
                    stroke={estado.uf === ufAtiva ? '#2563eb' : 'rgba(100,116,139,0.65)'}
                    strokeWidth={estado.uf === ufAtiva ? 1.6 : 0.7}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{ampliado ? nomeEstado : 'Mapa do Brasil'}</h3>
          <p className="text-xs text-text-secondary">
            {ampliado
              ? 'Use o zoom e arraste o mapa para explorar. Clique nas cidades ou nos nomes para marcar.'
              : 'Clique em um estado ou na legenda para ampliar e ver as cidades.'}
          </p>
        </div>
      </div>

      <div className={`flex flex-col gap-4 ${ampliado ? '' : 'sm:flex-row sm:items-start'}`}>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${projecao.largura} ${projecao.altura}`}
            className={`w-full h-auto ${alturaMaxima} mx-auto select-none ${
              ampliado && zoom > ZOOM_MIN ? (arrastando ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
            style={{ touchAction: ampliado && zoom > ZOOM_MIN ? 'none' : undefined }}
            role="img"
            aria-label={ampliado ? `Mapa de ${nomeEstado} com cidades` : 'Mapa do Brasil para selecionar cidades atendidas'}
            onPointerDown={iniciarArraste}
            onPointerMove={moverArraste}
            onPointerUp={finalizarArraste}
            onPointerCancel={finalizarArraste}
            onPointerLeave={sairArraste}
          >
            {!ampliado &&
              caminhosBrasil.map((estado) => {
                const cores = estado.uf ? coresPorUf.get(estado.uf) : undefined;
                return (
                  <path
                    key={estado.uf || estado.d}
                    d={estado.d}
                    onClick={() => {
                      if (estado.uf) selecionarEstado(estado.uf);
                    }}
                    className={estado.uf ? 'cursor-pointer transition-opacity hover:opacity-80' : undefined}
                    fill={cores?.cor ?? 'rgba(148,163,184,0.35)'}
                    stroke={estado.uf === ufAtiva ? '#2563eb' : cores?.borda ?? 'rgba(100,116,139,0.75)'}
                    strokeWidth={estado.uf === ufAtiva ? 2.2 : 0.8}
                    vectorEffect="non-scaling-stroke"
                  >
                    {estado.uf && <title>{`${estado.uf} - clique para ampliar`}</title>}
                  </path>
                );
              })}

            <g transform={transformacaoEstado}>
              {ampliado && caminhoEstado && (
                <path
                  d={caminhoEstado}
                  fill={corEstado?.cor ?? '#3b82f6'}
                  fillOpacity={0.35}
                  stroke={corEstado?.borda ?? '#2563eb'}
                  strokeWidth={1.4}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{nomeEstado}</title>
                </path>
              )}

              {cidadesDaUf.map((municipio) => {
                const [x, y] = (ampliado && projecaoEstado ? projecaoEstado : projecaoBrasil).projetar(
                  municipio.longitude,
                  municipio.latitude,
                );
                const marcado = selecionados.has(municipio.codigo_ibge);
                const raio = marcado ? (ampliado ? 4.8 : 4.5) : ampliado ? 2.8 : 2.2;
                return (
                  <circle
                    key={municipio.codigo_ibge}
                    cx={x}
                    cy={y}
                    r={ampliado ? raio / zoom : raio}
                    className="cursor-pointer"
                    fill={marcado ? '#ef4444' : 'rgba(71,85,105,0.65)'}
                    stroke={marcado ? '#991b1b' : 'transparent'}
                    strokeWidth={marcado ? 0.8 : 0}
                    vectorEffect={ampliado ? 'non-scaling-stroke' : undefined}
                    onClick={() => {
                      if (cliquePermitido()) onToggleCidade(municipio);
                    }}
                  >
                    <title>{`${municipio.nome}/${municipio.uf}`}</title>
                  </circle>
                );
              })}
            </g>

            {!ampliado &&
              selecionadasForaDaUf.map((municipio) => {
                const [x, y] = projecaoBrasil.projetar(municipio.longitude, municipio.latitude);
                return (
                  <circle
                    key={municipio.codigo_ibge}
                    cx={x}
                    cy={y}
                    r={3.6}
                    fill="#ef4444"
                    stroke="#991b1b"
                    strokeWidth={0.8}
                    opacity={0.9}
                    onClick={() => onToggleCidade(municipio)}
                    className="cursor-pointer"
                  >
                    <title>{`${municipio.nome}/${municipio.uf}`}</title>
                  </circle>
                );
              })}

            {ampliado && (
              <g transform={`translate(${pan.x} ${pan.y})`}>
                {rotulos.map((rotulo) => {
                  const marcado = selecionados.has(rotulo.municipio.codigo_ibge);
                  return (
                    <text
                      key={rotulo.municipio.codigo_ibge}
                      x={rotulo.tx}
                      y={rotulo.ty}
                      textAnchor={rotulo.anchor}
                      dominantBaseline="central"
                      fontSize={FONTE_ROTULO}
                      fontWeight={marcado ? 700 : 500}
                      fill={marcado ? '#b91c1c' : '#334155'}
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      className="cursor-pointer"
                      onClick={() => {
                        if (cliquePermitido()) onToggleCidade(rotulo.municipio);
                      }}
                    >
                      {rotulo.municipio.nome}
                    </text>
                  );
                })}
              </g>
            )}
          </svg>

          {ampliado && (
            <div className="mt-3 rounded-lg border border-border-primary bg-bg-muted/40 p-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alterarZoom(zoom - ZOOM_PASSO)}
                  disabled={zoom <= ZOOM_MIN}
                  title="Diminuir zoom"
                  aria-label="Diminuir zoom"
                  className="rounded-lg border border-border-primary bg-bg-card p-1.5 transition-colors hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_PASSO}
                  value={zoom}
                  onChange={(evento) => alterarZoom(Number(evento.target.value))}
                  aria-label="Zoom do mapa"
                  className="h-1.5 flex-1 cursor-pointer accent-[#3b82f6]"
                />
                <button
                  type="button"
                  onClick={() => alterarZoom(zoom + ZOOM_PASSO)}
                  disabled={zoom >= ZOOM_MAX}
                  title="Aumentar zoom"
                  aria-label="Aumentar zoom"
                  className="rounded-lg border border-border-primary bg-bg-card p-1.5 transition-colors hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-text-secondary">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={resetarZoom}
                  disabled={zoom <= ZOOM_MIN && pan.x === 0 && pan.y === 0}
                  title="Restaurar zoom"
                  aria-label="Restaurar zoom"
                  className="rounded-lg border border-border-primary bg-bg-card p-1.5 transition-colors hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-secondary">
                {zoom < ZOOM_TODOS_ROTULOS
                  ? 'Aproxime para ver mais nomes das cidades.'
                  : 'Arraste o mapa para navegar e clique nas cidades para marcar.'}
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              Cidade atendida
            </span>
            <span>
              {ampliado
                ? 'Os nomes aparecem conforme o zoom e o espaço disponível.'
                : 'Cada cor representa um estado; use a legenda ao lado para ampliar.'}
            </span>
          </div>
        </div>

        {!ampliado && (
          <aside className="flex shrink-0 flex-col sm:w-48">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Estados</h4>
              <span className="text-[11px] text-text-secondary">{estadosOrdenados.length}</span>
            </div>
            <div className="max-h-[440px] space-y-0.5 overflow-y-auto pr-1">
              {estadosOrdenados.map((estado) => {
                const cores = coresPorUf.get(estado.uf);
                const ativo = estado.uf === ufAtiva;
                return (
                  <button
                    key={estado.uf}
                    type="button"
                    onClick={() => selecionarEstado(estado.uf)}
                    title={`Ampliar ${estado.nome}`}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      ativo ? 'bg-accent-primary/10 text-text-primary' : 'text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-[3px] border"
                      style={{ backgroundColor: cores?.cor, borderColor: ativo ? '#2563eb' : cores?.borda }}
                    />
                    <span className="w-6 shrink-0 font-semibold text-text-primary">{estado.uf}</span>
                    <span className="truncate">{estado.nome}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
