import SubMenu from '../components/submenu';

export default function Movimento() {
  return (
    <SubMenu
      titulo="Movimento"
      subtitulo="Gerencie movimentações"
      items={[
        { icon: '🛒', bg: '#f59e0b', label: 'Compras Insumo', destino: '/compras-insumo' },
        { icon: '⚙️', bg: '#14b8a6', label: 'Fabricações', destino: '/fabricacoes' },
        { icon: '💵', bg: '#10b981', label: 'Vendas Produto', destino: '/vendas-produto' },
        { icon: '📋', bg: '#6366f1', label: 'Encomendas', destino: '/encomendas' },
        { icon: '📦', bg: '#8b5cf6', label: 'Estoque Insumo', destino: '/estoque-insumo' },
        { icon: '🏬', bg: '#06b6d4', label: 'Estoque Produto Fabricado', destino: '/estoque-produto' },
        { icon: '❌', bg: '#dc2626', label: 'Perdas Insumo', destino: '/perdas-insumo' },
        { icon: '⚠️', bg: '#eab308', label: 'Perdas Produto', destino: '/perdas-produto' },
        { icon: '🔄', bg: '#ec4899', label: 'Uso Consumo', destino: '/uso-consumo' },
      ]}
    />
  );
}
