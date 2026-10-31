import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  extrairErro,
  listarPagamentos,
  listarTitulos,
  salvarPagamento,
  salvarTitulo,
  type PagamentoEfetuado,
  type PagamentoInput,
  type TituloPagar,
  type TituloPagarInput,
} from '../api';
import { useAuth } from '../auth';
import {
  formatCurrency,
  formatDate,
  isOverdue,
  statusDoTitulo,
} from '../format';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { PagamentoForm } from '../components/PagamentoForm';
import { TituloForm } from '../components/TituloForm';
import {
  CalendarIcon,
  HistoryIcon,
  PlusIcon,
  ReceiptIcon,
  RefreshIcon,
  SearchIcon,
  WalletIcon,
} from '../components/Icons';

type Filtro = 'todos' | 'abertos' | 'atrasados' | 'baixados';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'abertos', label: 'Em aberto' },
  { id: 'atrasados', label: 'Atrasados' },
  { id: 'baixados', label: 'Baixados' },
];

function saldoDoTitulo(titulo: TituloPagar): number {
  return Number(titulo.saldo_devedor ?? (titulo.valor_total - Number(titulo.total_pago ?? 0)));
}

function podePagar(titulo: TituloPagar): boolean {
  const status = (titulo.status || '').toUpperCase();
  return status !== 'QUITADO' && status !== 'CANCELADO' && saldoDoTitulo(titulo) > 0.005;
}

