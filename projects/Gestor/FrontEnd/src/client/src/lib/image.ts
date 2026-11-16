export interface AvatarResizeOptions {
  maxSize?: number;
  quality?: number;
  square?: boolean;
  mimeType?: string;
  background?: string;
}

const DEFAULTS: Required<AvatarResizeOptions> = {
  maxSize: 512,
  quality: 0.82,
  square: true,
  mimeType: 'image/jpeg',
  background: '#ffffff',
};

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
    img.src = src;
  });
}

/**
 * Reduz e recomprime uma imagem para uso como avatar.
 * - `square`: recorta o centro em quadrado (bom para avatares redondos).
 * - `maxSize`: maior lado em pixels (não aumenta imagens menores).
 * - Converte para JPEG por padrão, o que reduz bastante o tamanho.
 */
export async function resizeImageDataUrl(input: string, options: AvatarResizeOptions = {}): Promise<string> {
  const opts = { ...DEFAULTS, ...options };
  const img = await loadImage(input);

  const larguraOriginal = img.naturalWidth || img.width;
  const alturaOriginal = img.naturalHeight || img.height;
  if (!larguraOriginal || !alturaOriginal) {
    throw new Error('Imagem inválida');
  }

  let sx = 0;
  let sy = 0;
  let larguraRecorte = larguraOriginal;
  let alturaRecorte = alturaOriginal;

  if (opts.square) {
    const lado = Math.min(larguraOriginal, alturaOriginal);
    sx = (larguraOriginal - lado) / 2;
    sy = (alturaOriginal - lado) / 2;
    larguraRecorte = lado;
    alturaRecorte = lado;
  }

  const escala = Math.min(1, opts.maxSize / Math.max(larguraRecorte, alturaRecorte));
  const largura = Math.max(1, Math.round(larguraRecorte * escala));
  const altura = Math.max(1, Math.round(alturaRecorte * escala));

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível processar a imagem');
  }

  if (opts.mimeType === 'image/jpeg') {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, largura, altura);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, larguraRecorte, alturaRecorte, 0, 0, largura, altura);

  return canvas.toDataURL(opts.mimeType, opts.quality);
}

export async function fileToAvatarDataUrl(file: File, options: AvatarResizeOptions = {}): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem');
  }
  const original = await readFileAsDataUrl(file);
  return resizeImageDataUrl(original, options);
}

export async function urlToAvatarDataUrl(url: string, options: AvatarResizeOptions = {}): Promise<string> {
  const resposta = await fetch(url, { mode: 'cors' });
  if (!resposta.ok) {
    throw new Error('Não foi possível baixar a imagem');
  }
  const blob = await resposta.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('O endereço não retornou uma imagem');
  }
  const original = await readFileAsDataUrl(blob);
  return resizeImageDataUrl(original, options);
}
