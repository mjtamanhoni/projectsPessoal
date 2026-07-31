import SubMenu from '../components/submenu';

export default function Cadastro() {
  return (
    <SubMenu
      titulo="Cadastro"
      subtitulo="Gerencie registros do sistema"
      items={[
        { icon: '📦', bg: '#65a30d', label: 'Insumos', destino: '/em-breve?t=Insumos' },
        { icon: '🏷️', bg: '#6366f1', label: 'Marcas', destino: '/em-breve?t=Marcas' },
        { icon: '🏭', bg: '#a855f7', label: 'Produtos Fabricados', destino: '/em-breve?t=Produtos Fabricados' },
        { icon: '📋', bg: '#0ea5e9', label: 'Receitas Ingredientes', destino: '/em-breve?t=Receitas Ingredientes' },
        { icon: '➕', bg: '#f43f5e', label: 'Custos Adicionais', destino: '/em-breve?t=Custos Adicionais' },
        { icon: '👥', bg: '#2563eb', label: 'Clientes', destino: '/em-breve?t=Clientes' },
        { icon: '🏢', bg: '#f97316', label: 'Fornecedores', destino: '/em-breve?t=Fornecedores' },
      ]}
    />
  );
}
