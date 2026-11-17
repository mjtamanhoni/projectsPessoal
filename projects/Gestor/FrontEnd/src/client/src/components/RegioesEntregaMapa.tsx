import { useEffect, useMemo, useState } from 'react';
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
const FONTE_ROTULO = 12;
const CAPITAIS = new Set([
  '1200401', '2704302', '1600303', '1302603', '2927408', '2304400', '5300108', '3205309',
  '5208707', '2111300', '5103403', '5002704', '3106200', '1501402', '2507507', '4106902',
  '2611606', '2211001', '3304557', '2408102', '4314902', '1100205', '1400100', '4205407',
  '3550308', '2800308', '1721000',
]);

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

function rotulosCidades(
  cidades: Municipio[],
  selecionados: Map<string, Municipio>,
  projecao: Projecao,
): Rotulo[] {
  const { largura, altura, projetar } = projecao;
  const ocupados: Caixa[] = cidades.map((m) => {
    const [x, y] = projetar(m.longitude, m.latitude);
    return { x1: x - 3.5, y1: y - 3.5, x2: x + 3.5, y2: y + 3.5, codigo: m.codigo_ibge };
  });

  const ordenadas = [...cidades].sort((a, b) => {
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
        x1,
        y1: candidato.ty - alturaTexto / 2,
        x2: x1 + larguraTexto,
        y2: candidato.ty + alturaTexto / 2,
        codigo: municipio.codigo_ibge,
      };

      if (caixa.x1 < 2 || caixa.x2 > largura - 2 || caixa.y1 < 2 || caixa.y2 > altura - 2) continue;
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

  useEffect(() => {
    if (zoomUf && zoomUf !== ufAtiva) setZoomUf(null);
  }, [ufAtiva, zoomUf]);

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

  const cidadesDaUf = ufAtiva ? municipiosPorUf.get(ufAtiva) ?? [] : [];
  const selecionadasForaDaUf = useMemo(
    () => Array.from(selecionados.values()).filter((m) => m.uf !== ufAtiva),
    [selecionados, ufAtiva],
  );

  const rotulos = useMemo(
    () =>
      ampliado && projecaoEstado
        ? rotulosCidades(cidadesDaUf, selecionados, projecaoEstado)
        : [],
    [ampliado, projecaoEstado, cidadesDaUf, selecionados],
  );

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
            className="shrink-0 rounded-lg border border-border-primary bg-bg-card p-1 transition-colors hover:bg-background-hover"
          >
            <svg
              viewBox={`0 0 ${projecaoBrasil.largura} ${projecaoBrasil.altura}`}
              className="h-14 w-14"
              role="img"
              aria-label="Mapa do Brasil - voltar"
            >
              {caminhosBrasil.map((estado) => (
                <path
                  key={estado.uf || estado.d}
                  d={estado.d}
                  fill={estado.uf === ufAtiva ? 'rgba(59,130,246,0.5)' : 'rgba(148,163,184,0.35)'}
                  stroke={estado.uf === ufAtiva ? '#3b82f6' : 'rgba(100,116,139,0.65)'}
                  strokeWidth={estado.uf === ufAtiva ? 1.6 : 0.7}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{ampliado ? nomeEstado : 'Mapa do Brasil'}</h3>
          <p className="text-xs text-text-secondary">
            {ampliado
              ? 'Clique nas cidades ou nos nomes para marcar. Clique no mapa pequeno para voltar ao Brasil.'
              : 'Clique em um estado para ampliar e ver as cidades.'}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${projecao.largura} ${projecao.altura}`}
        className={`w-full h-auto ${alturaMaxima} mx-auto select-none`}
        role="img"
        aria-label={ampliado ? `Mapa de ${nomeEstado} com cidades` : 'Mapa do Brasil para selecionar cidades atendidas'}
      >
        {!ampliado &&
          caminhosBrasil.map((estado) => (
            <path
              key={estado.uf || estado.d}
              d={estado.d}
              onClick={() => {
                if (!estado.uf) return;
                onSelecionarUf(estado.uf);
                setZoomUf(estado.uf);
              }}
              className={estado.uf ? 'cursor-pointer transition-colors' : undefined}
              fill={estado.uf === ufAtiva ? 'rgba(59,130,246,0.28)' : 'rgba(148,163,184,0.22)'}
              stroke={estado.uf === ufAtiva ? '#3b82f6' : 'rgba(100,116,139,0.75)'}
              strokeWidth={estado.uf === ufAtiva ? 1.6 : 0.8}
              vectorEffect="non-scaling-stroke"
            >
              {estado.uf && <title>{`${estado.uf} - clique para ampliar`}</title>}
            </path>
          ))}

        {ampliado && caminhoEstado && (
          <path
            d={caminhoEstado}
            fill="rgba(59,130,246,0.16)"
            stroke="#3b82f6"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          >
            <title>{nomeEstado}</title>
          </path>
        )}

        {cidadesDaUf.map((municipio) => {
          const [x, y] = projecao.projetar(municipio.longitude, municipio.latitude);
          const marcado = selecionados.has(municipio.codigo_ibge);
          return (
            <circle
              key={municipio.codigo_ibge}
              cx={x}
              cy={y}
              r={marcado ? (ampliado ? 4.8 : 4.5) : ampliado ? 2.8 : 2.2}
              className="cursor-pointer"
              fill={marcado ? '#ef4444' : 'rgba(71,85,105,0.65)'}
              stroke={marcado ? '#991b1b' : 'transparent'}
              strokeWidth={marcado ? 0.8 : 0}
              onClick={() => onToggleCidade(municipio)}
            >
              <title>{`${municipio.nome}/${municipio.uf}`}</title>
            </circle>
          );
        })}

        {!ampliado &&
          selecionadasForaDaUf.map((municipio) => {
            const [x, y] = projecao.projetar(municipio.longitude, municipio.latitude);
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

        {ampliado &&
          rotulos.map((rotulo) => {
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
                onClick={() => onToggleCidade(rotulo.municipio)}
              >
                {rotulo.municipio.nome}
              </text>
            );
          })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(59,130,246,0.28)', border: '1px solid #3b82f6' }} />
          Estado selecionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          Cidade atendida
        </span>
        <span>
          {ampliado
            ? 'No mapa do estado, os nomes aparecem quando há espaço.'
            : 'Clique em um estado para ampliar; use o mapa pequeno para voltar ao Brasil.'}
        </span>
      </div>
    </div>
  );
}
