import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { Modulo, Formulario } from '@/types';

interface ModuloFormularioFormProps {
  onSubmit: (data: { modulo_id: number; formularios: number[]; abertura?: number }) => void;
  onCancel: () => void;
  modulos: Modulo[];
  formularios: Formulario[];
  initialFormularios?: number[];
  initialModuloId?: number;
  initialAbertura?: number;
}

export function ModuloFormularioForm({ onSubmit, onCancel, modulos, formularios, initialFormularios, initialModuloId, initialAbertura }: ModuloFormularioFormProps) {
  const [moduloId, setModuloId] = useState(initialModuloId || 0);
  const [selectedFormularios, setSelectedFormularios] = useState<number[]>(initialFormularios || []);
  const [abertura, setAbertura] = useState<number>(initialAbertura || 0);

  useEffect(() => {
    if (initialFormularios) setSelectedFormularios(initialFormularios);
    if (initialModuloId) setModuloId(initialModuloId);
    if (initialAbertura) setAbertura(initialAbertura);
  }, [initialFormularios, initialModuloId, initialAbertura]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ modulo_id: moduloId, formularios: selectedFormularios, abertura: abertura || undefined }); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Modulo *</label>
        <select
          value={moduloId || ''}
          onChange={(e) => setModuloId(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-background-primary text-text-primary outline-none focus:border-accent-primary transition-colors"
        >
          <option value="">Selecione um modulo</option>
          {modulos.map((m) => (
            <option key={m.id ?? m.codigo} value={m.id ?? m.codigo}>{m.nome}</option>
          ))}
        </select>
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
                    if (checked) {
                      setSelectedFormularios((prev) => prev.filter((x) => x !== fid));
                      if (abertura === fid) setAbertura(0);
                    } else {
                      setSelectedFormularios((prev) => [...prev, fid!]);
                    }
                  }}
                  className="rounded border-border-subtle"
                />
                <span className="text-sm text-text-primary flex-1">{f.nome}</span>
                {checked && (
                  <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="radio"
                      name="abertura"
                      checked={abertura === fid}
                      onChange={() => setAbertura(fid!)}
                      className="w-3.5 h-3.5 text-accent-primary"
                    />
                    Abertura
                  </label>
                )}
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
