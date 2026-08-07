import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { PerdaProdutoFabricado, ProdutoFabricado } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const QTD_CASAS = 4;

interface Props {
  titulo: string;
  inicial: PerdaProdutoFabricado | null;
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: PerdaProdutoFabricado) => Promise<void>;
}

export default function PerdaProdutoModal({ titulo, inicial, produtos, onCancel, onSalvar }: Props) {
  const [produtoId, setProdutoId] = useState(inicial?.produto_fabricado_id ? String(inicial.produto_fabricado_id) : '');
  const [quantidade, setQuantidade] = useState(numeroParaDecimal(inicial?.quantidade, QTD_CASAS));
  const [dataPerda, setDataPerda] = useState(
    inicial?.data_perda ? inicial.data_perda.split('T')[0] : new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'produto' | null>(null);

  const qtdParsed = quantidade ? Number(quantidade.replace(/\D/g, '')) / 10000 : 0;

  const salvar = async () => {
    setErro('');
    if (!produtoId) {
      setErro('Selecione um produto');
      return;
    }
    if (qtdParsed <= 0) {
      setErro('Informe a quantidade perdida');
      return;
    }
    if (!dataPerda) {
      setErro('Data da perda é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        produto_fabricado_id: Number(produtoId),
        quantidade: qtdParsed,
        data_perda: dataPerda,
        motivo: motivo.trim(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar perda');
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-label" style={{ top: 6 }}>
            Produto *
          </div>
          <CampoSeletor
            style={{ top: 22 }}
            texto={produtos.find((p) => String(p.id) === produtoId)?.nome}
            aoAbrir={() => setPicker('produto')}
          />

          <div className="modal-label" style={{ top: 62 }}>
            Quantidade Perdida *
          </div>
          <input
            className="modal-input"
            style={{ top: 78 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,0000"
            value={quantidade}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQuantidade(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 118 }}>
            Data da Perda *
          </div>
          <input
            className="modal-input"
            style={{ top: 134 }}
            type="date"
            value={dataPerda}
            onChange={(e) => setDataPerda(e.target.value)}
          />

          <div className="modal-label" style={{ top: 174 }}>
            Motivo / Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 190, height: 64 }}
            placeholder="Informe o motivo da perda"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          {erro && <div className="modal-erro">{erro}</div>}

          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Perda'}
          </button>
        </div>
      </div>

      {picker === 'produto' && (
        <SeletorRegistro<ProdutoFabricado>
          titulo="Selecionar Produto"
          placeholder="Buscar produto por nome..."
          registros={produtos}
          rotulo={(p) => p.nome}
          aoSelecionar={(p) => {
            setProdutoId(String(p.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}
    </div>
  );
}