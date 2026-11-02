import { useState } from 'react';
import type { FormEvent } from 'react';
import { extrairErro, type TituloPagar, type TituloPagarInput } from '../api';
import {
  adicionarMeses,
  daquiA30DiasISO,
  dividirValor,
  formatCurrency,
  formatDate,
  hojeISO,
  mascaraMoeda,
  parseMoney,
} from '../format';

type ModoParcelamento = 'dividir' | 'repetir';

interface Props {
  titulo?: TituloPagar;
  onSubmit: (data: TituloPagarInput[]) => Promise<void>;
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
    titulo ? mascaraMoeda(Number(titulo.valor_total ?? 0).toFixed(2)) : ''
  );
  const [dataEmissao, setDataEmissao] = useState(
    () => (titulo?.data_emissao ? titulo.data_emissao.slice(0, 10) : hojeISO())
  );
  const [dataVencimento, setDataVencimento] = useState(
    () => (titulo?.data_vencimento ? titulo.data_vencimento.slice(0, 10) : daquiA30DiasISO())
  );
  const [quantidadeParcelas, setQuantidadeParcelas] = useState(1);
  const [modoParcelamento, setModoParcelamento] = useState<ModoParcelamento>('dividir');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const valorInformado = parseMoney(valor);
  const quantidade = Math.max(1, Math.floor(quantidadeParcelas || 1));
  const valoresDivididos = dividirValor(valorInformado, quantidade);
  const valorParcela = valoresDivididos[0] ?? 0;
  const valorUltima = valoresDivididos[valoresDivididos.length - 1] ?? 0;

  const montarParcelas = () => {
    const valores =
      quantidade <= 1
        ? [valorInformado]
        : modoParcelamento === 'repetir'
          ? Array.from({ length: quantidade }, () => valorInformado)
          : dividirValor(valorInformado, quantidade);

    let data = dataVencimento;
    return valores.map((valorAtual, indice) => {
      if (indice > 0) data = adicionarMeses(data, 1);
      return {
        valor_total: valorAtual,
        data_vencimento: data,
      };
    });
  };

  const parcelasPreview = montarParcelas();

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
      const base = {
        credor: credor.trim(),
        descricao: descricao.trim() || undefined,
        numero_documento: numeroDocumento.trim() || undefined,
        chave_pix: chavePix.trim(),
        data_emissao: dataEmissao || undefined,
        data_vencimento: dataVencimento,
        status: titulo?.status,
      };

      if (editando) {
        await onSubmit([
          { ...base, id: titulo?.id, valor_total: valorTotal, parcela: titulo?.parcela ?? 1 },
        ]);
      } else {
        await onSubmit(
          parcelasPreview.map((parcela, indice) => ({
            ...base,
            valor_total: parcela.valor_total,
            data_vencimento: parcela.data_vencimento,
            parcela: indice + 1,
          }))
        );
      }
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
            onChange={(event) => setValor(mascaraMoeda(event.target.value))}
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

      {!editando && (
        <div className="parcelamento-box">
          <label className="field">
            <span>Quantidade de parcelas</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              value={quantidadeParcelas}
              onChange={(event) =>
                setQuantidadeParcelas(Math.max(1, Math.floor(Number(event.target.value) || 1)))
              }
            />
          </label>

          {quantidade > 1 && (
            <>
              <div className="choice-grid">
              <button
                type="button"
                className={`choice-card${modoParcelamento === 'dividir' ? ' active' : ''}`}
                onClick={() => setModoParcelamento('dividir')}
              >
                <span className="choice-title">Dividir o valor</span>
                <span className="choice-desc">
                  {quantidade} parcelas de {formatCurrency(valorParcela)}
                  {valorUltima !== valorParcela && ` (última de ${formatCurrency(valorUltima)})`}
                </span>
              </button>

              <button
                type="button"
                className={`choice-card${modoParcelamento === 'repetir' ? ' active' : ''}`}
                onClick={() => setModoParcelamento('repetir')}
              >
                <span className="choice-title">Repetir o valor</span>
                <span className="choice-desc">
                  {quantidade} parcelas de {formatCurrency(valorInformado)} (total{' '}
                  {formatCurrency(valorInformado * quantidade)})
                </span>
              </button>
              </div>
              <div className="parcelamento-preview">
                <strong>Vencimentos</strong>
                {parcelasPreview.slice(0, 3).map((parcela, indice) => (
                  <span key={indice}>
                    {indice + 1}ª: {formatDate(parcela.data_vencimento)} —{' '}
                    {formatCurrency(parcela.valor_total)}
                  </span>
                ))}
                {quantidade > 3 && <span>...e mais {quantidade - 3} parcelas</span>}
              </div>
            </>
          )}
        </div>
      )}

      {editando && Number(titulo?.parcela ?? 1) > 1 && (
        <p className="parcelamento-note">Este título é a parcela {titulo?.parcela}.</p>
      )}

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
