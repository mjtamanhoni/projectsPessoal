import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import { excluirCliente, extrairErro, listarClientes, salvarCliente, type Cliente } from '../api';
import PessoaModal from '../components/PessoaModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null);
  const [duplicado, setDuplicado] = useState<{ data: Cliente; existente: Cliente } | null>(null);

  const [busca, setBusca] = useState('');
const [filtroAtivo, setFiltroAtivo] = useState(true);
const [filtroInativo, setFiltroInativo] = useState(false);

const clientesFiltrados = useMemo(() => {
  let lista = clientes;
  if (filtroAtivo !== filtroInativo) {
    lista = lista.filter((c) => {
      const st = Number(c.status);
      return (filtroAtivo && (st === 1 || c.status == null)) || (filtroInativo && st === 0);
    });
  }
  return lista.filter((c) => passaBusca([c.nome, c.telefone, c.celular, c.email], busca));
}, [clientes, busca, filtroAtivo, filtroInativo]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setClientes(await listarClientes());
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditing(c);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const salvarDeFato = async (data: Cliente, idOverride?: number) => {
    await salvarCliente({ ...data, id: idOverride ?? editing?.id });
    setDuplicado(null);
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoSalvar = async (data: Cliente) => {
    const doc = (data.cnpj_cpf || '').replace(/\D/g, '');
    if (doc) {
      const existente = clientes.find(
        (c) => c.id !== editing?.id && (c.cnpj_cpf || '').replace(/\D/g, '') === doc,
      );
      if (existente) {
        setDuplicado({ data, existente });
        return;
      }
    }
    await salvarDeFato(data);
  };

  const usarExistente = () => {
    const ex = duplicado?.existente;
    setDuplicado(null);
    setModalOpen(false);
    setEditing(null);
    if (ex) abrirEditar(ex);
  };

  const substituirExistente = () => {
    if (!duplicado) return;
    salvarDeFato(duplicado.data, duplicado.existente.id);
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirCliente(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Clientes
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie seus clientes
      </div>
      <PlusButton onClick={abrirNovo} />

            <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar...' }}
            checks={{
              opcao1: filtroAtivo,
              onOpcao1: setFiltroAtivo,
              opcao2: filtroInativo,
              onOpcao2: setFiltroInativo,
              label1: 'Ativos',
              label2: 'Inativos',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && clientesFiltrados.length === 0 && (
          <div className="list-empty">Nenhum cliente cadastrado</div>
        )}
        {!loading && !erro && clientes.length > 0 && (
          <div className="list-scroll">
            {clientesFiltrados.map((c) => (
              <div key={c.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{c.id}</div>
                  <div className="insumo-nome">{c.nome}</div>
                  <div className="insumo-det">
                    {c.celular || c.telefone || '—'} &nbsp;•&nbsp; {c.email || '—'}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(c) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(c) },
                    ]}
                  />
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <PessoaModal
          key={`cliente-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Cliente' : 'Novo Cliente'}
          rotulo="cliente"
          inicial={editing}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Cliente"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {duplicado && (
        <div className="modal-overlay" style={{ zIndex: 55 }}>
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Documento Já Cadastrado</div>
              <button className="modal-close" onClick={() => setDuplicado(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 16px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                Já existe o cliente <b>{duplicado.existente.nome}</b> cadastrado com o documento{' '}
                <b>{duplicado.existente.cnpj_cpf || duplicado.data.cnpj_cpf}</b> (encomendas, vendas e
                lançamentos deste cliente serão mantidos). Deseja cancelar o cadastro atual e retornar os
                dados do cadastro existente, ou substituir o cadastro existente pelos dados atuais?
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="modal-btn cancel"
                  style={{ position: 'static', top: 0 }}
                  onClick={() => setDuplicado(null)}
                >
                  Voltar
                </button>
                <button
                  className="modal-btn cancel"
                  style={{ position: 'static', top: 0 }}
                  onClick={usarExistente}
                >
                  Usar existente
                </button>
                <button
                  className="modal-btn save"
                  style={{ position: 'static', top: 0 }}
                  onClick={substituirExistente}
                >
                  Substituir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
