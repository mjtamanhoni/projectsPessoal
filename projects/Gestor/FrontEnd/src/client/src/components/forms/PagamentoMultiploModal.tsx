import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, Trash2, Banknote, CreditCard, Smartphone } from 'lucide-react';
import type { FormaPagamento, BandeiraCartao, EncomendaPagamento } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PagamentoMultiploModalProps {
  isOpen: boolean;
  onFechar: () => void;
  onConfirmar: (pagamentos: EncomendaPagamento[]) => void;
  valorTotal: number;
  formasPagamento: FormaPagamento[];
  bandeirasCartao: BandeiraCartao[];
  pagamentosIniciais?: EncomendaPagamento[];
}

interface PagamentoRow {
  key: string;
  forma_pagamento_id: number | null;
  forma_pagamento_nome: string;
  forma_pagamento_classificacao: string;
  bandeira_cartao_id: number | null;
  bandeira_cartao_nome: string;
  valor: number;
  troco_para: number;
}

function gerarKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function getIconeClassificacao(classificacao: string) {
  switch (classificacao) {
    case 'DINHEIRO':
      return <Banknote size={16} className="text-green-600" />;
    case 'CARTAO_CREDITO':
    case 'CARTAO_DEBITO':
      return <CreditCard size={16} className="text-purple-600" />;
    case 'PIX':
      return <Smartphone size={16} className="text-blue-600" />;
    default:
      return null;
  }
}

