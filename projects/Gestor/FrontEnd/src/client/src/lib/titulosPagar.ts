import { isOverdue } from './utils';
import type { TituloPagar } from '@/types';

export function statusDoTitulo(titulo: TituloPagar): { label: string; className: string } {
  if (titulo.status === 'QUITADO') return { label: 'Baixado', className: 'pago' };
  if (titulo.status === 'PARCIAL') return { label: 'Parcial', className: 'parcial' };
  if (titulo.status === 'CANCELADO') return { label: 'Cancelado', className: 'cancelado' };
  if (isOverdue(titulo.dataVencimento)) return { label: 'Atrasado', className: 'atrasado' };
  return { label: 'Pendente', className: 'pendente' };
}

export function saldoDoTitulo(titulo: TituloPagar): number {
  const saldo = titulo.saldoDevedor;
  if (saldo !== undefined && saldo !== null) return Number(saldo);
  return Number(titulo.valorTotal ?? 0) - Number(titulo.totalPago ?? 0);
}

export function tituloEmAberto(titulo: TituloPagar): boolean {
  const status = (titulo.status || '').toUpperCase();
  return status !== 'QUITADO' && status !== 'CANCELADO' && saldoDoTitulo(titulo) > 0.005;
}

export function tituloAtrasado(titulo: TituloPagar): boolean {
  return tituloEmAberto(titulo) && isOverdue(titulo.dataVencimento);
}
