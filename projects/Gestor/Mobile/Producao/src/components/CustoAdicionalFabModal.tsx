import { useState } from 'react';
import { mascaraMoeda } from '../format';
import type { CustoAdicionalTipo, FabricacaoCustoAdicional } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const VALOR_CASAS = 2;

interface Props {
  titulo: string;
  inicial: FabricacaoCustoAdicional | null;
  fabricacaoId: number;
  tiposCusto: CustoAdicionalTipo[];
  onCancel: () => void;
  onSalvar: (data: FabricacaoCustoAdicional) => Promise<void>;
}

export default function CustoAdicionalFabModal({ titulo, inicial, fabricacaoId, tiposCusto, onCancel, onSalvar }: Props) {
  const [tipoId, setTipoId] = useState(inicial?.custo_adicional_tipo_id ? String(inicial.custo_adicional_tipo_id) : '');
  const [valor, setValor] = useState(inicial?.valor ? inicial.valor.toFixed(VALOR_CASAS).replace('.', ',') : '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'tipo' | null>(null);

  const valorParsed = valor ? Number(valor.replace(/\./g, '').replace(',', '.')) : 0;

  const salvar = async () => {
    setErro('');
    if (!tipoId) {
      setErro('Selecione o tipo de custo');
      return;
    }
    if (valorParsed <= 0) {
      setErro('Informe um valor maior que zero');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        fabricacao_id: fabricacaoId,
        custo_adicional_tipo_id: Number(tipoId),
        valor: valorParsed,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar custo adicional');
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
            Tipo de Custo *
          </div>
          <CampoSeletor
            style={{ top: 22 }}
            texto={tiposCusto.find((t) => String(t.id) === tipoId)?.nome}
            aoAbrir={() => setPicker('tipo')}
          />

          <div className="modal-label" style={{ top: 62 }}>
            Valor (R$) *
          </div>
          <input
            className="modal-input"
            style={{ top: 78, width: 140 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setValor(mascaraMoeda(e.target.value, VALOR_CASAS))}
          />

          {erro && (
            <div className="modal-erro" style={{ top: 140 }}>
              {erro}
            </div>
          )}

          <div style={{ position: 'absolute', left: 0, top: 180, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Custo'}
            </button>
          </div>
        </div>
      </div>

      {picker === 'tipo' && (
        <SeletorRegistro<CustoAdicionalTipo>
          titulo="Selecionar Tipo de Custo"
          placeholder="Buscar tipo de custo..."
          registros={tiposCusto}
          rotulo={(t) => t.nome}
          aoSelecionar={(t) => {
            setTipoId(String(t.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}
    </div>
  );
}
