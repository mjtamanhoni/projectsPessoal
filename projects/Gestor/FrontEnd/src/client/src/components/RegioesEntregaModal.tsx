import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { RegioesEntregaMapa, type Municipio } from '@/components/RegioesEntregaMapa';
import { useToast } from '@/context/ToastContext';
import api, { getErrorMsg } from '@/lib/api';
import municipiosJson from '@/data/municipios.json';
import estadosJson from '@/data/estados.json';
import { MapPin, RefreshCw, Save, Search, X } from 'lucide-react';

interface Estado {
  codigo_uf: number;
  uf: string;
  nome: string;
}

interface RegiaoRow {
  empresa_id: number;
  id: number;
  uf: string;
  cidade: string;
  cidade_chave: string;
  codigo_ibge: string | null;
  latitude: number;
  longitude: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
  empresaNome: string;
}

const estados = (estadosJson as Estado[]).slice().sort((a, b) => a.nome.localeCompare(b.nome));
const municipios = municipiosJson as Municipio[];

function chaveCidade(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const municipiosPorUf = new Map<string, Municipio[]>();
const municipiosPorCodigo = new Map<string, Municipio>();
const municipiosPorChave = new Map<string, Municipio>();
for (const m of municipios) {
  const lista = municipiosPorUf.get(m.uf);
  if (lista) lista.push(m);
  else municipiosPorUf.set(m.uf, [m]);
  municipiosPorCodigo.set(m.codigo_ibge, m);
  municipiosPorChave.set(`${m.uf}|${chaveCidade(m.nome)}`, m);
}

function resolverMunicipio(row: RegiaoRow): Municipio | null {
  if (row.codigo_ibge) {
    const porCodigo = municipiosPorCodigo.get(row.codigo_ibge);
    if (porCodigo) return porCodigo;
  }
  return municipiosPorChave.get(`${row.uf}|${row.cidade_chave || chaveCidade(row.cidade)}`) ?? null;
}

export function RegioesEntregaModal({ isOpen, onClose, empresaId, empresaNome }: Props) {
  const { addToast } = useToast();

  const [ufAtiva, setUfAtiva] = useState<string>('SP');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Map<string, Municipio>>(new Map());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    try {
      const { data } = await api.get('/regioes-entrega', { params: { empresa_id: empresaId } });
      const rows = (data as RegiaoRow[]) ?? [];
      const mapa = new Map<string, Municipio>();
      for (const row of rows) {
        const municipio = resolverMunicipio(row);
        if (municipio) mapa.set(municipio.codigo_ibge, municipio);
      }
      setSelecionados(mapa);
      const primeiro = rows.find((r) => municipiosPorUf.has(r.uf));
      if (primeiro) setUfAtiva(primeiro.uf);
    } catch (err) {
      addToast('error', getErrorMsg(err));
      setSelecionados(new Map());
    } finally {
      setCarregando(false);
    }
  }, [empresaId, addToast]);

  useEffect(() => {
    if (!isOpen) return;
    setBusca('');
    setUfAtiva('SP');
    carregar();
  }, [isOpen, carregar]);

  const toggleCidade = (municipio: Municipio) => {
    setSelecionados((atual) => {
      const novo = new Map(atual);
      if (novo.has(municipio.codigo_ibge)) novo.delete(municipio.codigo_ibge);
      else novo.set(municipio.codigo_ibge, municipio);
      return novo;
    });
  };

  const selecionarTodasDaUf = () => {
    const lista = municipiosPorUf.get(ufAtiva) ?? [];
    setSelecionados((atual) => {
      const novo = new Map(atual);
      for (const m of lista) novo.set(m.codigo_ibge, m);
      return novo;
    });
  };

  const limparUf = () => {
    setSelecionados((atual) => {
      const novo = new Map(atual);
      for (const m of municipiosPorUf.get(ufAtiva) ?? []) novo.delete(m.codigo_ibge);
      return novo;
    });
  };

  const salvar = async () => {
    if (!empresaId) return;
    setSalvando(true);
    try {
      const regioes = Array.from(selecionados.values()).map((m) => ({
        codigo_ibge: m.codigo_ibge,
        cidade: m.nome,
        uf: m.uf,
        latitude: m.latitude,
        longitude: m.longitude,
      }));
      await api.post('/regioes-entrega/lote', { empresa_id: empresaId, regioes });
      addToast(
        'success',
        regioes.length === 0
          ? 'Regiões removidas: a empresa volta a atender todas as cidades'
          : `${regioes.length} cidade(s) salva(s) como região de entrega`,
      );
    } catch (err) {
      addToast('error', getErrorMsg(err));
    } finally {
      setSalvando(false);
    }
  };

  const cidadesFiltradas = useMemo(() => {
    const lista = municipiosPorUf.get(ufAtiva) ?? [];
    const termo = chaveCidade(busca);
    if (!termo) return lista;
    return lista.filter((m) => chaveCidade(m.nome).includes(termo));
  }, [ufAtiva, busca]);

  const selecionadasOrdenadas = useMemo(
    () => Array.from(selecionados.values()).sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome)),
    [selecionados],
  );

  const contagemPorUf = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of selecionados.values()) mapa.set(m.uf, (mapa.get(m.uf) ?? 0) + 1);
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selecionados]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Regiões de entrega" maxWidth="max-w-6xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <MapPin size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">{empresaNome}</p>
              <p className="text-xs text-text-secondary">
                <strong className="text-text-primary">{selecionados.size}</strong> cidade(s) atendida(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => carregar()}
              className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
              title="Recarregar regiões"
            >
              <RefreshCw size={18} className="text-text-secondary" />
            </button>
            <Button onClick={salvar} disabled={salvando || carregando || !empresaId}>
              <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {contagemPorUf.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {contagemPorUf.map(([uf, total]) => (
              <span key={uf} className="px-3 py-1.5 rounded-lg bg-background-hover text-text-secondary">
                {uf}: <strong className="text-text-primary">{total}</strong>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-text-secondary">
          Empresas sem nenhuma cidade cadastrada continuam atendendo todas as regiões. Cadastre cidades para restringir
          o atendimento.
        </p>

        {carregando ? (
          <div className="flex items-center justify-center gap-3 py-16 text-text-secondary">
            <Spinner /> Carregando regiões...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-xl border border-border-primary p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Mapa do Brasil</h3>
              <RegioesEntregaMapa
                ufAtiva={ufAtiva}
                onSelecionarUf={(uf) => {
                  setUfAtiva(uf);
                  setBusca('');
                }}
                selecionados={selecionados}
                onToggleCidade={toggleCidade}
                alturaMaxima="max-h-[440px]"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border-primary p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">Cidades selecionadas ({selecionados.size})</h3>
                  <button
                    className="text-xs font-semibold text-accent-red hover:underline disabled:opacity-40"
                    onClick={() => setSelecionados(new Map())}
                    disabled={selecionados.size === 0}
                  >
                    Limpar todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {selecionadasOrdenadas.length === 0 && (
                    <span className="text-sm text-text-secondary">Nenhuma cidade selecionada.</span>
                  )}
                  {selecionadasOrdenadas.map((m) => (
                    <button
                      key={m.codigo_ibge}
                      onClick={() => toggleCidade(m)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-background-hover text-text-primary hover:bg-accent-red/10"
                      title={`${m.nome}/${m.uf}`}
                    >
                      {m.nome}/{m.uf}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border-primary p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Adicionar cidades</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
                    <div className="space-y-1.5">
                      <label className="label-field">Estado</label>
                      <select className="input-field" value={ufAtiva} onChange={(e) => setUfAtiva(e.target.value)}>
                        {estados.map((e) => (
                          <option key={e.uf} value={e.uf}>
                            {e.uf}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="label-field">Buscar cidade</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <Input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Nome da cidade..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={selecionarTodasDaUf} className="flex-1 text-xs">
                      Todas de {ufAtiva}
                    </Button>
                    <Button variant="secondary" onClick={limparUf} className="flex-1 text-xs">
                      Limpar {ufAtiva}
                    </Button>
                  </div>

                  <div className="text-xs text-text-secondary">
                    {cidadesFiltradas.length} cidade(s) em {ufAtiva}
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-border-primary rounded-lg border border-border-primary">
                    {cidadesFiltradas.slice(0, 400).map((m) => {
                      const marcado = selecionados.has(m.codigo_ibge);
                      return (
                        <button
                          key={m.codigo_ibge}
                          onClick={() => toggleCidade(m)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            marcado ? 'bg-accent-primary/10 text-text-primary' : 'hover:bg-background-hover text-text-secondary'
                          }`}
                        >
                          <span className="truncate">{m.nome}</span>
                          <span className={`text-[11px] font-semibold ${marcado ? 'text-accent-red' : 'text-text-secondary'}`}>
                            {marcado ? 'Remover' : 'Adicionar'}
                          </span>
                        </button>
                      );
                    })}
                    {cidadesFiltradas.length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-text-secondary">Nenhuma cidade encontrada.</div>
                    )}
                    {cidadesFiltradas.length > 400 && (
                      <div className="px-3 py-2 text-center text-xs text-text-secondary">
                        Refine a busca para ver as demais cidades.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 z-10 mt-2 flex justify-end gap-2 border-t border-border-primary bg-bg-card px-6 py-3">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando || !empresaId}>
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar regiões'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
