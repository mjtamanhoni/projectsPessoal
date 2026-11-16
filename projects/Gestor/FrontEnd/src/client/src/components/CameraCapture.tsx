import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/Button';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;

    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Este navegador não suporta acesso à câmera');
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
        setPronto(true);
      } catch (err) {
        const nome = (err as { name?: string })?.name;
        if (nome === 'NotAllowedError' || nome === 'SecurityError') {
          setErro('Permissão de câmera negada. Autorize o acesso no navegador.');
        } else if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
          setErro('Nenhuma câmera foi encontrada neste dispositivo.');
        } else {
          setErro(err instanceof Error ? err.message : 'Não foi possível abrir a câmera');
        }
      }
    };

    void iniciar();

    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-muted/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">Tirar foto com a câmera</p>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-bg-muted" title="Fechar câmera">
          <X size={16} className="text-text-secondary" />
        </button>
      </div>

      {erro ? (
        <p className="text-sm text-accent-red">{erro}</p>
      ) : (
        <video
          ref={videoRef}
          className="w-full max-w-sm aspect-video rounded-lg bg-black object-cover"
          playsInline
          muted
        />
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={capturar} disabled={!pronto}>
          <Camera size={14} /> Capturar
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
