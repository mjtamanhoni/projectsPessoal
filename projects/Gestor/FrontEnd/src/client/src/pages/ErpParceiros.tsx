import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { RowActions, type RowActionDef } from '@/components/ui/RowActions';
import { Spinner } from '@/components/ui/Spinner';
import { ErpParceiroForm } from '@/components/forms/ErpParceiroForm';
import { useToast } from '@/context/ToastContext';
import { getErrorMsg } from '@/lib/api';
import { erpExcluir, erpListar, erpLookups, erpObter, erpSalvar } from '@/lib/erpApi';
import { formatCelular, formatCpfCnpj, formatPhone } from '@/lib/utils';
import type {
  ErpCliente,
  ErpClientePayload,
  ErpFornecedor,
  ErpFornecedorPayload,
  ErpLookups,
} from '@/types/erp';

type Parceiro = ErpCliente | ErpFornecedor;
type FiltroStatus = '1' | '0' | 'todos';

interface ErpParceirosPageProps {
  tipo: 'cliente' | 'fornecedor';
}

function formatDocumento(value: string | undefined): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 14) return formatCpfCnpj(digits);
  return value;
}

function formatTelefone(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return formatCelular(digits);
  if (digits.length === 10) return formatPhone(digits);
  return value;
}

function ErpParceirosPage({ tipo }: ErpParceirosPageProps) {
  const recurso = tipo === 'cliente' ? 'clientes' : 'fornecedores';
  const singular = tipo === 'cliente' ? 'Cliente' : 'Fornecedor';
  const plural = tipo === 'cliente' ? 'Clientes' : 'Fornecedores';

  const [items, setItems] = useState<Parceiro[]>([]);
  const [lookups, setLookups] = useState<ErpLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('1');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Parceiro | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await erpListar<Parceiro>(recurso, { status: 'all', limit: 1000 });
      setItems(data);
    } catch (err: unknown) {
      setError(getErrorMsg(err, `Erro ao carregar ${plural.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  }, [recurso, plural]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    erpLookups()
      .then(setLookups)
      .catch(() => setLookups(null));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return items.filter((item) => {
      const statusOk = filtroStatus === 'todos' || String(item.status) === filtroStatus;
      if (!statusOk) return false;
      if (!termo) return true;
      const valores = [
        item.nome,
        item.pessoa?.nome,
        item.documento,
        item.codigo,
        item.telefone_principal,
        item.email_principal,
        item.endereco_principal,
      ];
      return valores.some((v) => String(v ?? '').toLowerCase().includes(termo));
    });
  }, [items, busca, filtroStatus]);

  const openNew = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = async (item: Parceiro) => {
    if (!item.id) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const full = await erpObter<Parceiro>(recurso, item.id);
      setEditing(full);
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, `Erro ao carregar ${singular.toLowerCase()}`));
      setEditing(item);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (payload: ErpClientePayload | ErpFornecedorPayload) => {
    try {
      if (editing?.id) {
        await erpSalvar(recurso, payload, editing.id);
        addToast('success', `${singular} atualizado com sucesso`);
      } else {
        await erpSalvar(recurso, payload);
        addToast('success', `${singular} cadastrado com sucesso`);
      }
      closeModal();
      await load();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, `Erro ao salvar ${singular.toLowerCase()}`));
      throw err;
    }
  };

  const handleToggleStatus = async (item: Parceiro) => {
    if (!item.id) return;
    const novoStatus = item.status === 1 ? 0 : 1;
    try {
      await erpSalvar(recurso, { status: novoStatus }, item.id);
      addToast('success', `${singular} ${novoStatus === 1 ? 'ativado' : 'inativado'} com sucesso`);
      await load();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, 'Erro ao alterar status'));
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await erpExcluir(recurso, confirmDelete);
      setConfirmDelete(null);
      addToast('success', `${singular} excluído com sucesso`);
      await load();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, `Erro ao excluir ${singular.toLowerCase()}`));
    } finally {
      setDeleting(false);
    }
  };

  const columnHelper = createColumnHelper<Parceiro>();

  const columns = [
    columnHelper.accessor('codigo', {
      header: 'Código',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor((row) => row.nome ?? row.pessoa?.nome, {
      id: 'nome',
      header: 'Nome / Razão social',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('documento', {
      header: 'CPF/CNPJ',
      cell: (info) => formatDocumento(info.getValue()),
    }),
    columnHelper.accessor('telefone_principal', {
      header: 'Telefone',
      cell: (info) => formatTelefone(info.getValue()),
    }),
    columnHelper.accessor('email_principal', {
      header: 'E-mail',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'endereco',
      header: 'Endereço',
      cell: ({ row }) => (
        <span className="block max-w-[240px] truncate" title={row.original.endereco_principal ?? ''}>
          {row.original.endereco_principal || '-'}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <span className={info.getValue() === 1 ? 'text-accent-green' : 'text-accent-red'}>
          {info.getValue() === 1 ? 'Ativo' : 'Inativo'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      size: 60,
      cell: ({ row }) => {
        const item = row.original;
        const statusLabel = item.status === 1 ? 'Inativar' : 'Ativar';
        const StatusIcon = item.status === 1 ? ToggleLeft : ToggleRight;
        const extras: RowActionDef[] = [
          {
            rotulo: statusLabel,
            icone: StatusIcon,
            cor: item.status === 1 ? '#f59e0b' : '#22c55e',
            onClick: () => handleToggleStatus(item),
          },
        ];
        return (
          <div className="flex justify-end">
            <RowActions
              rota={tipo === 'cliente' ? '/erp/clientes' : '/erp/fornecedores'}
              onEdit={() => handleEdit(item)}
              onDelete={() => item.id && setConfirmDelete(item.id)}
              extras={extras}
            />
          </div>
        );
      },
    }),
  ];

  return (
    <Layout>
      <PageHeader title={`${plural} ERP`} subtitle={`Cadastro de ${plural.toLowerCase()} no novo schema ERP`}>
        <Button onClick={openNew}>
          <Plus size={18} /> Novo {singular}
        </Button>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <PaginaFiltros
          busca={{
            valor: busca,
            onChange: setBusca,
            placeholder: `Buscar por nome, documento, código, telefone ou e-mail...`,
          }}
          status={{
            rotulo: 'Status',
            valor: filtroStatus,
            opcoes: [
              { valor: '1', label: 'Ativos' },
              { valor: '0', label: 'Inativos' },
              { valor: 'todos', label: 'Todos' },
            ],
            onChange: (v) => setFiltroStatus(v as FiltroStatus),
          }}
          onLimpar={() => {
            setBusca('');
            setFiltroStatus('1');
          }}
        />
        <DataTable
          columns={columns}
          data={filtrados}
          loading={loading}
          error={error}
          emptyMessage={`Nenhum ${singular.toLowerCase()} cadastrado`}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? `Editar ${singular}` : `Novo ${singular}`}
        maxWidth="max-w-6xl"
      >
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ErpParceiroForm
            key={`erp-${tipo}-${editing?.id ?? `new-${formKey}`}`}
            tipo={tipo}
            initial={editing}
            lookups={lookups}
            onSubmit={handleSubmit}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Excluir ${singular}`}
        message={`Tem certeza que deseja excluir este ${singular.toLowerCase()}? O registro será inativado.`}
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}

export function ErpClientesPage() {
  return <ErpParceirosPage tipo="cliente" />;
}

export function ErpFornecedoresPage() {
  return <ErpParceirosPage tipo="fornecedor" />;
}
