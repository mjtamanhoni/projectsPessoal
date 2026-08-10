import SubMenu from '../components/submenu';

export default function Cadastro() {
  return (
    <SubMenu
      titulo="Cadastro"
      subtitulo="Gerencie registros do sistema"
      items={[
        { icon: '📦', bg: '#65a30d', label: 'Insumos', destino: '/insumos' },
        { icon: '🏷️', bg: '#6366f1', label: 'Marcas', destino: '/marcas' },
        { icon: '🏭', bg: '#a855f7', label: 'Produtos Fabricados', destino: '/produtos-fabricados' },
        { icon: '📋', bg: '#0ea5e9', label: 'Receitas Ingredientes', destino: '/produtos-fabricados' },
        { icon: '➕', bg: '#f43f5e', label: 'Custos Adicionais', destino: '/custos-adicionais' },
        { icon: '👥', bg: '#2563eb', label: 'Clientes', destino: '/clientes' },
        { icon: '🏢', bg: '#f97316', label: 'Fornecedores', destino: '/fornecedores' },
      ]}
    />
  );
}
