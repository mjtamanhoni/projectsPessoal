import SubMenu from '../components/submenu';

export default function Relatorios() {
  return (
    <SubMenu
      titulo="Relatórios"
      subtitulo="Visualize relatórios do sistema"
      items={[
        { icon: '📊', bg: '#84cc16', label: 'Relatório Insumos', destino: '/relatorio-insumos' },
        { icon: '📈', bg: '#d946ef', label: 'Relatório Produtos Fabricados', destino: '/relatorio-produtos-fabricados' },
        { icon: '🏭', bg: '#f97316', label: 'Relatório Fabricações', destino: '/relatorio-fabricacoes' },
        { icon: '💰', bg: '#3b82f6', label: 'Relatório Vendas Produto', destino: '/relatorio-vendas-produto' },
      ]}
    />
  );
}
