export function bytesParaBase64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

export function base64ParaBytes(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

export function textoParaBase64(texto: string): string {
  return bytesParaBase64(new TextEncoder().encode(texto));
}

export function base64ParaTexto(base64: string): string {
  return new TextDecoder().decode(base64ParaBytes(base64));
}
