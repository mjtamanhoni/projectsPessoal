import { useEffect, useState, type CSSProperties } from 'react';
import { fotoUrl } from '../api';

interface FotoProdutoProps {
  foto?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  maxHeight?: string | number;
  borderRadius?: number;
  background?: string;
  fontSize?: number;
}

export default function FotoProduto({
  foto,
  alt = '',
  width = '100%',
  height,
  maxHeight,
  borderRadius = 6,
  background = '#eef2ee',
  fontSize = 10,
}: FotoProdutoProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let objectUrl: string | null = null;
    setErro(false);
    if (!foto) {
      setSrc(null);
      return;
    }
    const url = fotoUrl(foto);
    setSrc(url);
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelado) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelado) setSrc(objectUrl);
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto]);

  const containerStyle: CSSProperties = {
    width,
    ...(height ? { height } : {}),
    ...(maxHeight ? { maxHeight } : {}),
    borderRadius,
    background,
  };

  if (!foto || erro) {
    return (
      <div
        style={{
          ...containerStyle,
          height: height ?? 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          color: '#9ca09d',
        }}
      >
        Sem foto
      </div>
    );
  }

  return <img src={src ?? ''} alt={alt} style={{ ...containerStyle, objectFit: 'contain' }} />;
}