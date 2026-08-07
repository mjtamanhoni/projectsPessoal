import { useState } from 'react';
import { mascaraMoeda, decimalParaNumero, numeroParaDecimal } from '../format';
import type { Insumo, ProdutoFabricado, ReceitaIngrediente } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const QTD_CASAS = 3;
const CUSTO_CASAS = 2;

interface Props {
  titulo: string;
  inicial: ReceitaIngrediente | null;
  produtos: ProdutoFabricado[];
  insumos: Insumo[];
  onCancel: () => void;
  onSalvar: (data: ReceitaIngrediente) => Promise<void>;
}

export default function IngredienteModal({ titulo, inicial, produtos, insumos, onCancel, onSalvar }: Props) {
  const [produto, setProduto] = useState(inicial?.produto_fabricado_id ? String(inicial.produto_fabricado_id) : '');
  const [insumo, setInsumo] = useState(inicial?.insumo_id ? String(inicial.insumo_id) : '');
  const [qtd, setQtd] = useState(inicial?.quantidade != null ? numeroParaDecimal(inicial.quantidade, QTD_CASAS) : '');
  const [custo, setCusto] = useState(numeroParaDecimal(inicial?.insumo_custo_medio, CUSTO_CASAS));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'produto' | 'insumo' | null>(null);

  const insumoSel = insumos.find((i) => String(i.id) === insumo);

  const selecionarInsumo = (v: string) => {
    setInsumo(v);
    const i = insumos.find((x) => String(x.id) === v);
    setCusto(numeroParaDecimal(i?.custo_medio, CUSTO_CASAS));
  };

  const salvar = async () => {
    setErro('');
    if (!produto) {
      setErro('Produto é obrigatório');
      return;
    }
    if (!insumo) {
      setErro('Insumo é obrigatório');
      return;
    }
    const qtdNum = decimalParaNumero(qtd);
    if (qtdNum == null || qtdNum <= 0) {
      setErro('Quantidade inválida');
      return;
    }
    const custoNum = decimalParaNumero(custo);
    if (custoNum == null || custoNum < 0) {
      setErro('Custo unitário inválido');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        produto_fabricado_id: Number(produto),
        insumo_id: Number(insumo),
        quantidade: qtdNum,
        insumo_custo_medio: custoNum,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar ingrediente');
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
            texto={produtos.find((p) => String(p.id) === produto)?.nome}
            aoAbrir={() => setPicker('produto')}
          />

          <div className="modal-label" style={{ top: 72 }}>
            Insumo *
          </div>
          <CampoSeletor
            style={{ top: 88 }}
            texto={insumos.find((i) => String(i.id) === insumo)?.nome}
            aoAbrir={() => setPicker('insumo')}
          />
          {insumoSel && (
            <div className="modal-hint" style={{ top: 128 }}>
              Unidade: {insumoSel.unidade_medida}
            </div>
          )}

          <div className="modal-label" style={{ top: 158 }}>
            Quantidade
          </div>
          <input
            className="modal-input"
            style={{ top: 174 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,000"
            value={qtd}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQtd(mascaraMoeda(e.target.value, QTD_CASAS))}
            onBlur={() => {
              if (qtd.trim() !== '') {
                const n = decimalParaNumero(qtd);
                if (n != null) setQtd(numeroParaDecimal(n, QTD_CASAS));
              }
            }}
          />

          <div className="modal-label" style={{ top: 224 }}>
            Custo Unitário
          </div>
          <input
            className="modal-input"
            style={{ top: 240 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={custo}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCusto(mascaraMoeda(e.target.value, CUSTO_CASAS))}
            onBlur={() => {
              if (custo.trim() !== '') {
                const n = decimalParaNumero(custo);
                if (n != null) setCusto(numeroParaDecimal(n, CUSTO_CASAS));
              }
            }}
          />

          <div className="modal-hint" style={{ top: 290 }}>
            Subtotal: {numeroParaDecimal(decimalParaNumero(qtd) && decimalParaNumero(custo) ? decimalParaNumero(qtd)! * decimalParaNumero(custo)! : undefined, CUSTO_CASAS)}
          </div>

          {erro && <div className="modal-erro" style={{ top: 336 }}>{erro}</div>}

          <button className="modal-btn cancel" style={{ top: 366, left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ top: 366, left: 190 }} onClick={salvar} disabled={salvando}>
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
            setProduto(String(p.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}

      {picker === 'insumo' && (
        <SeletorRegistro<Insumo>
          titulo="Selecionar Insumo"
          placeholder="Buscar insumo por nome..."
          registros={insumos}
          rotulo={(i) => i.nome}
          subtitulo={(i) => i.unidade_medida}
          aoSelecionar={(i) => {
            selecionarInsumo(String(i.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}
    </div>
  );
}