export function Titulos() {
  const { usuario, empresa } = useAuth();
  const [titulos, setTitulos] = useState<TituloPagar[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [pagamentoTitulo, setPagamentoTitulo] = useState<TituloPagar | null>(null);
  const [historicoTitulo, setHistoricoTitulo] = useState<TituloPagar | null>(null);
  const [historico, setHistorico] = useState<PagamentoEfetuado[]>([]);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; msg: string } | null>(null);

  const notificar = useCallback((tone: 'ok' | 'error', msg: string) => {
    setFeedback({ tone, msg });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarTitulos();
      setTitulos(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!historicoTitulo?.id) return;
    let cancelado = false;
    setHistoricoCarregando(true);
    setHistorico([]);
    listarPagamentos(historicoTitulo.id)
      .then((lista) => {
        if (!cancelado) setHistorico(Array.isArray(lista) ? lista : []);
      })
      .catch((e) => {
        if (!cancelado) notificar('error', extrairErro(e));
      })
      .finally(() => {
        if (!cancelado) setHistoricoCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [historicoTitulo, notificar]);

  const totais = useMemo(() => {
    const total = titulos.reduce((acc, titulo) => acc + Number(titulo.valor_total ?? 0), 0);
    const pago = titulos.reduce((acc, titulo) => acc + Number(titulo.total_pago ?? 0), 0);
    return { total, pago, saldo: total - pago };
  }, [titulos]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return titulos.filter((titulo) => {
      const status = (titulo.status || '').toUpperCase();
      if (filtro === 'abertos' && (status === 'QUITADO' || status === 'CANCELADO')) return false;
      if (filtro === 'baixados' && status !== 'QUITADO') return false;
      if (filtro === 'atrasados') {
        if (status === 'QUITADO' || status === 'CANCELADO') return false;
        if (!isOverdue(titulo.data_vencimento)) return false;
      }
      if (!termo) return true;
      return [titulo.credor, titulo.descricao, titulo.numero_documento]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [titulos, busca, filtro]);

  const cadastrarTitulo = async (data: TituloPagarInput) => {
    try {
      await salvarTitulo(data);
      setNovoAberto(false);
      notificar('ok', 'Título cadastrado com sucesso.');
      await carregar();
    } catch (e) {
      notificar('error', extrairErro(e));
      throw e;
    }
  };

  const registrarPagamento = async (data: Omit<PagamentoInput, 'titulo_id'>) => {
    if (!pagamentoTitulo?.id) return;
    try {
      const resultado = await salvarPagamento({ titulo_id: pagamentoTitulo.id, ...data });
      setPagamentoTitulo(null);
      notificar(
        'ok',
        resultado?.status === 'QUITADO'
          ? 'Pagamento registrado. Título baixado.'
          : 'Pagamento registrado com sucesso.'
      );
      await carregar();
      if (historicoTitulo?.id === pagamentoTitulo.id) {
        const lista = await listarPagamentos(pagamentoTitulo.id);
        setHistorico(lista);
      }
    } catch (e) {
      notificar('error', extrairErro(e));
      throw e;
    }
  };

  const nomeEmpresa = empresa?.fantasia || empresa?.razao_social || 'Minha empresa';
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'usuário';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">
            <ReceiptIcon size={24} />
          </span>
          <div>
            <h1>Títulos a Pagar</h1>
            <p>{nomeEmpresa}</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void carregar()}
          aria-label="Atualizar"
        >
          <RefreshIcon size={20} className={carregando ? 'spin' : undefined} />
        </button>
      </header>

      <main className="page">
        <div className="greeting">
          <p>Olá, {primeiroNome}</p>
          <span>
            {titulos.length} {titulos.length === 1 ? 'título' : 'títulos'} cadastrados
          </span>
        </div>

        <section className="summary-grid" aria-label="Resumo financeiro">
          <div className="summary-card">
            <span className="summary-icon red">
              <ReceiptIcon size={18} />
            </span>
            <small>Total a pagar</small>
            <strong>{formatCurrency(totais.total)}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-icon green">
              <WalletIcon size={18} />
            </span>
            <small>Pago</small>
            <strong className="green">{formatCurrency(totais.pago)}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-icon gold">
              <WalletIcon size={18} />
            </span>
            <small>Saldo</small>
            <strong className="accent">{formatCurrency(totais.saldo)}</strong>
          </div>
        </section>

        <div className="search-box">
          <SearchIcon size={19} />
          <input
            placeholder="Buscar por credor, descrição ou documento"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        <div className="filter-chips">
          {FILTROS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip${filtro === item.id ? ' active' : ''}`}
              onClick={() => setFiltro(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`feedback ${feedback.tone}`}>{feedback.msg}</div>
        )}

        {erro && (
          <div className="feedback error">
            {erro}
            <button type="button" onClick={() => void carregar()}>
              Tentar novamente
            </button>
          </div>
        )}

        {carregando && titulos.length === 0 ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Carregando títulos...</span>
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ReceiptIcon size={32} />
            </div>
            <h2>Nenhum título encontrado</h2>
            <p>
              {titulos.length === 0
                ? 'Cadastre o primeiro título para começar a acompanhar os pagamentos.'
                : 'Ajuste a busca ou o filtro para ver outros títulos.'}
            </p>
            {titulos.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setNovoAberto(true)}>
                <PlusIcon size={18} /> Novo título
              </button>
            )}
          </div>
        ) : (
          <div className="title-list">
            {listaFiltrada.map((titulo) => {
              const status = statusDoTitulo(titulo);
              const saldo = saldoDoTitulo(titulo);
              return (
                <article className="title-card" key={titulo.id}>
                  <div className="title-card-head">
                    <div className="title-card-name">
                      <h2>{titulo.credor}</h2>
                      {titulo.descricao && <p>{titulo.descricao}</p>}
                    </div>
                    <span className={`status-badge ${status.tone}`}>{status.label}</span>
                  </div>

                  <div className="title-meta">
                    <span>
                      <CalendarIcon size={14} /> Vence {formatDate(titulo.data_vencimento)}
                    </span>
                    {titulo.numero_documento && <span>Doc. {titulo.numero_documento}</span>}
                  </div>

                  <div className="title-values">
                    <div>
                      <small>Total</small>
                      <strong>{formatCurrency(titulo.valor_total)}</strong>
                    </div>
                    <div>
                      <small>Pago</small>
                      <strong className="green">{formatCurrency(titulo.total_pago)}</strong>
                    </div>
                    <div>
                      <small>Saldo</small>
                      <strong className="accent">{formatCurrency(saldo)}</strong>
                    </div>
                  </div>

                  <div className="title-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setHistoricoTitulo(titulo)}
                    >
                      <HistoryIcon size={16} /> Pagamentos
                    </button>
                    {podePagar(titulo) && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setPagamentoTitulo(titulo)}
                      >
                        Informar pagamento
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <button type="button" className="fab" onClick={() => setNovoAberto(true)} aria-label="Novo título">
        <PlusIcon size={26} />
      </button>

      <BottomNav />

      {novoAberto && (
        <Modal
          title="Novo título"
          subtitle="Cadastre uma conta a pagar."
          onClose={() => setNovoAberto(false)}
        >
          <TituloForm onSubmit={cadastrarTitulo} onCancel={() => setNovoAberto(false)} />
        </Modal>
      )}

      {pagamentoTitulo && (
        <Modal
          title="Informar pagamento"
          subtitle={pagamentoTitulo.credor}
          onClose={() => setPagamentoTitulo(null)}
        >
          <PagamentoForm
            titulo={pagamentoTitulo}
            onSubmit={registrarPagamento}
            onCancel={() => setPagamentoTitulo(null)}
          />
        </Modal>
      )}

      {historicoTitulo && (
        <Modal
          title="Pagamentos registrados"
          subtitle={historicoTitulo.credor}
          onClose={() => setHistoricoTitulo(null)}
        >
          {historicoCarregando ? (
            <div className="loading-state compact">
              <div className="spinner" />
              <span>Carregando pagamentos...</span>
            </div>
          ) : historico.length === 0 ? (
            <div className="empty-state compact">
              <p>Nenhum pagamento informado para este título.</p>
            </div>
          ) : (
            <div className="history-list">
              {historico.map((pagamento) => (
                <div className="history-row" key={pagamento.id}>
                  <div>
                    <strong>{formatCurrency(pagamento.valor_pago)}</strong>
                    <span>
                      {formatDate(pagamento.data_pagamento)}
                      {pagamento.forma_pagamento ? ` · ${pagamento.forma_pagamento}` : ''}
                    </span>
                  </div>
                  <div className="history-side">
                    {pagamento.usuario_nome && <span>{pagamento.usuario_nome}</span>}
                    {pagamento.observacao && <small>{pagamento.observacao}</small>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {podePagar(historicoTitulo) && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setPagamentoTitulo(historicoTitulo);
                setHistoricoTitulo(null);
              }}
            >
              Informar pagamento
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
