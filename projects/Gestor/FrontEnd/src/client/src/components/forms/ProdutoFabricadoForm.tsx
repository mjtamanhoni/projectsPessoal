import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, ImageIcon, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { ProdutoFabricado } from '@/types';
import { useRef, useState } from 'react';
import { formatCurrencyInput, parseCurrencyInput, fotoUrl } from '@/lib/utils';
import { getDecimalPlaces } from '@/lib/settings';

export interface FotoPayload {
  dataUrl?: string;
  remover?: boolean;
}

const produtoFabricadoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional().or(z.literal('')),
  rendimento: z.union([z.number().positive('Rendimento deve ser maior que zero'), z.literal(''), z.undefined()]).optional(),
  unidade_medida: z.string().min(1, 'Unidade de medida e obrigatoria'),
  custo_unitario: z.union([z.number().min(0), z.literal(''), z.undefined()]).optional(),
  margem_lucro: z.union([z.number().min(0, 'Margem de lucro nao pode ser negativa'), z.literal(''), z.undefined()]).optional(),
  valor_venda_sugerido: z.union([z.number().min(0), z.literal(''), z.undefined()]).optional(),
  preco: z.union([z.number().min(0), z.literal(''), z.undefined()]).optional(),
  ativo: z.boolean().optional(),
});

type ProdutoFabricadoInput = z.infer<typeof produtoFabricadoSchema>;

