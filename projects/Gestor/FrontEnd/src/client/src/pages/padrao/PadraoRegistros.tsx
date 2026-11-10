import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { useToast } from '@/context/ToastContext';
import { ACAO } from '@/lib/permissions';
import { getPadraoConfig, type PadraoCampo } from '@/lib/padraoConfig';
import api, { getErrorMsg } from '@/lib/api';

type Registro = Record<string, unknown>;

const columnHelper = createColumnHelper<Registro>();

interface PadraoRegistrosProps {
  tabela: string;
}

function textoRegistro(row: Registro | undefined): string {
  if (!row) return '';
  const nome = row.nome ?? row.codigo ?? row.id;
  return nome == null ? '' : String(nome);
}

export function PadraoRegistros({ tabela }: PadraoRegistrosProps) {
  const config = getPadraoConfig(tabela);
  const location = useLocation();
  const { addToast } = useToast();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [opcoes, setOpcoes] = useState<Record<string, Registro[]>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Registro | null>(null);
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState<Registro | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const relacoes = useMemo(
    () => Array.from(new Set((config?.campos ?? []).map((c) => c.relacao).filter(Boolean) as string[])),
    [config],
  );

  const carregar = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    try {
      const respostas = await Promise.all([
        api.get(`/padrao/${config.tabela}`),
        ...relacoes.map((r) => api.get(`/padrao/${r}`)),
      ]);
      const principal = (respostas[0].data ?? []) as Registro[];
      const mapa: Record<string, Registro[]> = {};
      relacoes.forEach((rel, idx) => {
        mapa[rel] = (respostas[idx + 1].data ?? []) as Registro[];
      });
      setRegistros(principal);
      setOpcoes(mapa);
      setErro(null);
    } catch (err: unknown) {
      setErro(getErrorMsg(err, 'Erro ao carregar cadastros padrao'));
    } finally {
      setLoading(false);
    }
  }, [config, relacoes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const opcoesDaRelacao = useCallback(
    (relacao: string) => {
      const lista = opcoes[relacao] ?? [];
      return lista
        .map((row) => ({
          value: Number(row.id),
          label: textoRegistro(row) || `#${row.id}`,
          sub: typeof row.codigo === 'string' ? row.codigo : undefined,
        }))
        .filter((o) => Number.isFinite(o.value));
    },
    [opcoes],
  );

  const exibirValor = useCallback(
    (campo: PadraoCampo, row: Registro): string => {
      const valor = row[campo.name];
      if (campo.tipo === 'boolean') return valor ? 'Sim' : 'Nao';
      if (campo.relacao) {
        if (valor == null || valor === '') return '-';
        const encontrado = (opcoes[campo.relacao] ?? []).find((r) => Number(r.id) === Number(valor));
        return encontrado ? textoRegistro(encontrado) : String(valor);
      }
      if (valor == null || valor === '') return '-';
      if (campo.tipo === 'number') {
        const n = Number(valor);
        return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : String(valor);
      }
      return String(valor);
    },
    [opcoes],
  );

  const registrosFiltrados = useMemo(() => {
    if (!config) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return registros;
    return registros.filter((row) =>
      config.colunas.some((col) => {
        const campo = config.campos.find((c) => c.name === col);
        if (!campo) return false;
        return exibirValor(campo, row).toLowerCase().includes(termo);
      }),
    );
  }, [config, registros, busca, exibirValor]);

  const abrirNovo = () => {
    if (!config) return;
    const iniciais: Record<string, unknown> = {};
    for (const campo of config.campos) {
      if (campo.tipo === 'boolean') iniciais[campo.name] = campo.padrao ?? false;
      else if (campo.padrao !== undefined) iniciais[campo.name] = campo.padrao;
      else iniciais[campo.name] = '';
    }
    setEditando(null);
    setValores(iniciais);
    setModalOpen(true);
  };

  const abrirEdicao = (row: Registro) => {
    if (!config) return;
    const iniciais: Record<string, unknown> = {};
    for (const campo of config.campos) {
      iniciais[campo.name] = row[campo.name] ?? (campo.tipo === 'boolean' ? false : '');
    }
    setEditando(row);
    setValores(iniciais);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
    setValores({});
  };

  const alterarValor = (campo: PadraoCampo, valor: unknown) => {
    setValores((prev) => ({ ...prev, [campo.name]: valor }));
  };

  const salvar = async () => {
    if (!config) return;
    const payload: Record<string, unknown> = {};

    for (const campo of config.campos) {
      const bruto = valores[campo.name];
      if (campo.tipo === 'boolean') {
        payload[campo.name] = Boolean(bruto);
        continue;
      }
      if (bruto === '' || bruto === null || bruto === undefined) {
        if (campo.required) {
          addToast('error', `Preencha o campo ${campo.label.replace(' *', '')}`);
          return;
        }
        payload[campo.name] = null;
        continue;
      }
      payload[campo.name] = campo.tipo === 'number' ? Number(bruto) : bruto;
    }

    if (editando && config.serial) {
      payload.id = Number(editando.id);
    }

    setSalvando(true);
    try {
      await api.post(`/padrao/${config.tabela}`, payload);
      addToast('success', editando ? 'Registro atualizado com sucesso' : 'Registro cadastrado com sucesso');
      fecharModal();
      carregar();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, 'Erro ao salvar registro'));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!config || !confirmarExclusao) return;
    const params: Record<string, unknown> = {};
    if (config.serial) {
      params.id = Number(confirmarExclusao.id);
    } else {
      for (const pk of config.pk) {
        params[pk] = confirmarExclusao[pk];
      }
    }

    setExcluindo(true);
    try {
      await api.delete(`/padrao/${config.tabela}`, { params });
      addToast('success', 'Registro excluido com sucesso');
      setConfirmarExclusao(null);
      carregar();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, 'Erro ao excluir registro'));
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = useMemo<ColumnDef<Registro>[]>(() => {
    if (!config) return [];
    const lista: ColumnDef<Registro>[] = config.campos
      .filter((campo) => config.colunas.includes(campo.name))
      .map((campo) =>
        columnHelper.accessor((row) => row[campo.name], {
          id: campo.name,
          header: campo.label.replace(' *', ''),
          enableSorting: true,
          cell: (info) => <span>{exibirValor(campo, info.row.original)}</span>,
        }),
      );

    lista.push(
      columnHelper.display({
        id: 'acoes',
        header: '',
        enableSorting: false,
        size: 60,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              rota={location.pathname}
              onEdit={() => abrirEdicao(row.original)}
              onDelete={() => setConfirmarExclusao(row.original)}
            />
          </div>
        ),
      }),
    );

    return lista;
  }, [config, exibirValor, location.pathname]);

  if (!config) {
    return (
      <Layout>
        <PageHeader title="Cadastros Padrao" />
        <Card>
          <p className="text-accent-red">Tabela padrao desconhecida: {tabela}</p>
        </Card>
      </Layout>
    );
  }

  const renderCampo = (campo: PadraoCampo) => {
    if (campo.tipo === 'boolean') {
      return (
        <label key={campo.name} className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={Boolean(valores[campo.name])}
            onChange={(e) => alterarValor(campo, e.target.checked)}
            className="rounded border-border-subtle"
          />
          {campo.label.replace(' *', '')}
        </label>
      );
    }

    if (campo.tipo === 'select') {
      if (campo.relacao) {
        const selecionado = valores[campo.name];
        return (
          <div key={campo.name} className="space-y-1.5">
            <label className="label-field">{campo.label}</label>
            <RegistroSelect<number>
              value={selecionado == null || selecionado === '' ? null : Number(selecionado)}
              onChange={(v) => alterarValor(campo, v)}
              onClear={campo.required ? undefined : () => alterarValor(campo, null)}
              options={opcoesDaRelacao(campo.relacao)}
              title={campo.label}
              placeholder="Selecione..."
            />
          </div>
        );
      }

      return (
        <div key={campo.name} className="space-y-1.5">
          <label className="label-field">{campo.label}</label>
          <RegistroSelect<string>
            value={valores[campo.name] == null ? null : String(valores[campo.name])}
            onChange={(v) => alterarValor(campo, v)}
            options={(campo.options ?? []).map((o) => ({ value: String(o.value), label: o.label }))}
            title={campo.label}
            placeholder="Selecione..."
          />
        </div>
      );
    }

    if (campo.tipo === 'textarea') {
      return (
        <div key={campo.name} className="space-y-1.5">
          <label className="label-field">{campo.label}</label>
          <textarea
            className="input-field"
            rows={3}
            value={String(valores[campo.name] ?? '')}
            onChange={(e) => alterarValor(campo, e.target.value)}
          />
        </div>
      );
    }

    return (
      <Input
        key={campo.name}
        label={campo.label}
        type={campo.tipo === 'number' ? 'number' : 'text'}
        step={campo.step}
        value={String(valores[campo.name] ?? '')}
        onChange={(e) => alterarValor(campo, e.target.value)}
      />
    );
  };

  return (
    <Layout>
      <PageHeader title={config.titulo} subtitle={config.subtitulo}>
        <ShowForPermission rota={location.pathname} acao={ACAO.INCLUIR}>
          <Button onClick={abrirNovo}>
            <Plus size={18} /> Novo
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <input
            className="input-field max-w-sm"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button
            onClick={() => carregar()}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>

        <DataTable
          columns={colunas}
          data={registrosFiltrados}
          loading={loading}
          error={erro}
          emptyMessage="Nenhum registro padrao cadastrado"
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editando ? `Editar ${config.titulo}` : `Novo ${config.titulo}`}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.campos.map(renderCampo)}
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <button type="button" onClick={fecharModal} className="btn-secondary" disabled={salvando}>
            Cancelar
          </button>
          <button type="button" onClick={salvar} className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmarExclusao !== null}
        onClose={() => setConfirmarExclusao(null)}
        onConfirm={excluir}
        title="Excluir registro"
        message="Tem certeza que deseja excluir este registro padrao?"
        variant="danger"
        confirmLabel="Excluir"
        loading={excluindo}
      />
    </Layout>
  );
}

export default PadraoRegistros;
