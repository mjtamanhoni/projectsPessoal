import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import type { Modulo, Formulario } from '@/types';

interface ModuloFormularioFormProps {
  onSubmit: (data: { modulo_id: number; formularios: number[] }) => void;
  onCancel: () => void;
  modulos: Modulo[];
  formularios: Formulario[];
  initialFormularios?: number[];
  initialModuloId?: number;
}

export function ModuloFormularioForm({ onSubmit, onCancel, modulos, formularios, initialFormularios, initialModuloId }: ModuloFormularioFormProps) {
  const [moduloId, setModuloId] = useState(initialModuloId || 0);
  const [selectedFormularios, setSelectedFormularios] = useState<number[]>(initialFormularios || []);

  useEffect(() => {
    if (initialFormularios) setSelectedFormularios(initialFormularios);
    if (initialModuloId) setModuloId(initialModuloId);
  }, [initialFormularios, initialModuloId]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ modulo_id: moduloId, formularios: selectedFormularios }); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Modulo *</label>
        <RegistroSelect<number>
          value={moduloId || null}
          onChange={setModuloId}
          options={modulos.map((m) => ({ value: (m.id ?? m.codigo)!, label: m.nome }))}
          title="Selecionar Modulo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Formularios *</label>
        <div className="max-h-60 overflow-y-auto border border-border-primary rounded-lg p-3 space-y-1">
          {formularios.map((f) => {
            const fid = f.id ?? f.codigo;
            const checked = selectedFormularios.includes(fid!);
            return (
              <label key={fid} className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) setSelectedFormularios((prev) => prev.filter((x) => x !== fid));
                    else setSelectedFormularios((prev) => [...prev, fid!]);
                  }}
                  className="rounded border-border-subtle"
                />
                <span className="text-sm text-text-primary flex-1">{f.nome}</span>
              </label>
            );
          })}
          {formularios.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhum formulario disponivel</p>
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
