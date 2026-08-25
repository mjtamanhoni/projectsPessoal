import type {
  AdicionalPublico,
  EncomendaItem,
  IngredientePublico,
  ProdutoFabricado,
  ProdutoVendaItemPublico,
  ClassificacaoAdicionalPublico,
  ProdutoVendaPublico,
} from '../api';

export function parseJsonList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function ingredientesDoProduto(p: ProdutoFabricado): IngredientePublico[] {
  return parseJsonList(p.ingredientes).map((x) => {
    const o = x as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0) || undefined,
      insumo_id: Number(o.insumo_id ?? 0) || undefined,
      nome: String(o.nome ?? ''),
      quantidade: Number(o.quantidade ?? 0) || undefined,
    };
  });
}

function adicionaisDoProduto(p: ProdutoFabricado): AdicionalPublico[] {
  return parseJsonList(p.adicionais).map((x) => {
    const o = x as Record<string, unknown>;
    return {
      adicional_id: Number(o.adicional_id ?? 0),
      nome: String(o.nome ?? ''),
      descricao: o.descricao != null ? String(o.descricao) : undefined,
      preco: Number(o.preco ?? 0),
    };
  });
}

export interface CatalogoItem {
  chave: string;
  tipo: 'fabricado' | 'venda';
  id: number;
  nome: string;
  descricao?: string;
  foto?: string;
  preco: number;
  removiveis: string[];
  extras: AdicionalPublico[];
}

export function catalogoDeFabricado(p: ProdutoFabricado): CatalogoItem {
  const id = p.id ?? 0;
  return {
    chave: `f${id}`,
    tipo: 'fabricado',
    id,
    nome: p.nome,
    descricao: p.descricao,
    foto: p.foto,
    preco: Number(p.preco) || 0,
    removiveis: ingredientesDoProduto(p).map((i) => i.nome),
    extras: adicionaisDoProduto(p),
  };
}

export function catalogoDeVenda(pv: ProdutoVendaPublico): CatalogoItem {
  const id = pv.id ?? 0;
  const itens = parseJsonList(pv.itens) as ProdutoVendaItemPublico[];
  const classificacaoId = Number(pv.produto_classificacao_id ?? 0);
  const extras: AdicionalPublico[] =
    classificacaoId > 0
      ? (parseJsonList(pv.classificacao_adicionais) as ClassificacaoAdicionalPublico[]).map((a) => ({
          adicional_id: Number(a.adicional_id ?? 0),
          nome: String(a.nome ?? ''),
          descricao: a.descricao != null ? String(a.descricao) : undefined,
          preco: Number(a.preco ?? 0),
        }))
      : itens
          .filter((it) => it.pode_adicionar && Number(it.adicional_id ?? 0) > 0)
          .map((it) => ({
            adicional_id: Number(it.adicional_id),
            nome: String(it.adicional_nome || it.nome || ''),
            descricao: undefined,
            preco: Number(it.adicional_preco ?? 0),
          }));
  return {
    chave: `v${id}`,
    tipo: 'venda',
    id,
    nome: pv.nome,
    descricao: pv.descricao,
    foto: pv.foto,
    preco: Number(pv.preco) || 0,
    removiveis: itens.filter((it) => it.pode_remover).map((it) => String(it.nome ?? '')),
    extras,
  };
}

export function montarCatalogo(
  fabricados: ProdutoFabricado[],
  vendas: ProdutoVendaPublico[],
): CatalogoItem[] {
  return [...fabricados.map(catalogoDeFabricado), ...vendas.map(catalogoDeVenda)]
    .filter((c) => c.id > 0 && c.preco > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function chaveDeItem(i: EncomendaItem): string {
  return i.produto_venda_id ? `v${i.produto_venda_id}` : `f${i.produto_fabricado_id}`;
}

export function somaAdicionaisItem(item: EncomendaItem): number {
  return (item.adicionais ?? []).reduce((acc, a) => acc + a.quantidade * a.valor_unitario, 0);
}

export function itemPersonalizado(item: EncomendaItem): boolean {
  return (item.removidos?.length ?? 0) > 0 || (item.adicionais?.length ?? 0) > 0;
}

export function descricaoPersonalizacao(item: EncomendaItem): string {
  const partes: string[] = [];
  if (item.removidos && item.removidos.length > 0) {
    partes.push(`Sem: ${item.removidos.join(', ')}`);
  }
  if (item.adicionais && item.adicionais.length > 0) {
    partes.push(
      `+ ${item.adicionais
        .map((a) => `${a.nome}${a.quantidade > 1 ? ` x${a.quantidade}` : ''}`)
        .join(', ')}`,
    );
  }
  return partes.join(' • ');
}
