import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, ImageIcon, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { formatCurrencyInput, parseCurrencyInput, fotoUrl } from '@/lib/utils';
import type { ProdutoVenda, ProdutoFabricado } from '@/types';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import type { FotoPayload } from '@/components/forms/ProdutoFabricadoForm';

const produtoVendaSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional(),
  preco: z.number().min(0, 'Preco deve ser maior ou igual a zero'),
  produto_fabricado_id: z.number().int().positive().nullable().optional(),
  foto: z.string().optional(),
  ativo: z.boolean().optional(),
});

type ProdutoVendaInput = z.infer<typeof produtoVendaSchema>;

interface ProdutoVendaFormProps {
  onSubmit: (data: ProdutoVenda, foto?: FotoPayload) => void;
  onCancel: () => void;
  initial?: ProdutoVenda | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dataUrlPeso(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  return Math.round((dataUrl.length - (idx + 1)) * 0.75);
}

function comprimirImagem(src: string, maxDim = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponivel'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        reject(new Error('Nao foi possivel processar esta imagem (URL externa bloqueada). Baixe a imagem para o computador e envie por arquivo.'));
      }
    };
    img.onerror = () => reject(new Error('Nao foi possivel carregar a imagem'));
    img.src = src;
  });
}

export function ProdutoVendaForm({ onSubmit, onCancel, initial }: ProdutoVendaFormProps) {
  const [produtosFabricados, setProdutosFabricados] = useState<ProdutoFabricado[]>([]);

  useEffect(() => {
    api.get<ProdutoFabricado[]>('/produtos-fabricados').then((r) => setProdutosFabricados(r.data)).catch(() => {});
  }, []);

  const { handleSubmit, formState: { errors }, control } = useForm<ProdutoVendaInput>({
    resolver: zodResolver(produtoVendaSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      descricao: initial.descricao || '',
      preco: initial.preco ?? 0,
      produto_fabricado_id: initial.produto_fabricado_id ?? null,
      foto: initial.foto || '',
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      descricao: '',
      preco: 0,
      produto_fabricado_id: null,
      foto: '',
      ativo: true,
    },
  });

  const [fotoPreview, setFotoPreview] = useState<string | null>(initial?.foto ? fotoUrl(initial.foto) : null);
  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const [fotoProcessando, setFotoProcessando] = useState(false);
  const [fotoErro, setFotoErro] = useState('');
  const [fotoOrigem, setFotoOrigem] = useState<number | null>(null);
  const [urlFoto, setUrlFoto] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processarImagem = async (src: string, pesoOriginal: number) => {
    setFotoProcessando(true);
    setFotoErro('');
    try {
      const dataUrl = await comprimirImagem(src);
      setFotoDataUrl(dataUrl);
      setFotoPreview(dataUrl);
      setFotoRemovida(false);
      setFotoOrigem(pesoOriginal > 0 ? pesoOriginal : null);
    } catch (e) {
      setFotoErro(e instanceof Error ? e.message : 'Erro ao processar imagem');
    } finally {
      setFotoProcessando(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setFotoPreview(objectUrl);
    void processarImagem(objectUrl, file.size);
    e.target.value = '';
  };

  const carregarUrl = () => {
    const url = urlFoto.trim();
    if (!url) return;
    void processarImagem(url, 0);
  };

  const removerFoto = () => {
    setFotoPreview(null);
    setFotoDataUrl(null);
    setFotoRemovida(true);
    setFotoOrigem(null);
  };

  const onFormSubmit = (data: ProdutoVendaInput) => {
    const fotoPayload: FotoPayload = fotoRemovida
      ? { remover: true }
      : fotoDataUrl
        ? { dataUrl: fotoDataUrl }
        : {};
    onSubmit(data as ProdutoVenda, Object.keys(fotoPayload).length > 0 ? fotoPayload : undefined);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus {...field} />
        )}
      />
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descrição" error={errors.descricao?.message} {...field} />
        )}
      />
      <Controller
        name="preco"
        control={control}
        render={({ field }) => (
          <Input
            label="Preço (R$) *"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.preco?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
            }}
          />
        )}
      />
      <Controller
        name="produto_fabricado_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Produto Fabricado de Origem</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              onClear={() => field.onChange(null)}
              options={produtosFabricados.map((p) => ({ value: (p.id ?? p.codigo)!, label: p.nome }))}
              title="Selecionar Produto Fabricado"
              placeholder="Sem origem (produto independente)"
            />
          </div>
        )}
      />
      <div className="space-y-2 rounded-lg border border-border-primary p-3">
        <label className="label-field">Foto do Produto</label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={14} /> Computador
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
          <input
            type="text"
            className="input-field flex-1 min-w-[140px] text-sm"
            placeholder="ou cole o link da imagem (online)"
            value={urlFoto}
            onChange={(e) => setUrlFoto(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={carregarUrl}>
            Carregar
          </Button>
          {fotoPreview && (
            <Button type="button" variant="danger" onClick={removerFoto}>
              <Trash2 size={14} /> Remover
            </Button>
          )}
        </div>
        {fotoProcessando && <p className="text-xs text-text-tertiary">Processando imagem...</p>}
        {fotoOrigem != null && fotoOrigem > 300 * 1024 && (
          <p className="text-xs text-accent-red">
            Imagem grande ({formatBytes(fotoOrigem)}). A foto sera otimizada automaticamente ao salvar.
          </p>
        )}
        {fotoErro && <p className="text-xs text-accent-red">{fotoErro}</p>}
        {fotoPreview && (
          <div className="flex items-center gap-3">
            <img src={fotoPreview} alt="Foto do produto" className="h-24 w-24 rounded-lg border border-border-subtle object-contain bg-bg-muted" />
            <div className="text-xs text-text-tertiary space-y-0.5">
              <p>Foto carregada com sucesso.</p>
              {fotoDataUrl && <p>Peso final: {formatBytes(dataUrlPeso(fotoDataUrl))}</p>}
            </div>
          </div>
        )}
      </div>
      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="ativo" className="text-sm text-text-secondary">Ativo</label>
          </div>
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
