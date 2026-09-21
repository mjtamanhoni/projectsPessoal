import { Printer } from 'lucide-react';
import { imprimirCadastro, type PrintColumn, type SubRow } from '@/lib/cadastro-pdf';

interface PrintButtonProps {
  title: string;
  data: unknown[];
  columns: PrintColumn[];
  expandData?: (row: Record<string, unknown>) => SubRow | null;
  disabled?: boolean;
}

export function PrintButton({ title, data, columns, expandData, disabled }: PrintButtonProps) {
  return (
    <button
      onClick={() => imprimirCadastro(title, data, columns, expandData)}
      disabled={disabled || data.length === 0}
      className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={`Imprimir ${title}`}
    >
      <Printer size={18} className="text-text-secondary" />
    </button>
  );
}
