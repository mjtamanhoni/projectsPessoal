import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { EstoqueProdutoFabricado, ProdutoFabricado } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const QTD_CASAS = 4;

interface Props {
  titulo: string;
  inicial: EstoqueProdutoFabricado | null;
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: EstoqueProdutoFabricado) => Promise<void>;
}

export default function EstoqueProdutoModal({ titulo, inicial, produtos, onCancel, onSalvar }: Props) {
  const [produtoId, setProdutoId] = useState(inicial?.produto_fabricado_id ? String(inicial.produto_fabricado_id) : '');
  const [quantidade, setQuantidade] = useState(numeroParaDecimal(inicial?.quantidade, QTD_CASAS));
  const [dataAtualizacao, setDataAtualizacao] = useState(
    inicial?.data_atualizacao ? inicial.data_atualizacao.split('T')[0] : new Date().toISOString().slice(0, 10)
  );
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');
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
      setErro('Informe a quantidade em estoque');
      return;
    }
    if (!dataAtualizacao) {
      setErro('Data da atualização é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id,
        produto_fabricado_id: Number(produtoId),
        quantidade: qtdParsed,
        data_atualizacao: dataAtualizacao,
        observacao: observacao.trim(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar estoque');
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
            Quantidade em Estoque *
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
            Data da Atualização *
          </div>
          <input
            className="modal-input"
            style={{ top: 134 }}
            type="date"
            value={dataAtualizacao}
            onChange={(e) => setDataAtualizacao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 174 }}>
            Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 190, height: 56 }}
            placeholder="Observações do lançamento"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          {erro && <div className="modal-erro">{erro}</div>}

          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
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