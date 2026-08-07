import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import type { Empresa, Modulo } from '@/types';

interface EmpresaModuloFormProps {
  onSubmit: (data: { empresa_id: number; modulos: number[] }) => void;
  onCancel: () => void;
  empresas: Empresa[];
  modulos: Modulo[];
  initialModulos?: number[];
  initialEmpresaId?: number;
}

export function EmpresaModuloForm({ onSubmit, onCancel, empresas, modulos, initialModulos, initialEmpresaId }: EmpresaModuloFormProps) {
  const [empresaId, setEmpresaId] = useState(initialEmpresaId || 0);
  const [selectedModulos, setSelectedModulos] = useState<number[]>(initialModulos || []);

  useEffect(() => {
    if (initialModulos) setSelectedModulos(initialModulos);
    if (initialEmpresaId) setEmpresaId(initialEmpresaId);
  }, [initialModulos, initialEmpresaId]);

  const toggleModulo = (id: number) => {
    setSelectedModulos((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ empresa_id: empresaId, modulos: selectedModulos }); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Empresa *</label>
        <RegistroSelect<number>
          value={empresaId || null}
          onChange={setEmpresaId}
          options={empresas.map((e) => ({ value: (e.id ?? e.codigo)!, label: e.razao_social }))}
          title="Selecionar Empresa"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Modulos *</label>
        <div className="max-h-60 overflow-y-auto border border-border-primary rounded-lg p-3 space-y-1">
          {modulos.map((m) => {
            const mid = m.id ?? m.codigo;
            return (
              <label key={mid} className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={selectedModulos.includes(mid!)}
                  onChange={() => mid && toggleModulo(mid)}
                  className="rounded border-border-subtle"
                />
                <span className="text-sm text-text-primary">{m.nome}</span>
              </label>
            );
          })}
          {modulos.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhum modulo disponivel</p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