export function PagamentoMultiploModal({
  isOpen,
  onFechar,
  onConfirmar,
  valorTotal,
  formasPagamento,
  bandeirasCartao,
  pagamentosIniciais = [],
}: PagamentoMultiploModalProps) {
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [trocoPara, setTrocoPara] = useState<number | null>(null);
  const [perguntarTroco, setPerguntarTroco] = useState(false);
  const [valorExcedente, setValorExcedente] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (pagamentosIniciais.length > 0) {
        setPagamentos(
          pagamentosIniciais.map((p) => ({
            key: gerarKey(),
            forma_pagamento_id: p.forma_pagamento_id ?? null,
            forma_pagamento_nome: p.forma_pagamento_nome ?? '',
            forma_pagamento_classificacao: p.forma_pagamento_classificacao ?? '',
            bandeira_cartao_id: p.bandeira_cartao_id ?? null,
            bandeira_cartao_nome: p.bandeira_cartao_nome ?? '',
            valor: p.valor ?? 0,
            troco_para: p.troco_para ?? 0,
          }))
        );
      } else {
        const valorRestante = valorTotal;
        setPagamentos([
          {
            key: gerarKey(),
            forma_pagamento_id: null,
            forma_pagamento_nome: '',
            forma_pagamento_classificacao: '',
            bandeira_cartao_id: null,
            bandeira_cartao_nome: '',
            valor: valorRestante,
            troco_para: 0,
          },
        ]);
      }
      setTrocoPara(null);
      setPerguntarTroco(false);
      setValorExcedente(0);
    }
  }, [isOpen, pagamentosIniciais, valorTotal]);

  const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const valorRestante = valorTotal - totalPago;

  const adicionarPagamento = () => {
    setPagamentos((prev) => [
      ...prev,
      {
        key: gerarKey(),
        forma_pagamento_id: null,
        forma_pagamento_nome: '',
        forma_pagamento_classificacao: '',
        bandeira_cartao_id: null,
        bandeira_cartao_nome: '',
        valor: Math.max(0, valorRestante),
        troco_para: 0,
      },
    ]);
  };

  const removerPagamento = (key: string) => {
    setPagamentos((prev) => prev.filter((p) => p.key !== key));
  };

  const atualizarPagamento = (key: string, campo: string, valor: unknown) => {
    setPagamentos((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        const atualizado = { ...p, [campo]: valor };

        if (campo === 'forma_pagamento_id') {
          const fp = formasPagamento.find((f) => (f.id ?? f.codigo) === valor);
          atualizado.forma_pagamento_nome = fp?.descricao ?? '';
          atualizado.forma_pagamento_classificacao = fp?.classificacao ?? '';
          if (fp?.classificacao !== 'CARTAO_CREDITO' && fp?.classificacao !== 'CARTAO_DEBITO') {
            atualizado.bandeira_cartao_id = null;
            atualizado.bandeira_cartao_nome = '';
          }
        }

        if (campo === 'bandeira_cartao_id') {
          const bc = bandeirasCartao.find((b) => (b.id ?? b.codigo) === valor);
          atualizado.bandeira_cartao_nome = bc?.nome ?? '';
        }

        return atualizado;
      })
    );
  };

  const isDinheiro = (p: PagamentoRow) => p.forma_pagamento_classificacao === 'DINHEIRO';

  const temDinheiro = pagamentos.some(isDinheiro);

  const podeConfirmar = () => {
    if (totalPago < valorTotal) return false;
    if (totalPago > valorTotal && !temDinheiro) return false;
    const todosDefinidos = pagamentos.every((p) => p.forma_pagamento_id && p.valor > 0);
    return todosDefinidos;
  };

  const handleConfirmar = () => {
    if (totalPago > valorTotal && temDinheiro) {
      setValorExcedente(totalPago - valorTotal);
      setPerguntarTroco(true);
      return;
    }
    onConfirmar(
      pagamentos.map((p) => ({
        forma_pagamento_id: p.forma_pagamento_id ?? undefined,
        forma_pagamento_nome: p.forma_pagamento_nome,
        bandeira_cartao_id: p.bandeira_cartao_id ?? undefined,
        bandeira_cartao_nome: p.bandeira_cartao_nome,
        valor: p.valor,
        troco_para: isDinheiro(p) ? p.troco_para : undefined,
      }))
    );
  };

  const confirmarTroco = (querTroco: boolean) => {
    setPerguntarTroco(false);
    if (querTroco) {
      const pagamentoDinheiro = pagamentos.find(isDinheiro);
      if (pagamentoDinheiro) {
        atualizarPagamento(pagamentoDinheiro.key, 'troco_para', pagamentoDinheiro.valor);
      }
    }
    onConfirmar(
      pagamentos.map((p) => ({
        forma_pagamento_id: p.forma_pagamento_id ?? undefined,
        forma_pagamento_nome: p.forma_pagamento_nome,
        bandeira_cartao_id: p.bandeira_cartao_id ?? undefined,
        bandeira_cartao_nome: p.bandeira_cartao_nome,
        valor: p.valor,
        troco_para: isDinheiro(p) ? (querTroco ? p.valor : 0) : undefined,
      }))
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onFechar} title="Pagamento" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent-primary/10">
          <span className="text-sm font-medium text-text-secondary">Valor Total</span>
          <span className="text-lg font-bold text-accent-primary">{formatCurrency(valorTotal)}</span>
        </div>

        <div className="space-y-3">
          {pagamentos.map((pagamento, idx) => {
            const fp = formasPagamento.find((f) => (f.id ?? f.codigo) === pagamento.forma_pagamento_id);
            const isCartao = pagamento.forma_pagamento_classificacao === 'CARTAO_CREDITO' || pagamento.forma_pagamento_classificacao === 'CARTAO_DEBITO';
            const parcelas = fp?.classificacao === 'CARTAO_CREDITO' ? 1 : undefined;

            return (
              <div key={pagamento.key} className="border border-border-primary rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIconeClassificacao(pagamento.forma_pagamento_classificacao)}
                    <span className="text-xs font-medium text-text-muted">
                      Pagamento {idx + 1}
                    </span>
                  </div>
                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerPagamento(pagamento.key)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-accent-red" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Forma de Pagamento *</label>
                    <RegistroSelect<number>
                      value={pagamento.forma_pagamento_id}
                      onChange={(val) => atualizarPagamento(pagamento.key, 'forma_pagamento_id', val)}
                      options={formasPagamento.map((f) => ({ value: (f.id ?? f.codigo)!, label: f.descricao }))}
                      title="Selecionar Forma"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field w-full text-sm"
                      value={pagamento.valor || ''}
                      onChange={(e) => atualizarPagamento(pagamento.key, 'valor', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {isCartao && (
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Bandeira do Cartao</label>
                    <RegistroSelect<number>
                      value={pagamento.bandeira_cartao_id}
                      onChange={(val) => atualizarPagamento(pagamento.key, 'bandeira_cartao_id', val)}
                      options={bandeirasCartao.map((b) => ({ value: (b.id ?? b.codigo)!, label: b.nome }))}
                      title="Selecionar Bandeira"
                    />
                  </div>
                )}

                {isDinheiro(pagamento) && (
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Troco para (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field w-full text-sm"
                      value={pagamento.troco_para || ''}
                      onChange={(e) => atualizarPagamento(pagamento.key, 'troco_para', parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 50.00"
                    />
                    {pagamento.troco_para > pagamento.valor && pagamento.valor > 0 && (
                      <p className="text-xs text-accent-red">
                        Troco: {formatCurrency(pagamento.troco_para - pagamento.valor)}
                      </p>
                    )}
                  </div>
                )}

                {parcelas && parcelas > 1 && (
                  <p className="text-xs text-text-muted">Parcelamento: {parcelas}x</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Total Pago:</span>
          <span className={`font-semibold ${totalPago >= valorTotal ? 'text-green-600' : 'text-accent-red'}`}>
            {formatCurrency(totalPago)}
          </span>
        </div>

        {valorRestante > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Falta:</span>
            <span className="font-semibold text-accent-red">{formatCurrency(valorRestante)}</span>
          </div>
        )}

        {totalPago > valorTotal && !temDinheiro && (
          <p className="text-xs text-accent-red bg-red-50 p-2 rounded">
            O total dos pagamentos excede o valor da encomenda e nao ha forma de pagamento em Dinheiro para troco.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={adicionarPagamento} className="flex-1">
            <Plus size={16} /> Adicionar Pagamento
          </Button>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar} disabled={!podeConfirmar()}>
            Confirmar Pagamento
          </Button>
        </div>
      </div>

      {perguntarTroco && (
        <Modal isOpen={perguntarTroco} onClose={() => setPerguntarTroco(false)} title="Troco" maxWidth="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              O valor pago ({formatCurrency(totalPago)}) excede o total da encomenda ({formatCurrency(valorTotal)}).
              Diferenca: <strong>{formatCurrency(valorExcedente)}</strong>
            </p>
            <p className="text-sm text-text-secondary">O cliente deseja receber esta diferenca como troco?</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => confirmarTroco(false)}>
                Nao (Pagamento = Total)
              </Button>
              <Button type="button" onClick={() => confirmarTroco(true)}>
                Sim (Valor Pago)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
