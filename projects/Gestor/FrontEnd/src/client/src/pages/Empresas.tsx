import { useMemo, useState, useEffect, useCallback } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { EmpresaForm } from '@/components/forms/EmpresaForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Empresa, EmpresaModulo, Modulo } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import api from '@/lib/api';
import { salvarLogomarcaCache } from '@/lib/empresaLogo';

const columnHelper = createColumnHelper<Empresa>();

export function Empresas() {
  const { data: empresas, loading, error, create, update, remove, fetchOne, refetch } = useApi<Empresa>('/empresas');
  const [busca, setBusca] = useState('');

  const empresasFiltradas = useMemo(
    () =>
      (empresas ?? []).filter((e) => passaBusca([e.razao_social, e.fantasia, e.cnpj_cpf], busca)),
    [empresas, busca],
  );
  const [modulos, setModulos] = useState<Modulo[]>([]);

  useEffect(() => {
    api.get<Modulo[]>('/modulos').then((r) => setModulos(r.data)).catch(() => {});
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  const [vinculos, setVinculos] = useState<Record<number, EmpresaModulo[]>>({});
  const [loadingVinculos, setLoadingVinculos] = useState<Set<number>>(new Set());
  const [emModalOpen, setEmModalOpen] = useState(false);
  const [emEmpresaId, setEmEmpresaId] = useState<number | null>(null);
  const [emSelected, setEmSelected] = useState<number[]>([]);

  const fetchVinculos = useCallback(async (empresaId: number) => {
    if (loadingVinculos.has(empresaId)) return;
    setLoadingVinculos((prev) => new Set(prev).add(empresaId));
    try {
      const res = await api.get('/empresa-modulos', { params: { empresa_id: empresaId } });
      setVinculos((prev) => ({ ...prev, [empresaId]: res.data as EmpresaModulo[] }));
    } catch {
      setVinculos((prev) => ({ ...prev, [empresaId]: [] }));
    } finally {
      setLoadingVinculos((prev) => { const next = new Set(prev); next.delete(empresaId); return next; });
    }
  }, [loadingVinculos]);

  const columns = [
    columnHelper.display({
      id: 'expand',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 40,
      meta: { expand: true } as Record<string, unknown>,
    }),
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
    }),
    columnHelper.accessor('razao_social', {
      header: 'Razão Social',
      enableSorting: true,
    }),
    columnHelper.accessor('fantasia', {
      header: 'Fantasia',
      enableSorting: true,
    }),
    columnHelper.accessor('cnpj_cpf', {
      header: 'CNPJ/CPF',
    }),
    columnHelper.accessor('telefone', {
      header: 'Telefone',
    }),
    columnHelper.accessor('email', {
      header: 'Email',
    }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/empresas"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (empresa: Empresa) => {
    const idToFetch = empresa.id || empresa.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? empresa);
    } catch {
      setEditing(empresa);
    } finally {
      setFetchingOne(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (data: Empresa) => {
    try {
      const temLogomarca = 'logomarca' in data && data.logomarca !== undefined && data.logomarca !== null;
      const { logomarca: logoUpload, ...dados } = data;
      let empresaId = dados.id ?? dados.codigo;

      if (editing) {
        empresaId = editing.id ?? editing.codigo ?? empresaId;
        await update({ ...dados, id: empresaId });
        closeModal();
        addToast('success', 'Empresa atualizada com sucesso');
      } else {
        const criada = await create({ ...dados });
        const idCriada = (criada as { id?: number } | null)?.id;
        if (idCriada) empresaId = idCriada;
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Empresa cadastrada com sucesso');
      }

      if (temLogomarca && empresaId) {
        await api.post('/empresas/logomarca', { id: empresaId, logomarca: logoUpload ?? '' });
        salvarLogomarcaCache(logoUpload || null);
        if (logoUpload) {
          refetch();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar empresa';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Empresa excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir empresa';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const openVinculoModal = (empresaId: number) => {
    const current = vinculos[empresaId] || [];
    setEmEmpresaId(empresaId);
    setEmSelected(current.map((v) => v.modulo_id));
    setEmModalOpen(true);
  };

  const handleEmSubmit = async () => {
    if (!emEmpresaId) return;
    try {
      await api.post('/empresa-modulos', { empresa_id: emEmpresaId, modulos: emSelected });
      setEmModalOpen(false);
      setEmEmpresaId(null);
      fetchVinculos(emEmpresaId);
      addToast('success', 'Vínculos salvos com sucesso');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Erro ao salvar vínculos';
      const axiosErr = err as { response?: { data?: { error?: string; detalhe?: unknown } } };
      if (axiosErr.response?.data?.error) msg = axiosErr.response.data.error;
      addToast('error', msg);
      console.error('[Empresas] handleEmSubmit erro:', axiosErr.response?.data || msg);
    }
  };

  const toggleModulo = (id: number) => {
    setEmSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const renderSubComponent = (empresa: Empresa) => {
    const eid = empresa.id ?? empresa.codigo;
    if (!eid) return <></>;
    const list = vinculos[eid];
    const loading = loadingVinculos.has(eid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Modulos da Empresa</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchVinculos(eid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/empresas" acao={ACAO.INCLUIR}>
              <button onClick={() => openVinculoModal(eid)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <Plus size={14} /> Adicionar
              </button>
            </ShowForPermission>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-primary" />
          </div>
        ) : !list || list.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">Nenhum modulo vinculado a esta empresa</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cod</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Modulo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                const moduloNome = item.modulo_nome || modulos.find((m) => (m.id ?? m.codigo) === item.modulo_id)?.nome || '-';
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">{moduloNome}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader title="Empresas" subtitle="Gerencie as empresas">
        <ShowForPermission rota="/empresas" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Empresa
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <PaginaFiltros
          busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar por razão social, fantasia ou CNPJ/CPF...' }}
          onLimpar={() => setBusca('')}
        />
        <DataTable columns={columns} data={empresasFiltradas} loading={loading} error={error} emptyMessage="Nenhuma empresa cadastrada" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Empresa' : 'Nova Empresa'} maxWidth="max-w-xl">
        {fetchingOne ? (
          <Spinner />
        ) : (
          <EmpresaForm
            key={`empresa-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={emModalOpen} onClose={() => { setEmModalOpen(false); setEmEmpresaId(null); }} title="Vincular Modulos">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Selecione os modulos disponiveis para esta empresa:</p>
          <div className="max-h-60 overflow-y-auto border border-border-primary rounded-lg p-3 space-y-1">
            {modulos.map((m) => {
              const mid = m.id ?? m.codigo;
              return (
                <label key={mid} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={emSelected.includes(mid!)}
                    onChange={() => mid && toggleModulo(mid)}
                    className="rounded border-border-subtle"
                  />
                  <span className="text-sm text-text-primary">{m.nome}</span>
                </label>
              );
            })}
            {modulos.length === 0 && (
              <p className="text-sm text-text-secondary">Nenhum modulo disponível</p>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setEmModalOpen(false); setEmEmpresaId(null); }}>Cancelar</Button>
            <Button type="button" onClick={handleEmSubmit}><Plus size={16} /> Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Empresa"
        message="Tem certeza que deseja excluir esta empresa? Esta acão nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
