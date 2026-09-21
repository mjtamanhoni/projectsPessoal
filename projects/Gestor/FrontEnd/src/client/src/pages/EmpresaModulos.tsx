import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { EmpresaModuloForm } from '@/components/forms/EmpresaModuloForm';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import type { EmpresaModulo, Empresa, Modulo } from '@/types';
import { Plus, RefreshCw, BookOpen, FileText } from 'lucide-react';
import { PrintButton } from '@/components/ui/PrintButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { gerarGuiaSuperadminPDF } from '@/lib/guia-superadmin';
import { viewPDF } from '@/lib/pdf';
import { useAuth } from '@/context/AuthContext';

const columnHelper = createColumnHelper<EmpresaModulo>();

export function EmpresaModulos() {
  const [data, setData] = useState<EmpresaModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ empresaId: number; modulos: number[] } | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, empRes, modRes] = await Promise.all([
        api.get('/empresa-modulos'),
        api.get('/empresas'),
        api.get('/modulos', { params: { all: 'true' } }),
      ]);
      setData(res.data as EmpresaModulo[]);
      setEmpresas(empRes.data as Empresa[]);
      setModulos(modRes.data as Modulo[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getEmpresaNome = (id: number) => empresas.find((e) => (e.id ?? e.codigo) === id)?.razao_social || '-';
  const getModuloNome = (id: number) => modulos.find((m) => (m.id ?? m.codigo) === id)?.nome || '-';

  const handleEdit = async (item: EmpresaModulo) => {
    const empresaId = item.empresa_id;
    const res = await api.get('/empresa-modulos', { params: { empresa_id: empresaId } });
    const list = res.data as EmpresaModulo[];
    setEditing({
      empresaId,
      modulos: list.map((m) => m.modulo_id),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (data: { empresa_id: number; modulos: number[] }) => {
    try {
      await api.post('/empresa-modulos', data);
      setModalOpen(false);
      setEditing(null);
      fetchData();
      addToast('success', 'Vínculos salvos com sucesso');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Erro ao salvar vínculos';
      const axiosErr = err as { response?: { data?: { error?: string } } };
      if (axiosErr.response?.data?.error) msg = axiosErr.response.data.error;
      addToast('error', msg);
      console.error('[EmpresaModulos] handleSubmit erro:', axiosErr.response?.data || msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await api.delete(`/empresa-modulos?id=${confirmDelete}`);
      setConfirmDelete(null);
      fetchData();
      addToast('success', 'Vínculo excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir vínculo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const printColumns = useMemo(() => [
    { header: 'Código', accessor: (row: Record<string, unknown>) => String(row.id ?? row.codigo ?? '') },
    { header: 'Módulo', accessor: (row: Record<string, unknown>) => String(row.modulo_nome || getModuloNome(row.modulo_id as number)) },
    { header: 'Empresa', accessor: (row: Record<string, unknown>) => String(getEmpresaNome(row.empresa_id as number)) },
  ], []);

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.modulo_nome || getModuloNome(row.modulo_id), {
      id: 'modulo',
      header: 'Módulo',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => getEmpresaNome(row.empresa_id), {
      id: 'empresa',
      header: 'Empresa',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Empresa x Módulo" subtitle="Vincule módulos as empresas">
        <PrintButton title="Empresa x Módulo" data={data} columns={printColumns} />
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
        <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="Nenhum vínculos cadastrado" />
      </Card>

      <Card>
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-800">Precisa de ajuda?</h3>
            <p className="text-xs text-blue-600">
              Consulte o Guia de Configuracao para Superadmin para verificar os passos para configurar uma nova empresa.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const doc = gerarGuiaSuperadminPDF();
              viewPDF(doc);
            }}
          >
            <FileText size={14} className="mr-1" />
            Ver Guia
          </Button>
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="Gerenciar Vínculos">
        <EmpresaModuloForm
          key={`em-form-${editing?.empresaId ?? 'new'}`}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          empresas={empresas}
          modulos={modulos}
          initialEmpresaId={editing?.empresaId}
          initialModulos={editing?.modulos}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Vínculo"
        message="Tem certeza que deseja excluir este vínculos? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
