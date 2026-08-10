import { useMemo, useState, useCallback, useEffect } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca, passaStatusNumero } from '@/lib/filtros';
import type { FiltroStatus } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { UsuarioForm } from '@/components/forms/UsuarioForm';
import { UsuarioSenhaForm } from '@/components/forms/UsuarioSenhaForm';
import { UsuarioPinForm } from '@/components/forms/UsuarioPinForm';
import { UsuarioFormularioForm } from '@/components/forms/UsuarioFormularioForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Usuario } from '@/types';
import type { UsuarioFormulario, Formulario } from '@/types';
import type { UsuarioSenhaInput } from '@/schemas';
import type { UsuarioPinInput } from '@/schemas';
import type { UsuarioInput } from '@/schemas';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';
import api from '@/lib/api';

const columnHelper = createColumnHelper<Usuario>();

export function Usuarios() {
  const { data: usuarios, loading, error, create, update, remove, fetchOne, refetch } = useApi<Usuario>('/usuarios');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('1');

  const usuariosFiltrados = useMemo(
    () =>
      (usuarios ?? []).filter(
        (u) =>
          passaStatusNumero(u.status, filtroStatus) &&
          passaBusca([u.nome, u.email], busca),
      ),
    [usuarios, filtroStatus, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const { addToast } = useToast();

  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [ufMap, setUfMap] = useState<Record<number, UsuarioFormulario[]>>({});
  const [loadingUf, setLoadingUf] = useState<Set<number>>(new Set());
  const [ufModalOpen, setUfModalOpen] = useState(false);
  const [ufEditing, setUfEditing] = useState<UsuarioFormulario | null>(null);
  const [ufUsuarioId, setUfUsuarioId] = useState<number | null>(null);
  const [confirmDeleteUf, setConfirmDeleteUf] = useState<number | null>(null);
  const [deletingUf, setDeletingUf] = useState(false);

  const fetchUf = useCallback(async (usuarioId: number) => {
    if (loadingUf.has(usuarioId)) return;
    setLoadingUf((prev) => new Set(prev).add(usuarioId));
    try {
      const res = await api.get('/usuario-formularios', { params: { usuario_id: usuarioId } });
      const list = res.data as UsuarioFormulario[];
      setUfMap((prev) => ({ ...prev, [usuarioId]: list }));
    } catch {
      setUfMap((prev) => ({ ...prev, [usuarioId]: [] }));
    } finally {
      setLoadingUf((prev) => { const next = new Set(prev); next.delete(usuarioId); return next; });
    }
  }, [loadingUf]);

  const refreshFormularios = useCallback(() => {
    api.get<Formulario[]>('/formularios').then((r) => setFormularios(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refreshFormularios(); }, [refreshFormularios]);

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
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Acoes',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/usuarios"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
            extras={[
              {
                rotulo: 'Alterar Senha',
                icone: KeyRound,
                onClick: () => handleOpenSenha(row.original),
                permissaoRota: '/usuarios',
                permissaoAcao: ACAO.EDITAR,
              },
              {
                rotulo: 'Alterar PIN',
                icone: KeyRound,
                cor: '#2563eb',
                onClick: () => handleOpenPin(row.original),
                permissaoRota: '/usuarios',
                permissaoAcao: ACAO.EDITAR,
              },
            ]}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (usuario: Usuario) => {
    const idToFetch = usuario.id || usuario.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? usuario);
    } catch {
      setEditing(usuario);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: UsuarioInput) => {
    try {
      const { confirmarSenha, confirmarPin, senha, pin, ...rest } = data;
      if (editing) {
        await update({ ...rest, id: editing.id ?? editing.codigo });
      } else {
        await create({ ...rest, senha, pin } as Partial<Usuario>);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Usuario atualizado com sucesso' : 'Usuario cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar usuario';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Usuario excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir usuario';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenSenha = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setSenhaModalOpen(true);
  };

  const handleOpenPin = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setPinModalOpen(true);
  };

  const handleSenhaSubmit = async (data: UsuarioSenhaInput) => {
    try {
      await api.put('/usuarios/senha', data);
      setSenhaModalOpen(false);
      setSelectedUsuario(null);
      addToast('success', 'Senha alterada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar senha';
      addToast('error', msg);
    }
  };

  const handlePinSubmit = async (data: UsuarioPinInput) => {
    try {
      await api.put('/usuarios/pin', data);
      setPinModalOpen(false);
      setSelectedUsuario(null);
      addToast('success', 'PIN alterado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar PIN';
      addToast('error', msg);
    }
  };

  const handleUfSubmit = async (data: UsuarioFormulario) => {
    try {
      if (ufEditing) {
        await api.post('/usuario-formularios', { ...data, id: ufEditing.id ?? ufEditing.codigo });
      } else {
        await api.post('/usuario-formularios', data);
      }
      const uid = ufUsuarioId ?? data.usuarioId;
      setUfModalOpen(false);
      setUfEditing(null);
      setUfUsuarioId(null);
      if (uid) fetchUf(uid);
      addToast('success', ufEditing ? 'Vinculo atualizado com sucesso' : 'Vinculo cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar vinculo';
      addToast('error', msg);
    }
  };

  const handleDeleteUf = async () => {
    if (confirmDeleteUf === null) return;
    setDeletingUf(true);
    try {
      await api.delete('/usuario-formularios', { params: { id: confirmDeleteUf } });
      const uid = ufUsuarioId;
      setConfirmDeleteUf(null);
      if (uid) fetchUf(uid);
      addToast('success', 'Vinculo excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir vinculo';
      addToast('error', msg);
    } finally {
      setDeletingUf(false);
    }
  };

  const renderSubComponent = (usuario: Usuario) => {
    const uid = usuario.id ?? usuario.codigo;
    if (!uid) return <></>;
    const list = ufMap[uid];
    const loading = loadingUf.has(uid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Formularios Vinculados</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchUf(uid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/usuario-formularios" acao={ACAO.INCLUIR}>
              <button onClick={() => { setUfEditing(null); setUfUsuarioId(uid); setUfModalOpen(true); }} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <Plus size={14} /> Vincular
              </button>
            </ShowForPermission>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-primary" />
          </div>
        ) : !list || list.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">Nenhum formulario vinculado a este usuario</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cod</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Formulario</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-14">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                const formNome = item.formularioNome || formularios.find((f) => (f.id ?? f.codigo) === item.formularioId)?.nome || '-';
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">{formNome}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <ShowForPermission rota="/usuario-formularios" acao={ACAO.EXCLUIR}>
                          <button onClick={() => { setConfirmDeleteUf(itemId!); setUfUsuarioId(uid); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Trash2 size={12} className="text-accent-red" />
                          </button>
                        </ShowForPermission>
                      </div>
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
      <PageHeader title="Usuarios" subtitle="Gerencie os usuarios do sistema">
        <ShowForPermission rota="/usuarios" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Usuario
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
          busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar por nome ou email...' }}
          status={{
            rotulo: 'Status',
            valor: filtroStatus,
            opcoes: [
              { valor: '1', label: 'Ativos' },
              { valor: '2', label: 'Inativos' },
              { valor: 'todos', label: 'Todos' },
            ],
            onChange: (v) => setFiltroStatus(v as FiltroStatus),
          }}
          onLimpar={() => {
            setBusca('');
            setFiltroStatus('1');
          }}
        />
        <DataTable columns={columns} data={usuariosFiltrados} loading={loading} error={error} emptyMessage="Nenhum usuario cadastrado" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Usuario' : 'Novo Usuario'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <UsuarioForm
            key={`usuario-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={senhaModalOpen} onClose={() => { setSenhaModalOpen(false); setSelectedUsuario(null); }} title="Alterar Senha">
        {selectedUsuario && (
          <UsuarioSenhaForm
            onSubmit={handleSenhaSubmit}
            onCancel={() => { setSenhaModalOpen(false); setSelectedUsuario(null); }}
            usuarioId={selectedUsuario.id ?? selectedUsuario.codigo!}
            usuarioNome={selectedUsuario.nome}
          />
        )}
      </Modal>

      <Modal isOpen={pinModalOpen} onClose={() => { setPinModalOpen(false); setSelectedUsuario(null); }} title="Alterar PIN">
        {selectedUsuario && (
          <UsuarioPinForm
            onSubmit={handlePinSubmit}
            onCancel={() => { setPinModalOpen(false); setSelectedUsuario(null); }}
            usuarioId={selectedUsuario.id ?? selectedUsuario.codigo!}
            usuarioNome={selectedUsuario.nome}
          />
        )}
      </Modal>

      <Modal isOpen={ufModalOpen} onClose={() => { setUfModalOpen(false); setUfEditing(null); setUfUsuarioId(null); }} title={ufEditing ? 'Editar Vinculo' : 'Novo Vinculo'}>
        <UsuarioFormularioForm
          key={`uf-form-${ufEditing?.id ?? ufEditing?.codigo ?? 'new'}`}
          onSubmit={handleUfSubmit}
          onCancel={() => { setUfModalOpen(false); setUfEditing(null); setUfUsuarioId(null); }}
          initial={ufEditing ? { ...ufEditing, usuarioId: ufEditing.usuarioId } : null}
          usuarios={ufUsuarioId ? [{ id: ufUsuarioId, nome: usuarios.find((u) => (u.id ?? u.codigo) === ufUsuarioId)?.nome || '' }] : []}
          formularios={formularios}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Usuario"
        message="Tem certeza que deseja excluir este usuario? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteUf !== null}
        onClose={() => setConfirmDeleteUf(null)}
        onConfirm={handleDeleteUf}
        title="Excluir Vinculo"
        message="Tem certeza que deseja excluir este vinculo? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deletingUf}
      />
    </Layout>
  );
}