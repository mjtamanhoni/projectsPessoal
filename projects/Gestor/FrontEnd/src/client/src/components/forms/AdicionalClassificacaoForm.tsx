import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import type { ProdutoClassificacao, AdicionalProdutoClassificacao } from '@/types';

interface AdicionalClassificacaoFormProps {
  onSubmit: (classificacaoId: number) => void;
  onCancel: () => void;
  classificacoes: ProdutoClassificacao[];
  linksExistentes: AdicionalProdutoClassificacao[];
  initial?: AdicionalProdutoClassificacao | null;
}

export function AdicionalClassificacaoForm({ onSubmit, onCancel, classificacoes, linksExistentes, initial }: AdicionalClassificacaoFormProps) {
  const [sel, setSel] = useState<number | null>(initial?.produto_classificacao_id ?? null);

  const linked = new Set(linksExistentes.map((l) => l.produto_classificacao_id));
  const opcoes = classificacoes
    .map((c) => ({ id: c.id ?? c.codigo, nome: c.nome, status: c.status }))
    .filter((c) => (c.status ?? 1) === 1 && c.id != null && (c.id === initial?.produto_classificacao_id || !linked.has(c.id)))
    .map((c) => ({ value: c.id as number, label: c.nome }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (sel !== null) onSubmit(sel);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label className="label-field">Classificação</label>
        <RegistroSelect<number>
          value={sel}
          onChange={setSel}
          onClear={() => setSel(null)}
          options={opcoes}
          title="Selecionar Classificação"
          placeholder="Selecione a classificação"
          disabled={opcoes.length === 0}
        />
        {opcoes.length === 0 && (
          <p className="text-xs text-text-tertiary">Nenhuma classificação disponível. Cadastre classificações na tela Classificação de Produtos.</p>
        )}
      </div>
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={sel === null}><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}