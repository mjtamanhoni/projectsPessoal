import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { ACAO } from '@/lib/permissions';
import type { Usuario, Formulario, UsuarioFormulario } from '@/types';
import { Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<UsuarioFormulario>();

const ALL_ACOES = [ACAO.VISUALIZAR, ACAO.INCLUIR, ACAO.EDITAR, ACAO.EXCLUIR, ACAO.BAIXAR, ACAO.ESTORNAR, ACAO.EXPORTAR];

export function PermissoesFormulario() {
  const { addToast } = useToast();
  const [vinculos, setVinculos] = useState<UsuarioFormulario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [permissoesMap, setPermissoesMap] = useState<Record<number, string[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVinculo, setEditingVinculo] = useState<UsuarioFormulario | null>(null);
  const [editingPermissoes, setEditingPermissoes] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, uRes, fRes] = await Promise.all([
        api.get('/usuario-formularios'),
        api.get('/usuarios'),
        api.get('/formularios'),
      ]);
      const vData = vRes.data as UsuarioFormulario[];
      setVinculos(vData);
      setUsuarios(uRes.data as Usuario[]);
      setFormularios(fRes.data as Formulario[]);

      const permMap: Record<number, string[]> = {};
      await Promise.all(
        vData.map(async (v) => {
          const id = v.id ?? v.codigo;
          if (id) {
            try {
              const pRes = await api.get(`/permissoes/formulario/${id}`);
              permMap[id] = pRes.data as string[];
            } catch {
              permMap[id] = [];
            }
          }
        })
      );
      setPermissoesMap(permMap);
    } catch {
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUsuarioNome = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? '-';
  const getFormularioNome = (id: number) => formularios.find((f) => f.id === id)?.nome ?? '-';

  const togglePermissao = (acao: string) => {
    setEditingPermissoes((prev) =>
      prev.includes(acao) ? prev.filter((a) => a !== acao) : [...prev, acao]
    );
  };

  const handleSave = async () => {
    if (!editingVinculo) return;
    const id = editingVinculo.id ?? editingVinculo.codigo;
    if (!id) return;
    setSavingId(id);
    try {
      await api.post(`/permissoes/formulario/${id}`, { permissoes: editingPermissoes });
      setPermissoesMap((prev) => ({ ...prev, [id]: editingPermissoes }));
      setModalOpen(false);
      setEditingVinculo(null);
      addToast('success', 'Permissões salvas com sucesso');
    } catch {
      addToast('error', 'Erro ao salvar permissões');
    } finally {
      setSavingId(null);
    }
  };

  const openEdit = (vinculo: UsuarioFormulario) => {
    const id = vinculo.id ?? vinculo.codigo;
    setEditingVinculo(vinculo);
    setEditingPermissoes(id ? (permissoesMap[id] ?? []) : []);
    setModalOpen(true);
  };

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo!, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.usuarioNome || getUsuarioNome(row.usuarioId), {
      id: 'usuario',
      header: 'Usuário',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.formularioNome || getFormularioNome(row.formularioId), {
      id: 'formulario',
      header: 'Formulário',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => {
      const id = row.id ?? row.codigo;
      return id ? (permissoesMap[id] ?? []).join(', ') : '';
    }, {
      id: 'permissoes',
      header: 'Permissões',
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const id = row.original.id ?? row.original.codigo;
        return (
          <div className="text-right">
            <button
              onClick={() => openEdit(row.original)}
              disabled={savingId === id}
              className="btn-primary text-sm py-1.5 px-3"
            >
              <ShieldCheck size={16} /> Gerenciar
            </button>
          </div>
        );
      },
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Permissoes por Formulario" subtitle="Gerencie permissoes por formulario" />

      <Card>
        <DataTable
          columns={columns}
          data={vinculos}
          loading={loading}
          emptyMessage="Nenhum vínculo encontrado. Crie vínculos em Usuário x Formulário primeiro."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingVinculo(null); }}
        title={`Permissões: ${editingVinculo?.usuarioNome || (editingVinculo ? getUsuarioNome(editingVinculo.usuarioId) : '')} → ${editingVinculo?.formularioNome || (editingVinculo ? getFormularioNome(editingVinculo.formularioId) : '')}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Selecione as ações que o usuário pode executar neste formulário:
          </p>
          <div className="space-y-2">
            {ALL_ACOES.map((acao) => (
              <label
                key={acao}
                className="flex items-center gap-3 p-3 rounded-lg border border-border-primary hover:bg-background-hover cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={editingPermissoes.includes(acao)}
                  onChange={() => togglePermissao(acao)}
                  className="w-4 h-4 rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                />
                <div>
                  <div className="text-sm font-medium text-text-primary">{acao}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-center gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => { setModalOpen(false); setEditingVinculo(null); }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savingId !== null}>
              <Save size={16} /> {savingId !== null ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
