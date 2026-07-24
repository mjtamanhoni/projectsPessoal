import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ModuloFormularioForm } from '@/components/forms/ModuloFormularioForm';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import type { ModuloFormulario, Modulo, Formulario } from '@/types';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<ModuloFormulario>();

export function ModuloFormularios() {
  const [data, setData] = useState<ModuloFormulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ moduloId: number; formularios: number[] } | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, modRes, formRes] = await Promise.all([
        api.get('/modulo-formularios'),
        api.get('/modulos'),
        api.get('/formularios'),
      ]);
      setData(res.data as ModuloFormulario[]);
      setModulos(modRes.data as Modulo[]);
      setFormularios(formRes.data as Formulario[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getModuloNome = (id: number) => modulos.find((m) => (m.id ?? m.codigo) === id)?.nome || '-';

  const [abertura, setAbertura] = useState<number>(0);

  const handleEdit = async (item: ModuloFormulario) => {
    const moduloId = item.modulo_id;
    const res = await api.get('/modulo-formularios', { params: { modulo_id: moduloId } });
    const list = res.data as ModuloFormulario[];
    setEditing({
      moduloId,
      formularios: list.map((f) => f.formulario_id),
    });
    setAbertura(list.find((f) => f.abertura === 1)?.formulario_id || 0);
    setModalOpen(true);
  };

  const handleSubmit = async (data: { modulo_id: number; formularios: number[]; abertura?: number }) => {
    try {
      await api.post('/modulo-formularios', data);
      setModalOpen(false);
      setEditing(null);
      setAbertura(0);
      fetchData();
      addToast('success', 'Vinculos salvos com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar vinculos';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await api.delete(`/modulo-formularios?id=${confirmDelete}`);
      setConfirmDelete(null);
      fetchData();
      addToast('success', 'Vinculo excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir vinculo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const groupedColumns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => getModuloNome(row.modulo_id), {
      id: 'modulo',
      header: 'Modulo',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.formulario_nome || String(row.formulario_id), {
      id: 'formulario',
      header: 'Formulario',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Acoes',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            title="Editar"
          >
            <Plus size={16} className="text-text-secondary" />
          </button>
          <button
            onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors ml-1"
            title="Excluir"
          >
            <Trash2 size={16} className="text-accent-red" />
          </button>
        </div>
      ),
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Modulo x Formulario" subtitle="Vincule formularios aos modulos">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={18} /> Novo Vinculo
        </Button>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => fetchData()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={groupedColumns} data={data} loading={loading} error={error} emptyMessage="Nenhum vinculo cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); setAbertura(0); }} title="Gerenciar Vinculos">
        <ModuloFormularioForm
          key={`mf-form-${editing?.moduloId ?? 'new'}`}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); setAbertura(0); }}
          modulos={modulos}
          formularios={formularios}
          initialModuloId={editing?.moduloId}
          initialFormularios={editing?.formularios}
          initialAbertura={abertura || undefined}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Vinculo"
        message="Tem certeza que deseja excluir este vinculo? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
