import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { empresaSchema, type EmpresaInput } from '@/schemas';
import { formatCpfCnpj, formatPhone, formatCelular } from '@/lib/utils';
import { getUploadsUrl } from '@/lib/empresaLogo';
import type { Empresa } from '@/types';

interface EmpresaFormProps {
  onSubmit: (data: Empresa) => void;
  onCancel: () => void;
  initial?: Empresa | null;
}

export function EmpresaForm({ onSubmit, onCancel, initial }: EmpresaFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<EmpresaInput>({
    resolver: zodResolver(empresaSchema),
    defaultValues: initial ? {
      razao_social: initial.razao_social || '',
      fantasia: initial.fantasia || '',
      cnpj_cpf: initial.cnpj_cpf || '',
      inscricao_estadual_identidade: initial.inscricao_estadual_identidade || '',
      regime_tributario: initial.regime_tributario || '',
      endereco: initial.endereco || '',
      telefone: initial.telefone || '',
      celular: initial.celular || '',
      email: initial.email || '',
      chave_pix: initial.chave_pix || '',
      delivery: initial.delivery ?? 0,
    } : {
      razao_social: '',
      fantasia: '',
      cnpj_cpf: '',
      inscricao_estadual_identidade: '',
      regime_tributario: '',
      endereco: '',
      telefone: '',
      celular: '',
      email: '',
      chave_pix: '',
      delivery: 0,
    },
  });

  const [logoNova, setLogoNova] = useState<string | null>(null);
  const [logoRemovida, setLogoRemovida] = useState(false);
  const logoAtualUrl = getUploadsUrl(initial?.logomarca);
  const logoPreview = logoNova ?? (logoRemovida ? null : logoAtualUrl);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoNova(reader.result as string);
      setLogoRemovida(false);
    };
    reader.readAsDataURL(file);
  };

  const finalizar = (values: EmpresaInput) => {
    let data = values as Empresa;
    if (logoNova !== null || logoRemovida) {
      data = { ...data, logomarca: logoNova ?? '' };
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(finalizar)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="razao_social"
          control={control}
          render={({ field }) => (
            <Input label="Razao Social *" error={errors.razao_social?.message} autoFocus {...field} />
          )}
        />
        <Controller
          name="fantasia"
          control={control}
          render={({ field }) => (
            <Input label="Fantasia" error={errors.fantasia?.message} {...field} />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="cnpj_cpf"
          control={control}
          render={({ field }) => (
            <Input
              label="CNPJ/CPF"
              error={errors.cnpj_cpf?.message}
              placeholder="CPF ou CNPJ"
              {...field}
              onChange={(e) => {
                field.onChange(formatCpfCnpj(e.target.value));
              }}
            />
          )}
        />
        <Controller
          name="inscricao_estadual_identidade"
          control={control}
          render={({ field }) => (
            <Input label="Inscricao Estadual/Identidade" error={errors.inscricao_estadual_identidade?.message} {...field} />
          )}
        />
      </div>
      <Controller
        name="regime_tributario"
        control={control}
        render={({ field }) => (
          <Input label="Regime Tributario" error={errors.regime_tributario?.message} {...field} />
        )}
      />
      <Controller
        name="endereco"
        control={control}
        render={({ field }) => (
          <Input label="Endereco" error={errors.endereco?.message} {...field} />
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="telefone"
          control={control}
          render={({ field }) => (
            <Input
              label="Telefone"
              error={errors.telefone?.message}
              placeholder="(XX) XXXX-XXXX"
              {...field}
              onChange={(e) => {
                field.onChange(formatPhone(e.target.value));
              }}
            />
          )}
        />
        <Controller
          name="celular"
          control={control}
          render={({ field }) => (
            <Input
              label="Celular"
              error={errors.celular?.message}
              placeholder="(XX) XXXXX-XXXX"
              {...field}
              onChange={(e) => {
                field.onChange(formatCelular(e.target.value));
              }}
            />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input label="Email" error={errors.email?.message} type="email" {...field} />
          )}
        />
        <Controller
          name="chave_pix"
          control={control}
          render={({ field }) => (
            <Input
              label="Chave PIX"
              error={errors.chave_pix?.message}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria"
              {...field}
            />
          )}
        />
      </div>

      <div>
        <label className="label-field">Empresa de delivery?</label>
        <Controller
          name="delivery"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              {[0, 1].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => field.onChange(v)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    field.value === v
                      ? 'bg-accent-primary text-white border-transparent'
                      : 'bg-transparent text-text-secondary border-border-subtle hover:border-accent-primary'
                  }`}
                >
                  {v === 1 ? 'Sim' : 'Nao'}
                </button>
              ))}
            </div>
          )}
        />
        <p className="text-xs text-text-secondary mt-1">
          Indica se a empresa atua no ramo de delivery (1-Sim / 0-Nao).
        </p>
      </div>

      <div>
        <label className="label-field">Logomarca</label>
        <div className="flex flex-wrap items-center gap-4">
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logomarca"
              className="max-h-16 max-w-40 object-contain border border-border-subtle rounded-lg p-2"
            />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoFile}
            className="block text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-hover cursor-pointer"
          />
          {logoPreview && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLogoNova(null);
                setLogoRemovida(true);
              }}
            >
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Usada no sistema e nos relatorios em PDF. Salva com o nome da empresa.
        </p>
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}