import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { formatCpfCnpj, formatPhone, formatCelular, formatCep } from '@/lib/utils';
import { buscarCep } from '@/lib/api';
import { clienteSchema, type ClienteInput } from '@/schemas';
import type { Cliente } from '@/types';

interface ClienteFormProps {
  onSubmit: (data: Cliente) => void;
  onCancel: () => void;
  initial?: Cliente | null;
}

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export function ClienteForm({ onSubmit, onCancel, initial }: ClienteFormProps) {
  const [buscandoCep, setBuscandoCep] = useState(false);

  const { handleSubmit, formState: { errors }, control, setValue } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      cpf_cnpj: initial.cpf_cnpj || (initial as unknown as { cnpj_cpf?: string }).cnpj_cpf || '',
      telefone: initial.telefone || '',
      celular: initial.celular || '',
      nr: initial.nr || '',
      complemento: initial.complemento || '',
      bairro: initial.bairro || '',
      cidade: initial.cidade || '',
      uf: initial.uf || '',
      cep: initial.cep || '',
      endereco: initial.endereco || '',
      email: initial.email || '',
    } : {
      nome: '',
      cpf_cnpj: '',
      telefone: '',
      celular: '',
      nr: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      endereco: '',
      email: '',
    },
  });

  const handleCepBlur = async (cepValue: string) => {
    const nums = cepValue.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setBuscandoCep(true);
    try {
      const result = await buscarCep(cepValue);
      if (result) {
        if (result.logradouro) setValue('endereco', result.logradouro, { shouldValidate: true });
        if (result.bairro) setValue('bairro', result.bairro, { shouldValidate: true });
        if (result.localidade) setValue('cidade', result.localidade, { shouldValidate: true });
        if (result.uf) setValue('uf', result.uf, { shouldValidate: true });
      }
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input 
            label="Nome *" 
            error={errors.nome?.message} 
            autoFocus 
            {...field} 
          />
        )}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="cpf_cnpj"
          control={control}
          render={({ field }) => (
            <Input
              label="CPF/CNPJ *"
              error={errors.cpf_cnpj?.message}
              placeholder="CPF ou CNPJ"
              {...field}
              onChange={(e) => {
                field.onChange(formatCpfCnpj(e.target.value));
              }}
            />
          )}
        />
        <Controller
          name="telefone"
          control={control}
          render={({ field }) => (
            <Input 
              label="Telefone" 
              placeholder="(XX) XXXX-XXXX"
              {...field}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                field.onChange(formatted);
              }}
            />
          )}
        />
      </div>
      
      <Controller
        name="celular"
        control={control}
        render={({ field }) => (
          <Input 
            label="Celular" 
            placeholder="(XX) XXXXX-XXXX"
            {...field}
            onChange={(e) => {
              const formatted = formatCelular(e.target.value);
              field.onChange(formatted);
            }}
          />
        )}
      />

      <div className="grid grid-cols-[140px_1fr] gap-4">
        <Controller
          name="cep"
          control={control}
          render={({ field }) => (
            <Input
              label="CEP"
              placeholder="00000-000"
              {...field}
              onChange={(e) => {
                field.onChange(formatCep(e.target.value));
              }}
              onBlur={() => handleCepBlur(field.value || '')}
            />
          )}
        />
        <Controller
          name="endereco"
          control={control}
          render={({ field }) => (
            <Input label="Endereco" placeholder={buscandoCep ? 'Buscando endereço...' : ''} {...field} />
          )}
        />
      </div>

      <Controller
        name="complemento"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Complemento</label>
            <textarea
              className="flex w-full rounded-md border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-primary resize-none"
              rows={3}
              placeholder="Complemento do endereço"
              {...field}
            />
          </div>
        )}
      />

      <div className="grid grid-cols-[100px_1fr] gap-4">
        <Controller
          name="nr"
          control={control}
          render={({ field }) => (
            <Input label="Número" {...field} />
          )}
        />
        <Controller
          name="bairro"
          control={control}
          render={({ field }) => (
            <Input label="Bairro" {...field} />
          )}
        />
      </div>

      <div className="grid grid-cols-[1fr_80px] gap-4">
        <Controller
          name="cidade"
          control={control}
          render={({ field }) => (
            <Input label="Cidade" {...field} />
          )}
        />
        <Controller
          name="uf"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">UF</label>
              <select
                className="flex h-9 w-full rounded-md border border-border-primary bg-background-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                {...field}
              >
                <option value="">UF</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          )}
        />
      </div>

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input label="Email" type="email" error={errors.email?.message} {...field} />
        )}
      />
      
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
