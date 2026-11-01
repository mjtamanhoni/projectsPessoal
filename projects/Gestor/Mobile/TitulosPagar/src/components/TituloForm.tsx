import { useState } from 'react';
import type { FormEvent } from 'react';
import { extrairErro, type TituloPagar, type TituloPagarInput } from '../api';
import { daquiA30DiasISO, hojeISO, moneyInput, parseMoney } from '../format';

interface Props {
  titulo?: TituloPagar;
  onSubmit: (data: TituloPagarInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TituloForm({ titulo, onSubmit, onCancel, loading }: Props) {
  const editando = Boolean(titulo?.id);
  const [credor, setCredor] = useState(titulo?.credor ?? '');
  const [descricao, setDescricao] = useState(titulo?.descricao ?? '');
  const [numeroDocumento, setNumeroDocumento] = useState(titulo?.numero_documento ?? '');
  const [chavePix, setChavePix] = useState(titulo?.chave_pix ?? '');
  const [valor, setValor] = useState(() =>
    titulo ? moneyInput(Number(titulo.valor_total ?? 0)) : ''
  );
  const [dataEmissao, setDataEmissao] = useState(
    () => (titulo?.data_emissao ? titulo.data_emissao.slice(0, 10) : hojeISO())
  );
  const [dataVencimento, setDataVencimento] = useState(
    () => (titulo?.data_vencimento ? titulo.data_vencimento.slice(0, 10) : daquiA30DiasISO())
  );
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
        id: titulo?.id,
        credor: credor.trim(),
        descricao: descricao.trim() || undefined,
        numero_documento: numeroDocumento.trim() || undefined,
        chave_pix: chavePix.trim(),
        valor_total: valorTotal,
        data_emissao: dataEmissao || undefined,
        data_vencimento: dataVencimento,
        status: titulo?.status,
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

      <label className="field">
        <span>Chave PIX</span>
        <input
          className="input"
          placeholder="Chave PIX do credor (opcional)"
          value={chavePix}
          onChange={(event) => setChavePix(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>

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
          {ocupado ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar título'}
        </button>
      </div>
    </form>
  );
}
