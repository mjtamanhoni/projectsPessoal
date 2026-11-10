import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { getErrorMsg } from '@/lib/api';

type Registro = Record<string, unknown>;

interface Resumo {
  tabela: string;
  inseridos: number;
  existentes: number;
  ignorados: number;
}

interface Aplicado {
  tipo: string;
  total: number;
  ultimo: string;
}

const resumoHelper = createColumnHelper<Resumo>();
const aplicadoHelper = createColumnHelper<Aplicado>();

function texto(row: Registro | undefined): string {
  if (!row) return '';
  const nome = row.fantasia || row.razao_social || row.nome || row.codigo || row.id;
  return nome == null ? '' : String(nome);
}

export function PadraoReplicar() {
  const { isSuperadmin } = useAuth();
  const { addToast } = useToast();

  const [empresas, setEmpresas] = useState<Registro[]>([]);
  const [pacotes, setPacotes] = useState<Registro[]>([]);
  const [aplicados, setAplicados] = useState<Aplicado[]>([]);
  const [empresaID, setEmpresaID] = useState<number | null>(null);
  const [pacoteID, setPacoteID] = useState<number>(0);
  const [resumo, setResumo] = useState<Resumo[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [replicando, setReplicando] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      try {
        const [resEmpresas, resPacotes] = await Promise.all([
          api.get('/empresas'),
          api.get('/padrao/pacote'),
        ]);
        if (!ativo) return;
        setEmpresas((resEmpresas.data ?? []) as Registro[]);
        setPacotes((resPacotes.data ?? []) as Registro[]);
      } catch (err: unknown) {
        if (ativo) addToast('error', getErrorMsg(err, 'Erro ao carregar dados'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [addToast]);

  const carregarAplicados = useCallback(
    async (id: number | null) => {
      if (!id) {
        setAplicados([]);
        return;
      }
      try {
        const resp = await api.get('/padrao/aplicados', { params: { empresa_id: id } });
        setAplicados((resp.data ?? []) as Aplicado[]);
      } catch (err: unknown) {
        addToast('error', getErrorMsg(err, 'Erro ao carregar itens aplicados'));
      }
    },
    [addToast],
  );

  useEffect(() => {
    carregarAplicados(empresaID);
  }, [empresaID, carregarAplicados]);

  const opcoesEmpresas = useMemo(
    () =>
      empresas
        .map((e) => ({
          value: Number(e.id),
          label: texto(e) || `Empresa #${e.id}`,
          sub: typeof e.razao_social === 'string' ? e.razao_social : undefined,
        }))
        .filter((o) => Number.isFinite(o.value)),
    [empresas],
  );

  const opcoesPacotes = useMemo(
    () => [
      { value: 0, label: 'Todos os cadastros padrao', sub: 'Aplica o catalogo completo' },
      ...pacotes
        .map((p) => ({
          value: Number(p.id),
          label: texto(p) || `Pacote #${p.id}`,
          sub: typeof p.descricao === 'string' ? p.descricao : undefined,
        }))
        .filter((o) => Number.isFinite(o.value)),
    ],
    [pacotes],
  );

  const replicar = async () => {
    if (!empresaID) {
      addToast('error', 'Selecione a empresa de destino');
      return;
    }
    setReplicando(true);
    setResumo(null);
    try {
      const resp = await api.post('/padrao/replicar', {
        empresa_id: empresaID,
        pacote_id: pacoteID > 0 ? pacoteID : undefined,
      });
      const dados = resp.data as { resumo?: Resumo[]; empresa?: string };
      setResumo(dados.resumo ?? []);
      addToast('success', `Cadastros padrao aplicados em ${dados.empresa ?? 'empresa'}`);
      carregarAplicados(empresaID);
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, 'Erro ao replicar cadastros padrao'));
    } finally {
      setReplicando(false);
    }
  };

  const colunasResumo = useMemo(
    () => [
      resumoHelper.accessor('tabela', { header: 'Tabela', enableSorting: true }),
      resumoHelper.accessor('inseridos', { header: 'Inseridos', enableSorting: true }),
      resumoHelper.accessor('existentes', { header: 'Ja existentes', enableSorting: true }),
      resumoHelper.accessor('ignorados', { header: 'Ignorados', enableSorting: true }),
    ],
    [],
  );

  const colunasAplicados = useMemo(
    () => [
      aplicadoHelper.accessor('tipo', { header: 'Tabela', enableSorting: true }),
      aplicadoHelper.accessor('total', { header: 'Aplicados', enableSorting: true }),
      aplicadoHelper.accessor('ultimo', {
        header: 'Ultima aplicacao',
        cell: (info) => {
          const valor = info.getValue();
          return valor ? new Date(valor).toLocaleString('pt-BR') : '-';
        },
      }),
    ],
    [],
  );

  if (!isSuperadmin) {
    return (
      <Layout>
        <PageHeader title="Replicar Cadastros Padrao" />
        <Card>
          <div className="flex items-center gap-2 text-accent-red">
            <ShieldAlert size={20} />
            <span>Apenas superadmin pode replicar cadastros padrao.</span>
          </div>
        </Card>
      </Layout>
    );
  }

  if (carregando) {
    return (
      <Layout>
        <Spinner fullPage />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Replicar Cadastros Padrao"
        subtitle="Aplica os cadastros do catalogo padrao em uma empresa"
      >
        <button
          onClick={() => {
            carregarAplicados(empresaID);
          }}
          className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={18} className="text-text-secondary" />
        </button>
      </PageHeader>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label-field">Empresa de destino *</label>
            <RegistroSelect<number>
              value={empresaID}
              onChange={(v) => setEmpresaID(v)}
              options={opcoesEmpresas}
              title="Empresa de destino"
              placeholder="Selecione a empresa..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-field">Pacote</label>
            <RegistroSelect<number>
              value={pacoteID}
              onChange={(v) => setPacoteID(v)}
              options={opcoesPacotes}
              title="Pacote de cadastros"
              placeholder="Todos os cadastros padrao"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={replicar}
            disabled={replicando || !empresaID}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CopyCheck size={18} /> {replicando ? 'Replicando...' : 'Replicar cadastros'}
          </button>
        </div>
      </Card>

      {resumo && (
        <Card className="mb-6" title="Resultado da replicacao">
          <DataTable columns={colunasResumo} data={resumo} emptyMessage="Nada a replicar" />
        </Card>
      )}

      <Card title="Ja aplicados nesta empresa">
        <DataTable
          columns={colunasAplicados}
          data={aplicados}
          emptyMessage="Nenhum cadastro padrao aplicado nesta empresa"
        />
      </Card>
    </Layout>
  );
}

export default PadraoReplicar;
