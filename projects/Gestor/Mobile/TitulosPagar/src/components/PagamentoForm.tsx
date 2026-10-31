import { useState } from 'react';
import type { FormEvent } from 'react';
import { extrairErro, type PagamentoInput, type TituloPagar } from '../api';
import { formatCurrency, hojeISO, moneyInput, parseMoney } from '../format';

interface Props {
  titulo: TituloPagar;
  onSubmit: (data: Omit<PagamentoInput, 'titulo_id'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const FORMAS = ['PIX', 'DINHEIRO', 'TRANSFERÊNCIA', 'CARTÃO', 'BOLETO', 'OUTROS'];

export function PagamentoForm({ titulo, onSubmit, onCancel, loading }: Props) {
  const saldo = Number(titulo.saldo_devedor ?? titulo.valor_total ?? 0);
  const [valor, setValor] = useState(() => moneyInput(saldo));
  const [dataPagamento, setDataPagamento] = useState(hojeISO());
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErro('');
    const valorPago = parseMoney(valor);
    if (!Number.isFinite(valorPago) || valorPago <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    if (valorPago > saldo + 0.005) {
      setErro(`O valor não pode ser maior que o saldo de ${formatCurrency(saldo)}.`);
      return;
    }
    if (!dataPagamento) {
      setErro('Informe a data do pagamento.');
      return;
    }

    setSalvando(true);
    try {
      await onSubmit({
        valor_pago: valorPago,
        data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento,
        observacao: observacao.trim() || undefined,
      });
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const ocupado = loading || salvando;

  return (
    <form className="form" onSubmit={submit}>
      <div className="pay-summary">
        <div>
          <span>Credor</span>
          <strong>{titulo.credor}</strong>
        </div>
        <div>
          <span>Saldo devedor</span>
          <strong className="accent">{formatCurrency(saldo)}</strong>
        </div>
      </div>

      <label className="field">
        <span>Valor do pagamento *</span>
        <input
          className="input input-money"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          autoFocus
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>Data *</span>
          <input
            className="input"
            type="date"
            value={dataPagamento}
            onChange={(event) => setDataPagamento(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Forma</span>
          <select
            className="input"
            value={formaPagamento}
            onChange={(event) => setFormaPagamento(event.target.value)}
          >
            {FORMAS.map((forma) => (
              <option key={forma} value={forma}>
                {forma}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Observação</span>
        <textarea
          className="input textarea"
          rows={3}
          placeholder="Opcional"
          value={observacao}
          onChange={(event) => setObservacao(event.target.value)}
        />
      </label>

      {erro && <p className="form-error">{erro}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={ocupado}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={ocupado}>
          {ocupado ? 'Registrando...' : 'Registrar pagamento'}
        </button>
      </div>
    </form>
  );
}