const UNIDADES_MEDIDA = [
  { value: 'kg', label: 'kg' },
  { value: 'L', label: 'L' },
  { value: 'un', label: 'un' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
];

interface ProdutoFabricadoFormProps {
  onSubmit: (data: ProdutoFabricado, foto?: FotoPayload) => void;
  onCancel: () => void;
  initial?: ProdutoFabricado | null;
}

function formatDecimal(value: number, dp: number): string {
  return value.toFixed(dp).replace('.', ',');
}

function parseDecimal(raw: string): number {
  return parseFloat(raw.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

function filterDecimal(raw: string): string {
  return raw.replace(/[^0-9,]/g, '');
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

const DP_6 = 6;
const DP_2 = 2;

export function ProdutoFabricadoForm({ onSubmit, onCancel, initial }: ProdutoFabricadoFormProps) {
  const dp = getDecimalPlaces();

  const { handleSubmit, formState: { errors }, control, setValue } = useForm<ProdutoFabricadoInput>({
    resolver: zodResolver(produtoFabricadoSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      descricao: initial.descricao || '',
      rendimento: initial.rendimento ?? '' as unknown as number,
      unidade_medida: initial.unidade_medida || '',
      custo_unitario: initial.custo_unitario ?? '' as unknown as number,
      margem_lucro: initial.margem_lucro ?? '' as unknown as number,
      valor_venda_sugerido: initial.valor_venda_sugerido ?? '' as unknown as number,
      preco: initial.preco ?? '' as unknown as number,
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      descricao: '',
      rendimento: '' as unknown as number,
      unidade_medida: '',
      custo_unitario: '' as unknown as number,
      margem_lucro: '' as unknown as number,
      valor_venda_sugerido: '' as unknown as number,
      preco: '' as unknown as number,
      ativo: true,
    },
  });

  const [rendRaw, setRendRaw] = useState(() =>
    initial?.rendimento != null ? formatDecimal(Number(initial.rendimento), DP_6) : ''
  );
  const [cuRaw, setCuRaw] = useState(() =>
    initial?.custo_unitario != null ? formatCurrencyInput(Number(initial.custo_unitario).toFixed(DP_2)) : ''
  );
  const [mlRaw, setMlRaw] = useState(() =>
    initial?.margem_lucro != null ? formatDecimal(Number(initial.margem_lucro), DP_2) : ''
  );
  const [vvsRaw, setVvsRaw] = useState(() =>
    initial?.valor_venda_sugerido != null ? formatCurrencyInput(Number(initial.valor_venda_sugerido).toFixed(DP_2)) : ''
  );
  const [precoRaw, setPrecoRaw] = useState(() =>
    initial?.preco != null ? formatCurrencyInput(Number(initial.preco).toFixed(DP_2)) : ''
  );

  const [fotoPreview, setFotoPreview] = useState<string | null>(
    initial?.foto ? fotoUrl(initial.foto) : null
  );
  const [fotoOrigem, setFotoOrigem] = useState<number | null>(null);
  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);
  const [fotoProcessando, setFotoProcessando] = useState(false);
  const [fotoErro, setFotoErro] = useState('');
  const [urlFoto, setUrlFoto] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calcValorVenda = (custo: number, margem: number) => {
    if (custo > 0 && margem >= 0) {
      const sugerido = parseFloat((custo * (1 + margem / 100)).toFixed(DP_2));
      setValue('valor_venda_sugerido', sugerido as unknown as undefined);
      setVvsRaw(formatCurrencyInput(String(Math.round(sugerido * 100))));
    }
  };

  const calcMargemLucro = (custo: number, venda: number) => {
    if (custo > 0 && venda > 0) {
      const margem = parseFloat((((venda / custo) - 1) * 100).toFixed(DP_2));
      setValue('margem_lucro', margem as unknown as undefined);
      setMlRaw(formatDecimal(margem, DP_2));
    }
  };

  const onFormSubmit = (data: ProdutoFabricadoInput) => {
    const fotoPayload: FotoPayload = fotoRemovida
      ? { remover: true }
      : fotoDataUrl
        ? { dataUrl: fotoDataUrl }
        : {};
    onSubmit(data as ProdutoFabricado, Object.keys(fotoPayload).length > 0 ? fotoPayload : undefined);
  };

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

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} {...field} />
        )}
      />
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Descricao</label>
            <textarea className="input-field min-h-[80px]" {...field} />
          </div>
        )}
      />
      <Controller
        name="rendimento"
        control={control}
        render={({ field }) => (
          <Input
            label="Rendimento"
            type="text"
            inputMode="decimal"
            placeholder={'0,' + '0'.repeat(dp)}
            error={errors.rendimento?.message}
            value={rendRaw}
            onChange={(e) => {
              const raw = filterDecimal(e.target.value);
              setRendRaw(raw);
              const num = parseDecimal(raw);
              if (num > 0) {
                field.onChange(num);
              }
            }}
            onBlur={() => {
              if (!rendRaw) { field.onChange(undefined as unknown as undefined); return; }
              const num = parseDecimal(rendRaw);
              if (num > 0) {
                field.onChange(num);
                setRendRaw(formatDecimal(num, DP_6));
              }
            }}
          />
        )}
      />
      <Controller
        name="unidade_medida"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Unidade de Medida *</label>
            <select className="input-field" {...field}>
              <option value="">Selecione...</option>
              {UNIDADES_MEDIDA.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            {errors.unidade_medida && (
              <p className="text-xs text-accent-red mt-1">{errors.unidade_medida.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="custo_unitario"
        control={control}
        render={({ field }) => (
          <Input
            label="Custo Unitario"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.custo_unitario?.message}
            value={cuRaw}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setCuRaw(formatted);
              const num = parseCurrencyInput(formatted);
              if (num > 0) {
                field.onChange(num);
                const margem = parseDecimal(mlRaw);
                calcValorVenda(num, margem);
              }
            }}
            onBlur={() => {
              if (!cuRaw) { field.onChange(undefined as unknown as undefined); return; }
              const num = parseCurrencyInput(cuRaw);
              if (num > 0) {
                field.onChange(num);
                setCuRaw(formatCurrencyInput(String(Math.round(num * 100))));
              }
            }}
          />
        )}
      />
      <Controller
        name="margem_lucro"
        control={control}
        render={({ field }) => (
          <Input
            label="Margem de Lucro (%)"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.margem_lucro?.message}
            value={mlRaw}
            onChange={(e) => {
              const raw = filterDecimal(e.target.value);
              setMlRaw(raw);
              const num = parseDecimal(raw);
              if (num > 0 || raw === '') {
                field.onChange(num > 0 ? num : ('' as unknown as number));
                const custo = parseCurrencyInput(cuRaw);
                calcValorVenda(custo, num);
              }
            }}
            onBlur={() => {
              if (!mlRaw) { field.onChange(undefined as unknown as undefined); return; }
              const num = parseDecimal(mlRaw);
              if (num > 0) {
                field.onChange(num);
                setMlRaw(formatDecimal(num, DP_2));
              }
            }}
          />
        )}
      />
      <Controller
        name="valor_venda_sugerido"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor Venda Sugerido"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.valor_venda_sugerido?.message}
            value={vvsRaw}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setVvsRaw(formatted);
              const num = parseCurrencyInput(formatted);
              if (num > 0) {
                field.onChange(num);
                const custo = parseCurrencyInput(cuRaw);
                calcMargemLucro(custo, num);
              }
            }}
            onBlur={() => {
              if (!vvsRaw) { field.onChange(undefined as unknown as undefined); return; }
              const num = parseCurrencyInput(vvsRaw);
              if (num > 0) {
                field.onChange(num);
                setVvsRaw(formatCurrencyInput(String(Math.round(num * 100))));
              }
            }}
          />
        )}
      />
      <Controller
        name="preco"
        control={control}
        render={({ field }) => (
          <Input
            label="Preco (usado nos cards de venda/encomenda)"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.preco?.message}
            value={precoRaw}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setPrecoRaw(formatted);
              const num = parseCurrencyInput(formatted);
              if (num > 0) {
                field.onChange(num);
              }
            }}
            onBlur={() => {
              if (!precoRaw) { field.onChange(undefined as unknown as undefined); return; }
              const num = parseCurrencyInput(precoRaw);
              if (num > 0) {
                field.onChange(num);
                setPrecoRaw(formatCurrencyInput(String(Math.round(num * 100))));
              }
            }}
          />
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