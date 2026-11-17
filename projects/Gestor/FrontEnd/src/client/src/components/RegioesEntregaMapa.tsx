import { useMemo } from 'react';
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

const estados = estadosJson as Estado[];
const municipios = municipiosJson as Municipio[];
const geojson = brasilUfsJson as unknown as GeoCollection;

const municipiosPorUf = new Map<string, Municipio[]>();
for (const m of municipios) {
  const lista = municipiosPorUf.get(m.uf);
  if (lista) lista.push(m);
  else municipiosPorUf.set(m.uf, [m]);
}

const LARGURA = 780;

interface Props {
  ufAtiva: string | null;
  onSelecionarUf: (uf: string) => void;
  selecionados: Map<string, Municipio>;
  onToggleCidade: (municipio: Municipio) => void;
  alturaMaxima?: string;
}

export function RegioesEntregaMapa({ ufAtiva, onSelecionarUf, selecionados, onToggleCidade, alturaMaxima = 'max-h-[560px]' }: Props) {
  const projecao = useMemo(() => {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const visitar = (coords: unknown) => {
      if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const lon = coords[0] as number;
        const lat = coords[1] as number;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        return;
      }
      if (Array.isArray(coords)) {
        for (const item of coords) visitar(item);
      }
    };

    for (const feature of geojson.features) visitar(feature.geometry.coordinates);

    const altura = (LARGURA * (maxLat - minLat)) / (maxLon - minLon);
    const projetar = (lon: number, lat: number): [number, number] => [
      ((lon - minLon) / (maxLon - minLon)) * LARGURA,
      ((maxLat - lat) / (maxLat - minLat)) * altura,
    ];
    return { largura: LARGURA, altura, projetar };
  }, []);

  const { largura, altura, projetar } = projecao;

  const caminho = useMemo(() => {
    const ringParaPath = (ring: number[][]) =>
      ring
        .map((coord, i) => {
          const [x, y] = projetar(coord[0], coord[1]);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + ' Z';

    const geometriaParaPath = (geometry: GeoFeature['geometry']) => {
      if (geometry.type === 'Polygon') {
        return (geometry.coordinates as number[][][]).map(ringParaPath).join(' ');
      }
      return (geometry.coordinates as number[][][][])
        .map((poly) => poly.map(ringParaPath).join(' '))
        .join(' ');
    };

    return geojson.features.map((feature) => ({
      uf: estados.find((e) => String(e.codigo_uf).padStart(2, '0') === feature.properties.codarea)?.uf ?? '',
      d: geometriaParaPath(feature.geometry),
    }));
  }, [projetar]);

  const cidadesDaUf = ufAtiva ? municipiosPorUf.get(ufAtiva) ?? [] : [];
  const selecionadasForaDaUf = useMemo(
    () => Array.from(selecionados.values()).filter((m) => m.uf !== ufAtiva),
    [selecionados, ufAtiva],
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className={`w-full h-auto ${alturaMaxima} mx-auto select-none`}
        role="img"
        aria-label="Mapa do Brasil para selecionar cidades atendidas"
      >
        {caminho.map((estado) => (
          <path
            key={estado.uf || estado.d}
            d={estado.d}
            onClick={() => estado.uf && onSelecionarUf(estado.uf)}
            className={estado.uf ? 'cursor-pointer transition-colors' : undefined}
            fill={estado.uf === ufAtiva ? 'rgba(59,130,246,0.28)' : 'rgba(148,163,184,0.22)'}
            stroke={estado.uf === ufAtiva ? '#3b82f6' : 'rgba(100,116,139,0.75)'}
            strokeWidth={estado.uf === ufAtiva ? 1.6 : 0.8}
            vectorEffect="non-scaling-stroke"
          >
            {estado.uf && <title>{estado.uf}</title>}
          </path>
        ))}

        {cidadesDaUf.map((municipio) => {
          const [x, y] = projetar(municipio.longitude, municipio.latitude);
          const marcado = selecionados.has(municipio.codigo_ibge);
          return (
            <circle
              key={municipio.codigo_ibge}
              cx={x}
              cy={y}
              r={marcado ? 4.5 : 2.2}
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

        {selecionadasForaDaUf.map((municipio) => {
          const [x, y] = projetar(municipio.longitude, municipio.latitude);
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
        <span>Clique no estado para carregar as cidades e nos pontos para marcar.</span>
      </div>
    </div>
  );
}
