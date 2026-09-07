import { useEffect, useState } from 'react';
import { mascaraMoeda, decimalParaNumero } from '../format';
import { listarProdutosFabricados, listarProdutoClassificacoes, type ProdutoVenda, type ProdutoFabricado, type ProdutoClassificacao } from '../api';
import SeletorRegistro from './SeletorRegistro';

interface Props {
  titulo: string;
  inicial: ProdutoVenda | null;
  onCancel: () => void;
  onSalvar: (data: ProdutoVenda) => Promise<void>;
}

export default function ProdutoVendaModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [preco, setPreco] = useState(inicial?.preco != null ? String(inicial.preco).replace('.', ',') : '');
  const [produtoFabricadoId, setProdutoFabricadoId] = useState<number | undefined>(inicial?.produto_fabricado_id);
  const [produtoFabricadoNome, setProdutoFabricadoNome] = useState(inicial?.produto_fabricado_nome ?? '');
  const [produtoClassificacaoId, setProdutoClassificacaoId] = useState<number | undefined>(inicial?.produto_classificacao_id);
  const [produtoClassificacaoNome, setProdutoClassificacaoNome] = useState(inicial?.produto_classificacao_nome ?? '');
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [classificacoes, setClassificacoes] = useState<ProdutoClassificacao[]>([]);
  const [selProduto, setSelProduto] = useState(false);
  const [selClassificacao, setSelClassificacao] = useState(false);

  useEffect(() => {
    listarProdutosFabricados().then(setProdutos).catch(() => {});
    listarProdutoClassificacoes().then(setClassificacoes).catch(() => {});
  }, []);

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) { setErro('Nome é obrigatório'); return; }
    const precoNum = decimalParaNumero(preco) ?? 0;
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        preco: precoNum,
        produto_fabricado_id: produtoFabricadoId,
        produto_classificacao_id: produtoClassificacaoId,
        ativo,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ minHeight: 420 }}>
          <div className="modal-label" style={{ top: 6 }}>Nome *</div>
          <input className="modal-input" style={{ top: 22 }} placeholder="Nome do produto" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          <div className="modal-label" style={{ top: 92 }}>Descrição</div>
          <input className="modal-input" style={{ top: 108 }} placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="modal-label" style={{ top: 178 }}>Preço de Venda (R$) *</div>
          <input className="modal-input" style={{ top: 194 }} placeholder="0,00" value={preco} onChange={(e) => setPreco(mascaraMoeda(e.target.value, 2))} />
          <div className="modal-label" style={{ top: 264 }}>Produto de Origem</div>
          <input className="modal-input" style={{ top: 280, color: produtoFabricadoNome ? '#ddd' : '#777' }} placeholder="Toque para selecionar" value={produtoFabricadoNome} readOnly onClick={() => setSelProduto(true)} />
          <div className="modal-label" style={{ top: 350 }}>Classificação</div>
          <input className="modal-input" style={{ top: 366, color: produtoClassificacaoNome ? '#ddd' : '#777' }} placeholder="Toque para selecionar" value={produtoClassificacaoNome} readOnly onClick={() => setSelClassificacao(true)} />
          <div className="modal-check-row" style={{ top: 436 }}>
            <div className={`modal-checkbox ${ativo ? 'checked' : ''}`} onClick={() => setAtivo(!ativo)}>
              {ativo && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Ativo</span>
          </div>
          {erro && <div className="modal-erro">{erro}</div>}
          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>Cancelar</button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>

      {selProduto && (
        <SeletorRegistro
          titulo="Produto de Origem"
          placeholder="Buscar produto..."
          registros={produtos}
          rotulo={(p) => p.nome}
          subtitulo={(p) => `${p.unidade_medida} — R$ ${Number(p.preco ?? 0).toFixed(2)}`}
          aoSelecionar={(p) => {
            setProdutoFabricadoId(p.id);
            setProdutoFabricadoNome(p.nome);
            setSelProduto(false);
          }}
          fechar={() => setSelProduto(false)}
        />
      )}

      {selClassificacao && (
        <SeletorRegistro
          titulo="Classificação"
          placeholder="Buscar classificação..."
          registros={classificacoes}
          rotulo={(c) => c.nome}
          aoSelecionar={(c) => {
            setProdutoClassificacaoId(c.id);
            setProdutoClassificacaoNome(c.nome);
            setSelClassificacao(false);
          }}
          fechar={() => setSelClassificacao(false)}
        />
      )}
    </div>
  );
}
