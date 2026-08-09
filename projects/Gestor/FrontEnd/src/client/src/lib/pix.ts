import QRCode from 'qrcode';

export interface PixParams {
  chave: string;
  nome: string;
  cidade?: string;
  valor?: number;
  txid?: string;
}

function tlv(id: string, valor: string): string {
  const tamanho = String(valor.length).padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

function crc16CCITT(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPayloadPix({ chave, nome, cidade, valor, txid }: PixParams): string {
  const chaveLimpa = chave.trim();
  if (!chaveLimpa) return '';

  const merchantInfo = tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', chaveLimpa));
  const nomeRecebedor = nome.trim().slice(0, 25) || 'RECEBEDOR';
  const cidadeRecebedor = (cidade ?? '').trim().slice(0, 15) || 'BRASIL';
  const txidFixo = txid ?? '***';

  let payload = tlv('00', '01');
  payload += merchantInfo;
  payload += tlv('52', '0000');
  payload += '5303986';
  if (valor != null && valor > 0) {
    payload += tlv('54', valor.toFixed(2));
  }
  payload += tlv('58', 'BR');
  payload += tlv('59', nomeRecebedor);
  payload += tlv('60', cidadeRecebedor);
  payload += tlv('62', tlv('05', txidFixo.slice(0, 25)));

  return payload + '6304' + crc16CCITT(payload + '6304');
}

export async function gerarQrPixDataUrl(payload: string, largura = 260): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: largura,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}