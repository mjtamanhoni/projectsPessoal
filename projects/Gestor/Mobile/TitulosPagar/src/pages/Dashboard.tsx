import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, listarTitulos, type TituloPagar } from '../api';
import { useAuth } from '../auth';
import { formatCurrency, MESES } from '../format';
import { BottomNav } from '../components/BottomNav';
import {
  CalendarIcon,
  ChevronRightIcon,
  DashboardIcon,
  FilterIcon,
  ReceiptIcon,
  RefreshIcon,
  WalletIcon,
  XIcon,
} from '../components/Icons';

function anoDoTitulo(titulo: TituloPagar): string {
  return (titulo.data_vencimento || '').slice(0, 4);
}

function mesDoTitulo(titulo: TituloPagar): string {
  return (titulo.data_vencimento || '').slice(5, 7);
}

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, empresa } = useAuth();
  const [titulos, setTitulos] = useState<TituloPagar[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');

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

  const anos = useMemo(() => {
    const conjunto = new Set<string>();
    conjunto.add(String(new Date().getFullYear()));
    for (const titulo of titulos) {
      const anoAtual = anoDoTitulo(titulo);
      if (anoAtual) conjunto.add(anoAtual);
    }
    return Array.from(conjunto).sort((a, b) => b.localeCompare(a));
  }, [titulos]);

  const filtrados = useMemo(
    () =>
      titulos.filter((titulo) => {
        if (mes && mesDoTitulo(titulo) !== mes) return false;
        if (ano && anoDoTitulo(titulo) !== ano) return false;
        return true;
      }),
    [titulos, mes, ano]
  );

  const totais = useMemo(() => {
    let total = 0;
    let pago = 0;
    for (const titulo of filtrados) {
      if ((titulo.status || '').toUpperCase() === 'CANCELADO') continue;
      total += Number(titulo.valor_total ?? 0);
      pago += Number(titulo.total_pago ?? 0);
    }
    return { total, pago, saldo: total - pago };
  }, [filtrados]);

  const emAberto = useMemo(
    () =>
      filtrados.filter((titulo) => {
        const status = (titulo.status || '').toUpperCase();
        const saldo = Number(titulo.saldo_devedor ?? titulo.valor_total - Number(titulo.total_pago ?? 0));
        return status !== 'QUITADO' && status !== 'CANCELADO' && saldo > 0.005;
      }).length,
    [filtrados]
  );

  const filtroAtivo = Boolean(mes || ano);
  const periodoLabel = filtroAtivo
    ? `${mes ? MESES[Number(mes) - 1] : 'Todos os meses'}${ano ? ` de ${ano}` : ''}`
    : 'Visão geral de todos os períodos';

  const limparFiltro = () => {
    setMes('');
    setAno('');
  };

  const nomeEmpresa = empresa?.fantasia || empresa?.razao_social || 'Minha empresa';
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'usuário';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">
            <DashboardIcon size={24} />
          </span>
          <div>
            <h1>Painel</h1>
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
          <span>{periodoLabel}</span>
        </div>

        {erro && (
          <div className="feedback error">
            {erro}
            <button type="button" onClick={() => void carregar()}>
              Tentar novamente
            </button>
          </div>
        )}

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

        <section className="dashboard-filter">
          <div className="section-heading">
            <span className="section-icon">
              <FilterIcon size={20} />
            </span>
            <div>
              <h3>Filtrar por mês/ano</h3>
              <p>Escolha o período para ver os totais. Sem filtro, mostra tudo.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Mês</span>
              <select className="input" value={mes} onChange={(event) => setMes(event.target.value)}>
                <option value="">Todos os meses</option>
                {MESES.map((nome, indice) => (
                  <option key={nome} value={String(indice + 1).padStart(2, '0')}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ano</span>
              <select className="input" value={ano} onChange={(event) => setAno(event.target.value)}>
                <option value="">Todos os anos</option>
                {anos.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filtroAtivo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limparFiltro}>
              <XIcon size={15} /> Limpar filtro
            </button>
          )}
        </section>

        <section className="dashboard-note">
          <CalendarIcon size={16} />
          <span>
            {filtrados.length} {filtrados.length === 1 ? 'título' : 'títulos'} no período ·{' '}
            {emAberto} em aberto
          </span>
        </section>

        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={() => navigate('/titulos')}
        >
          <ReceiptIcon size={18} />
          Ver lista de títulos
          <ChevronRightIcon size={18} />
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
