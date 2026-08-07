import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { empresaSchema, type EmpresaInput } from '@/schemas';
import { formatCpfCnpj, formatPhone, formatCelular } from '@/lib/utils';
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
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input label="Email" error={errors.email?.message} type="email" {...field} />
        )}
      />

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
