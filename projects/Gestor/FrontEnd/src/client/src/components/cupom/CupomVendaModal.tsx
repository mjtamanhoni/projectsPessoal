import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { FileText, Printer, Copy, Check, MessageCircle, Share2 } from 'lucide-react';
import type { VendaProduto, Cliente } from '@/types';
import { gerarTextoCupom, imprimirCupomSerial, type CupomData } from '@/lib/cupom';
import { gerarPDFCupom } from '@/lib/cupom-pdf';
import { gerarPayloadPix, gerarQrPixDataUrl } from '@/lib/pix';
import { getCachedSettings, getLogo } from '@/lib/settings';
import { viewPDF } from '@/lib/pdf';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface CupomVendaModalProps {
  venda: VendaProduto | null;
  onClose: () => void;
  clientes: Cliente[];
}

export function CupomVendaModal({ venda, onClose, clientes }: CupomVendaModalProps) {
  const { empresa } = useAuth();
  const { addToast } = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [copiadoChave, setCopiadoChave] = useState(false);
  const [copiadoPayload, setCopiadoPayload] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cliente = venda
    ? (clientes.find((c) => c.id === venda.cliente_id || c.codigo === venda.cliente_id) ?? null)
    : null;

  const buildCupomData = (v: VendaProduto): CupomData => ({
    empresaNome: empresa?.fantasia || empresa?.razao_social || 'EMPRESA',
    empresaCnpj: empresa?.cnpj_cpf || '',
    empresaEndereco: empresa?.endereco || '',
    empresaTelefone: empresa?.celular || empresa?.telefone || '',
    empresaEmail: empresa?.email || '',
    chavePix: empresa?.chave_pix || '',
    pixQrBase64: null,
    venda: v,
    cliente,
    numeroCupom: v.id ?? v.codigo ?? 0,
    formaPagamento: v.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
    parcelas: [] as { numero: number; total: number; vencimento: string; valor: number }[],
    desconto: 0,
    logoBase64: getLogo(),
  });

  useEffect(() => {
    setQr(null);
    setPayload(null);
    if (!venda || !empresa?.chave_pix) return;
    const data = buildCupomData(venda);
    try {
      const p = gerarPayloadPix({
        chave: empresa.chave_pix,
        nome: data.empresaNome,
        cidade: '',
        valor: Number(venda.valor_total) || 0,
        txid: `CUPOM${String(data.numeroCupom).padStart(5, '0')}`,
      });
      if (!p) return;
      setPayload(p);
      gerarQrPixDataUrl(p, 240).then(setQr).catch(() => setQr(null));
    } catch {
      setPayload(null);
      setQr(null);
    }
  }, [venda, empresa?.chave_pix]);

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

  const copiarPix = async () => {
    const chave = empresa?.chave_pix;
    if (!chave) return;
    await copiarTexto(chave);
    setCopiadoChave(true);
    setTimeout(() => setCopiadoChave(false), 2000);
  };

  const copiarCodigoPix = async () => {
    if (!payload) return;
    await copiarTexto(payload);
    setCopiadoPayload(true);
    setTimeout(() => setCopiadoPayload(false), 2000);
  };

  const handleThermalPrint = async () => {
    if (!venda) return;
    const settings = getCachedSettings();
    if (!settings?.printer || !settings.printer.porta) {
      addToast('error', 'Impressora termica nao configurada. Va em Configuracoes > Impressao.');
      return;
    }
    setPrinting(true);
    try {
      const texto = gerarTextoCupom(buildCupomData(venda));
      const textoImpressao = imprimirCupomSerial(texto);
      await api.post('/print/cupom', {
        texto: textoImpressao,
        modelo: settings.printer.modelo,
        porta: settings.printer.porta,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
        cortarPapel: settings.printer.cortarPapel,
        espacoEntreLinhas: settings.printer.espacoEntreLinhas,
        linhasBuffer: settings.printer.linhasBuffer,
        linhasPular: settings.printer.linhasPular,
      });
      addToast('success', 'Cupom enviado para impressao');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao imprimir cupom';
      addToast('error', msg);
    } finally {
      setPrinting(false);
    }
  };

  const gerarDocPDF = async () => {
    if (!venda) return null;
    const data = buildCupomData(venda);
    if (payload && !qr) {
      try {
        const url = await gerarQrPixDataUrl(payload, 240);
        setQr(url);
        data.pixQrBase64 = url;
      } catch {
        data.pixQrBase64 = null;
      }
    } else {
      data.pixQrBase64 = qr;
    }
    return gerarPDFCupom(data);
  };

  const handleViewPdf = async () => {
    const doc = await gerarDocPDF();
    if (doc) viewPDF(doc);
  };

  const enviarWhatsApp = async () => {
    if (!venda || !cliente) return;
    const numero = cliente.celular || cliente.telefone || '';
    const digitos = numero.replace(/\D/g, '');
    if (!digitos) {
      addToast('error', 'Cliente sem telefone cadastrado');
      return;
    }
    const alvo = digitos.length >= 12 ? digitos : digitos.length >= 10 ? `55${digitos}` : digitos;
    const numeroCupom = venda.id ?? venda.codigo ?? 0;
    const cupomLabel = `Cupom ${String(numeroCupom).padStart(5, '0')}`;
    const saudacao = `Ola${cliente?.nome ? ` ${cliente.nome}` : ''}!`;

    const linhas: string[] = [
      `${saudacao} Informacoes da encomenda:`,
      cupomLabel,
      `Valor: ${formatCurrency(Number(venda.valor_total) || 0)}`,
    ];
    if (empresa?.chave_pix) {
      linhas.push('', `Chave PIX: ${empresa.chave_pix}`);
    }
    if (payload) {
      linhas.push('', 'Codigo PIX (copia e cola):', payload);
    }
    const mensagem = linhas.join('\n');

    window.open(`https://wa.me/${alvo}?text=${encodeURIComponent(mensagem)}`, '_blank');

    setEnviando(true);
    try {
      const doc = await gerarDocPDF();
      if (doc) viewPDF(doc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar PDF do cupom';
      addToast('error', msg);
    } finally {
      setEnviando(false);
    }
  };

  const compartilharPDF = async () => {
    if (!venda) return;
    setEnviando(true);
    try {
      const doc = await gerarDocPDF();
      if (!doc) return;
      const arquivo = new File(
        [doc.output('blob')],
        `cupom-${String(venda.id ?? venda.codigo ?? 0).padStart(5, '0')}.pdf`,
        { type: 'application/pdf' },
      );
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: `Cupom ${String(venda.id ?? venda.codigo ?? 0).padStart(5, '0')}` });
        return;
      }
      doc.save(arquivo.name);
      addToast('info', `PDF baixado (${arquivo.name}) - clique com o botao direito no arquivo e escolha "Compartilhar"`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Erro ao compartilhar PDF';
      addToast('error', msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal isOpen={venda !== null} onClose={onClose} title="Cupom Nao Fiscal" maxWidth="max-w-3xl">
      {venda && (
        <div className="space-y-4">
          <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-xs font-mono leading-tight overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
            {gerarTextoCupom(buildCupomData(venda))}
          </pre>

          {empresa?.chave_pix && (
            <div className="border border-border-primary rounded-lg p-4 flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                {qr ? (
                  <img src={qr} alt="QR Code PIX" className="h-32 w-32" />
                ) : (
                  <div className="h-32 w-32 flex items-center justify-center text-text-tertiary text-sm text-center px-2">
                    Gerando QR Code...
                  </div>
                )}
                <span className="text-xs font-medium text-text-secondary">PIX</span>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text-primary">Pagar com PIX</p>
                <p className="text-xs text-text-tertiary break-all">{empresa.chave_pix}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copiarPix}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-primary hover:bg-bg-muted text-xs transition-colors"
                  >
                    {copiadoChave ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                    {copiadoChave ? 'Chave copiada!' : 'Copiar chave'}
                  </button>
                  {payload && (
                    <button
                      onClick={copiarCodigoPix}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-primary hover:bg-bg-muted text-xs transition-colors"
                    >
                      {copiadoPayload ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                      {copiadoPayload ? 'Código PIX copiado!' : 'Copiar código PIX'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="primary" onClick={enviarWhatsApp} disabled={!cliente || enviando}>
              <MessageCircle size={16} /> {enviando ? 'Preparando...' : 'Enviar via WhatsApp'}
            </Button>
            <Button variant="secondary" onClick={() => handleThermalPrint()} disabled={printing}>
              <Printer size={16} /> {printing ? 'Imprimindo...' : 'Impressora Termica'}
            </Button>
            <Button variant="secondary" onClick={() => handleViewPdf()}>
              <FileText size={16} /> Visualizar PDF
            </Button>
            <Button variant="secondary" onClick={() => compartilharPDF()} disabled={enviando}>
              <Share2 size={16} /> Compartilhar PDF
            </Button>
          </div>
          {!cliente && <p className="text-center text-xs text-text-tertiary">Cliente sem telefone cadastrado - nao e possivel enviar via WhatsApp.</p>}
        </div>
      )}
    </Modal>
  );
}
