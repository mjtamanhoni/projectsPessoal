import SubMenu from '../components/submenu';

export default function Movimento() {
  return (
    <SubMenu
      titulo="Movimento"
      subtitulo="Gerencie movimentações"
      items={[
        { icon: '🛒', bg: '#f59e0b', label: 'Compras Insumo', destino: '/em-breve?t=Compras Insumo' },
        { icon: '⚙️', bg: '#14b8a6', label: 'Fabricações', destino: '/em-breve?t=Fabricações' },
        { icon: '💵', bg: '#10b981', label: 'Vendas Produto', destino: '/em-breve?t=Vendas Produto' },
        { icon: '📋', bg: '#6366f1', label: 'Encomendas', destino: '/encomendas' },
        { icon: '📦', bg: '#8b5cf6', label: 'Estoque Insumo', destino: '/em-breve?t=Estoque Insumo' },
        { icon: '🏬', bg: '#06b6d4', label: 'Estoque Produto Fabricado', destino: '/em-breve?t=Estoque Produto Fabricado' },
        { icon: '❌', bg: '#dc2626', label: 'Perdas Insumo', destino: '/em-breve?t=Perdas Insumo' },
        { icon: '⚠️', bg: '#eab308', label: 'Perdas Produto', destino: '/em-breve?t=Perdas Produto' },
        { icon: '🔄', bg: '#ec4899', label: 'Uso Consumo', destino: '/em-breve?t=Uso Consumo' },
      ]}
    />
  );
}
