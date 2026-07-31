import SubMenu from '../components/submenu';

export default function Relatorios() {
  return (
    <SubMenu
      titulo="Relatórios"
      subtitulo="Visualize relatórios do sistema"
      items={[
        { icon: '📊', bg: '#84cc16', label: 'Relatório Insumos', destino: '/em-breve?t=Relatório Insumos' },
        { icon: '📈', bg: '#d946ef', label: 'Relatório Produtos Fabricados', destino: '/em-breve?t=Relatório Produtos Fabricados' },
        { icon: '🏭', bg: '#f97316', label: 'Relatório Fabricações', destino: '/em-breve?t=Relatório Fabricações' },
        { icon: '💰', bg: '#3b82f6', label: 'Relatório Vendas Produto', destino: '/em-breve?t=Relatório Vendas Produto' },
      ]}
    />
  );
}
