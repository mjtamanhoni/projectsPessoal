import { useEffect, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { mascaraMoeda, mascaraNumero, decimalParaNumero, numeroParaDecimal } from '../format';
import FotoProduto from './FotoProduto';
import type { ProdutoFabricado } from '../api';

const UNIDADES = ['kg', 'L', 'un', 'g', 'ml'];
const CUSTO_CASAS = 2;

interface Props {
  titulo: string;
  inicial: ProdutoFabricado | null;
  onCancel: () => void;
  onSalvar: (data: ProdutoFabricado, foto?: { dataUrl?: string; remover?: boolean }) => Promise<void>;
}

function pesoDataUrl(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  return Math.round((dataUrl.length - (idx + 1)) * 0.75);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
    img.src = src;
  });
}

async function renderizarFoto(dataUrl: string, zoom: number, filtro: 'original' | 'cinza' | 'sepia', maxDim: number): Promise<string> {
  const img = await carregarImagem(dataUrl);
  const cw = img.naturalWidth / zoom;
  const ch = img.naturalHeight / zoom;
  const escala = Math.min(1, maxDim / Math.max(cw, ch));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cw * escala));
  canvas.height = Math.max(1, Math.round(ch * escala));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  if (filtro === 'cinza') ctx.filter = 'grayscale(1)';
  if (filtro === 'sepia') ctx.filter = 'sepia(1)';
  ctx.drawImage(
    img,
    (img.naturalWidth - cw) / 2,
    (img.naturalHeight - ch) / 2,
    cw,
    ch,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function ProdutoFabricadoModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [rendimento, setRendimento] = useState(
    inicial?.rendimento != null ? numeroParaDecimal(inicial.rendimento, 6) : '12,000000'
  );
  const [unidade, setUnidade] = useState(inicial?.unidade_medida ?? '');
  const [custo, setCusto] = useState(numeroParaDecimal(inicial?.custo_unitario, CUSTO_CASAS));
  const [margem, setMargem] = useState(numeroParaDecimal(inicial?.margem_lucro, CUSTO_CASAS));
  const [venda, setVenda] = useState(numeroParaDecimal(inicial?.valor_venda_sugerido, CUSTO_CASAS));
  const [preco, setPreco] = useState(numeroParaDecimal(inicial?.preco, CUSTO_CASAS));
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [fotoProcessada, setFotoProcessada] = useState<string | null>(null);
  const [fotoZoom, setFotoZoom] = useState(1);
  const [fotoFiltro, setFotoFiltro] = useState<'original' | 'cinza' | 'sepia'>('original');
  const [fotoTamanho, setFotoTamanho] = useState(1200);
  const [fotoAlterada, setFotoAlterada] = useState(false);
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [fotoErro, setFotoErro] = useState('');

  const fotoBaseExistente = inicial?.foto;

  useEffect(() => {
    if (!fotoOriginal) return;
    let ativoFlag = true;
    setProcessando(true);
    setFotoErro('');
    (async () => {
      try {
        const out = await renderizarFoto(fotoOriginal, fotoZoom, fotoFiltro, fotoTamanho);
        if (ativoFlag) {
          setFotoProcessada(out);
          setProcessando(false);
        }
      } catch (e) {
        if (ativoFlag) {
          setFotoErro(e instanceof Error ? e.message : 'Erro ao processar imagem');
          setProcessando(false);
        }
      }
    })();
    return () => {
      ativoFlag = false;
    };
  }, [fotoOriginal, fotoZoom, fotoFiltro, fotoTamanho]);

  const capturar = async (source: CameraSource) => {
    setFotoErro('');
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source,
        saveToGallery: false,
        width: 1600,
      });
      if (photo.dataUrl) {
        setFotoOriginal(photo.dataUrl);
        setFotoProcessada(null);
        setFotoAlterada(true);
        setFotoRemovida(false);
      }
    } catch (e) {
      setFotoErro(e instanceof Error ? e.message : 'Não foi possível obter a foto');
    }
  };

  const removerFoto = () => {
    setFotoOriginal(null);
    setFotoProcessada(null);
    setFotoAlterada(true);
    setFotoRemovida(true);
  };

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }
    if (!unidade) {
      setErro('Unidade de medida é obrigatória');
      return;
    }
    const rendNum = decimalParaNumero(rendimento);
    if (rendNum == null || rendNum <= 0) {
      setErro('Rendimento inválido');
      return;
    }
    const custoNum = decimalParaNumero(custo);
    const margemNum = decimalParaNumero(margem);
    const vendaNum = decimalParaNumero(venda);
    const precoNum = decimalParaNumero(preco);
    for (const [label, v] of [
      ['Custo unitário', custoNum],
      ['Margem de lucro', margemNum],
      ['Valor de venda', vendaNum],
      ['Preço', precoNum],
    ] as const) {
      if (v != null && v < 0) {
        setErro(`${label} inválido`);
        return;
      }
    }
    setSalvando(true);
    try {
      const fotoPayload =
        fotoAlterada || fotoRemovida
          ? fotoRemovida
            ? { remover: true }
            : { dataUrl: fotoProcessada ?? undefined }
          : undefined;
      await onSalvar(
        {
          nome: nome.trim(),
          descricao: descricao.trim(),
          rendimento: rendNum,
          unidade_medida: unidade,
          custo_unitario: custoNum,
          margem_lucro: margemNum,
          valor_venda_sugerido: vendaNum,
          preco: precoNum,
          ativo,
        },
        fotoPayload
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar produto');
      setSalvando(false);
    }
  };

  const moeda = (v: string, setV: (s: string) => void) => ({
    value: v,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV(mascaraMoeda(e.target.value, CUSTO_CASAS)),
    onBlur: () => {
      if (v.trim() !== '') {
        const n = decimalParaNumero(v);
        if (n != null) setV(numeroParaDecimal(n, CUSTO_CASAS));
      }
    },
  });

  const campo = (label: string, children: React.ReactNode) => (
    <>
      <div className="modal-label" style={{ position: 'static', margin: '12px 4px 4px' }}>{label}</div>
      <div style={{ margin: '0 4px 8px' }}>{children}</div>
    </>
  );

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
          {campo('Nome *', (
            <input
              className="modal-input"
              style={{ position: 'static', width: '100%' }}
              placeholder="Nome do produto"
              value={nome}
              autoFocus
              onChange={(e) => setNome(e.target.value)}
            />
          ))}

          {campo('Descrição', (
            <textarea
              className="modal-input modal-textarea"
              style={{ position: 'static', width: '100%', height: 56 }}
              placeholder="Descrição do produto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          ))}

          {campo('Rendimento', (
            <input
              className="modal-input"
              style={{ position: 'static', width: '100%' }}
              type="tel"
              inputMode="decimal"
              placeholder="0,000000"
              value={rendimento}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRendimento(mascaraNumero(e.target.value, 6))}
            />
          ))}

          {campo('Unidade de Medida *', (
            <select
              className="modal-input modal-select"
              style={{ position: 'static', width: '100%' }}
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
            >
              <option value="">Selecione...</option>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          ))}

          {campo('Custo Unitário', (
            <input className="modal-input" style={{ position: 'static', width: '100%' }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(custo, setCusto)} />
          ))}

          {campo('Margem de Lucro (%)', (
            <input className="modal-input" style={{ position: 'static', width: '100%' }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(margem, setMargem)} />
          ))}

          {campo('Valor Venda Sugerido', (
            <input className="modal-input" style={{ position: 'static', width: '100%' }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(venda, setVenda)} />
          ))}

          {campo('Preço (usado nos cards de venda/encomenda)', (
            <input className="modal-input" style={{ position: 'static', width: '100%' }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(preco, setPreco)} />
          ))}

          {campo('Foto do Produto', (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="modal-btn save" style={{ position: 'static' }} onClick={() => void capturar(CameraSource.Camera)}>
                  📷 Câmera
                </button>
                <button className="modal-btn cancel" style={{ position: 'static' }} onClick={() => void capturar(CameraSource.Photos)}>
                  🖼️ Galeria
                </button>
                {(fotoAlterada || fotoRemovida) && (
                  <button className="modal-btn cancel" style={{ position: 'static' }} onClick={removerFoto}>
                    Remover
                  </button>
                )}
              </div>

              {fotoErro && <div className="modal-erro" style={{ position: 'static', marginBottom: 8 }}>{fotoErro}</div>}

              {fotoOriginal && (
                <div>
                  <img
                    src={fotoProcessada ?? fotoOriginal}
                    alt="Foto do produto"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 6, background: '#f3f5f2' }}
                  />
                  {processando && (
                    <div style={{ fontSize: 11, color: '#6b706c', marginTop: 4 }}>Processando imagem...</div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <div className="modal-label" style={{ position: 'static', margin: '4px 0 2px' }}>Zoom</div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={fotoZoom}
                      style={{ width: '100%' }}
                      onChange={(e) => setFotoZoom(Number(e.target.value))}
                    />
                    <div className="modal-label" style={{ position: 'static', margin: '8px 0 2px' }}>Filtro</div>
                    <select
                      className="modal-input modal-select"
                      style={{ position: 'static', width: '100%' }}
                      value={fotoFiltro}
                      onChange={(e) => setFotoFiltro(e.target.value as 'original' | 'cinza' | 'sepia')}
                    >
                      <option value="original">Original</option>
                      <option value="cinza">Preto e branco</option>
                      <option value="sepia">Sépia</option>
                    </select>
                    <div className="modal-label" style={{ position: 'static', margin: '8px 0 2px' }}>Tamanho final</div>
                    <select
                      className="modal-input modal-select"
                      style={{ position: 'static', width: '100%' }}
                      value={String(fotoTamanho)}
                      onChange={(e) => setFotoTamanho(Number(e.target.value))}
                    >
                      <option value="640">Pequeno (640px)</option>
                      <option value="1200">Médio (1200px)</option>
                      <option value="1600">Grande (1600px)</option>
                    </select>
                    {pesoDataUrl(fotoOriginal) > 400 * 1024 && (
                      <div style={{ margin: '6px 0', fontSize: 11, color: '#c0392b' }}>
                        Foto grande ({formatBytes(pesoDataUrl(fotoOriginal))}). A imagem será reduzida para cerca de{' '}
                        {fotoProcessada ? formatBytes(pesoDataUrl(fotoProcessada)) : '...'} ao salvar.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!fotoOriginal && fotoBaseExistente && !fotoRemovida && (
                <FotoProduto foto={fotoBaseExistente} alt="Foto atual" maxHeight={180} background="#f3f5f2" />
              )}
            </div>
          ))}

          {campo('Ativo', (
            <div className="modal-check-row" style={{ position: 'static', margin: '0 4px 8px' }}>
              <div className={`modal-checkbox ${ativo ? 'checked' : ''}`} onClick={() => setAtivo(!ativo)}>
                {ativo && <div className="modal-check-fill" />}
              </div>
              <span className="modal-check-label">Ativo</span>
            </div>
          ))}

          {erro && <div className="modal-erro" style={{ position: 'static', marginBottom: 8 }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}