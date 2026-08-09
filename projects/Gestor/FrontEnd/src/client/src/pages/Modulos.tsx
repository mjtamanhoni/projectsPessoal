import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ModuloForm } from '@/components/forms/ModuloForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Modulo, ModuloFormulario, Formulario } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import api from '@/lib/api';

const columnHelper = createColumnHelper<Modulo>();

export function Modulos() {
  const { data: modulos, loading, error, create, update, remove, fetchOne, refetch } = useApi<Modulo>('/modulos');
  const [formularios, setFormularios] = useState<Formulario[]>([]);

  useEffect(() => {
    api.get<Formulario[]>('/formularios').then((r) => setFormularios(r.data)).catch(() => {});
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Modulo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [vinculos, setVinculos] = useState<Record<number, ModuloFormulario[]>>({});
  const [loadingVinculos, setLoadingVinculos] = useState<Set<number>>(new Set());
  const [vfModalOpen, setVfModalOpen] = useState(false);
  const [vfModuloId, setVfModuloId] = useState<number | null>(null);
  const [vfSelected, setVfSelected] = useState<number[]>([]);

  const fetchVinculos = useCallback(async (moduloId: number) => {
    if (loadingVinculos.has(moduloId)) return;
    setLoadingVinculos((prev) => new Set(prev).add(moduloId));
    try {
      const res = await api.get('/modulo-formularios', { params: { modulo_id: moduloId } });
      setVinculos((prev) => ({ ...prev, [moduloId]: res.data as ModuloFormulario[] }));
    } catch {
      setVinculos((prev) => ({ ...prev, [moduloId]: [] }));
    } finally {
      setLoadingVinculos((prev) => { const next = new Set(prev); next.delete(moduloId); return next; });
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
      header: 'Codigo',
      enableSorting: true,
    }),
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('descricao', {
      header: 'Descricao',
      cell: (info) => info.getValue() || '-',
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
            rota="/modulos"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (modulo: Modulo) => {
    const idToFetch = modulo.id || modulo.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? modulo);
    } catch {
      setEditing(modulo);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Modulo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Modulo atualizado com sucesso' : 'Modulo cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar modulo';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Modulo excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir modulo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const openVinculoModal = (moduloId: number) => {
    const current = vinculos[moduloId] || [];
    setVfModuloId(moduloId);
    setVfSelected(current.map((v) => v.formulario_id));
    setVfModalOpen(true);
  };

  const handleVfSubmit = async () => {
    if (!vfModuloId) return;
    try {
      await api.post('/modulo-formularios', { modulo_id: vfModuloId, formularios: vfSelected });
      setVfModalOpen(false);
      setVfModuloId(null);
      fetchVinculos(vfModuloId);
      addToast('success', 'Vinculos salvos com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar vinculos';
      addToast('error', msg);
    }
  };

  const toggleFormulario = (id: number) => {
    setVfSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const renderSubComponent = (modulo: Modulo) => {
    const mid = modulo.id ?? modulo.codigo;
    if (!mid) return <></>;
    const list = vinculos[mid];
    const loading = loadingVinculos.has(mid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Formularios do Modulo</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchVinculos(mid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/modulos" acao={ACAO.INCLUIR}>
              <button onClick={() => openVinculoModal(mid)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
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
          <p className="text-sm text-text-muted text-center py-4">Nenhum formulario vinculado a este modulo</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cod</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Formulario</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">
                      {item.formulario_nome || String(item.formulario_id)}
                      {item.abertura === 1 && (
                        <span className="ml-2 text-[10px] font-medium text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded-full">Abertura</span>
                      )}
                    </td>
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
      <PageHeader title="Modulos" subtitle="Gerencie os modulos do sistema">
        <ShowForPermission rota="/modulos" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Modulo
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={modulos} loading={loading} error={error} emptyMessage="Nenhum modulo cadastrado" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Modulo' : 'Novo Modulo'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ModuloForm
            key={`modulo-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={vfModalOpen} onClose={() => { setVfModalOpen(false); setVfModuloId(null); }} title="Vincular Formularios">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Selecione os formularios que fazem parte deste modulo:</p>
          <div className="max-h-60 overflow-y-auto border border-border-primary rounded-lg p-3 space-y-1">
            {formularios.map((f) => {
              const fid = f.id ?? f.codigo;
              const checked = vfSelected.includes(fid!);
              return (
                <div key={fid} className="flex items-center gap-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => fid && toggleFormulario(fid)}
                      className="rounded border-border-subtle"
                    />
                    <span className="text-sm text-text-primary">{f.nome}</span>
                  </label>
                </div>
              );
            })}
            {formularios.length === 0 && (
              <p className="text-sm text-text-secondary">Nenhum formulario disponivel</p>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setVfModalOpen(false); setVfModuloId(null); }}>Cancelar</Button>
            <Button type="button" onClick={handleVfSubmit}><Plus size={16} /> Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Modulo"
        message="Tem certeza que deseja excluir este modulo? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
