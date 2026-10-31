import { useState } from 'react';
import type { FormEvent } from 'react';
import { extrairErro, type TituloPagarInput } from '../api';
import { daquiA30DiasISO, hojeISO, parseMoney } from '../format';

interface Props {
  onSubmit: (data: TituloPagarInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TituloForm({ onSubmit, onCancel, loading }: Props) {
  const [credor, setCredor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState(hojeISO());
  const [dataVencimento, setDataVencimento] = useState(daquiA30DiasISO());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErro('');
    const valorTotal = parseMoney(valor);
    if (!credor.trim()) {
      setErro('Informe o credor.');
      return;
    }
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    if (!dataVencimento) {
      setErro('Informe a data de vencimento.');
      return;
    }
    if (dataEmissao && dataVencimento < dataEmissao) {
      setErro('O vencimento deve ser igual ou posterior à emissão.');
      return;
    }

    setSalvando(true);
    try {
      await onSubmit({
        credor: credor.trim(),
        descricao: descricao.trim() || undefined,
        numero_documento: numeroDocumento.trim() || undefined,
        valor_total: valorTotal,
        data_emissao: dataEmissao || undefined,
        data_vencimento: dataVencimento,
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
      <label className="field">
        <span>Credor *</span>
        <input
          className="input"
          placeholder="Nome do credor"
          value={credor}
          onChange={(event) => setCredor(event.target.value)}
          autoFocus
        />
      </label>

      <label className="field">
        <span>Descrição</span>
        <input
          className="input"
          placeholder="Ex: parcela do fornecedor"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>Documento</span>
          <input
            className="input"
            placeholder="Nº do documento"
            value={numeroDocumento}
            onChange={(event) => setNumeroDocumento(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Valor total *</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Emissão</span>
          <input
            className="input"
            type="date"
            value={dataEmissao}
            onChange={(event) => setDataEmissao(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Vencimento *</span>
          <input
            className="input"
            type="date"
            value={dataVencimento}
            onChange={(event) => setDataVencimento(event.target.value)}
          />
        </label>
      </div>

      {erro && <p className="form-error">{erro}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={ocupado}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={ocupado}>
          {ocupado ? 'Salvando...' : 'Cadastrar título'}
        </button>
      </div>
    </form>
  );
}
