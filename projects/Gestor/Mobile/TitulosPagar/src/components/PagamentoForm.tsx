import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { extrairErro, type PagamentoInput, type TituloPagar } from '../api';
import { formatCurrency, hojeISO, moneyInput, parseMoney } from '../format';
import { gerarPayloadPix } from '../pix';
import { CheckIcon, CopyIcon } from './Icons';

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
  const [copiadoChave, setCopiadoChave] = useState(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);

  const chavePix = (titulo.chave_pix ?? '').trim();
  const valorInformado = parseMoney(valor);
  const pixPayload = useMemo(() => {
    if (!chavePix || !Number.isFinite(valorInformado) || valorInformado <= 0) return '';
    return gerarPayloadPix({
      chave: chavePix,
      nome: titulo.credor || 'RECEBEDOR',
      valor: valorInformado,
    });
  }, [chavePix, titulo.credor, valorInformado]);

  const copiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const copiarChave = async () => {
    if (!chavePix) return;
    await copiarTexto(chavePix);
    setCopiadoChave(true);
    setTimeout(() => setCopiadoChave(false), 2000);
  };

  const copiarCodigo = async () => {
    if (!pixPayload) return;
    await copiarTexto(pixPayload);
    setCopiadoCodigo(true);
    setTimeout(() => setCopiadoCodigo(false), 2000);
  };

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

      {chavePix && (
        <div className="pix-box">
          <div className="pix-box-head">
            <div className="pix-box-info">
              <span className="pix-label">Chave PIX do credor</span>
              <strong className="pix-key">{chavePix}</strong>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copiarChave}>
              {copiadoChave ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
              {copiadoChave ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {pixPayload ? (
            <div className="pix-code-box">
              <span className="pix-label">Código PIX (copia e cola)</span>
              <textarea
                className="input textarea pix-code"
                readOnly
                rows={3}
                value={pixPayload}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button type="button" className="btn btn-primary btn-block" onClick={copiarCodigo}>
                {copiadoCodigo ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                {copiadoCodigo ? 'Código copiado!' : 'Copiar código PIX'}
              </button>
            </div>
          ) : (
            <p className="pix-hint">Informe o valor do pagamento para gerar o código PIX.</p>
          )}
        </div>
      )}

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
