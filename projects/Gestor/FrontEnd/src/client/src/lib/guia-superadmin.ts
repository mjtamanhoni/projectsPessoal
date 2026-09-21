import jsPDF from 'jspdf';

interface PassoGuia {
  titulo: string;
  descricao: string;
  cor: string;
  itens?: string[];
  dica?: string;
  nota?: string;
  importancia?: string;
  modulos?: { nome: string; descricao: string }[];
}

const PASSOS_GUIA: PassoGuia[] = [
  {
    titulo: 'Cadastrar a Empresa',
    descricao: 'Acesse Empresas no menu Geral > Configuracoes do Sistema e cadastre a nova empresa com os dados:',
    cor: 'blue',
    itens: ['Razao Social e Fantasia', 'CNPJ ou CPF', 'Endereco, Telefone, Email', 'Regime Tributario'],
    dica: 'O CNPJ/CPF informado aqui sera utilizado no login do usuario para selecionar a empresa.',
  },
  {
    titulo: 'Atribuir Modulos a Empresa',
    descricao: 'Acesse Empresa x Modulo no menu Geral > Configuracoes do Sistema e vincule os modulos que a empresa deve utilizar:',
    cor: 'purple',
    modulos: [
      { nome: 'Geral', descricao: 'Cadastros basicos (Clientes, Fornecedores, Usuarios)' },
      { nome: 'Gestor', descricao: 'Financeiro (Contas a Pagar/Receber, Categorias)' },
      { nome: 'Producao', descricao: 'Insumos, Receitas, Fabricacao, Vendas, Encomendas' },
      { nome: 'Horas Trabalhadas', descricao: 'Servicos, Horas, Abatimentos' },
    ],
    importancia: 'Sem modulos vinculados, o usuario nao verah nenhum menu apos o login.',
  },
  {
    titulo: 'Cadastrar Usuarios',
    descricao: 'Acesse Usuarios no menu Geral > Cadastro e crie os usuarios da empresa:',
    cor: 'green',
    itens: [
      'Informe o email (sera usado como login) e a senha',
      'Selecione a Empresa correta no campo Empresa',
      'Marque Superadmin apenas para usuarios administradores do sistema',
      'Cada usuario so acessa a empresa vinculada ao seu cadastro',
    ],
    dica: 'O campo "Empresa" no cadastro define qual empresa o usuario acessa. O Superadmin pode acessar qualquer empresa.',
  },
  {
    titulo: 'Configurar Permissoes (Opcional)',
    descricao: 'Por padrao, todos os usuarios veem todos os formularios dos modulos atribuidos a empresa. Para restringir acesso a formularios especificos:',
    cor: 'amber',
    itens: [
      'Acesse Usuario x Formulario no menu Geral > Configuracoes',
      'Selecione o usuario e vincule apenas os formularios que ele deve acessar',
      'Se nenhum formulario for vinculado, o usuario fica irrestrito (acessa todos)',
    ],
    nota: 'O formulario "Permissoes" fica disponivel apenas para Superadmins.',
  },
  {
    titulo: 'Cadastrar Formas de Pagamento',
    descricao: 'Acesse Formas de Pagamento no menu Geral > Cadastro e cadastre as formas de pagamento utilizadas pela empresa:',
    cor: 'indigo',
    itens: [
      'Dinheiro, Cartao de Credito, Cartao de Debito, PIX, etc.',
      'Cada forma deve ter uma Classificacao (DINHEIRO, CARTAO_CREDITO, PIX, etc.)',
      'Vincule as Condicoes de Pagamento (a vista, parcelado, etc.)',
    ],
  },
  {
    titulo: 'Cadastrar Cadastros de Producao (se aplicavel)',
    descricao: 'Se a empresa utiliza o modulo Producao, cadastre os dados basicos:',
    cor: 'rose',
    modulos: [
      { nome: 'Insumos', descricao: 'Materias-primas utilizadas na producao' },
      { nome: 'Produtos Fabricados', descricao: 'Produtos finais que a empresa produz' },
      { nome: 'Receitas Ingredientes', descricao: 'Composicao de cada produto (insumos + quantidades)' },
      { nome: 'Clientes e Fornecedores', descricao: 'Cadastros basicos para vendas e compras' },
    ],
  },
  {
    titulo: 'Configuracoes Adicionais',
    descricao: 'Acesse Configuracoes no menu Geral > Configuracoes para ajustar:',
    cor: 'teal',
    itens: [
      'Dados da empresa para cupom nao fiscal (nome, CNPJ, endereco)',
      'Configuracoes da impressora termica',
      'Categorias financeiras padrao',
      'Modulo e formulario inicial apos o login',
    ],
  },
  {
    titulo: 'Testar o Acesso',
    descricao: 'Faca logout e teste o login com o usuario criado:',
    cor: 'gray',
    itens: [
      'Informe o email do usuario',
      'Informe a senha definida no cadastro',
      'Selecione a empresa pelo CNPJ/CPF no campo Empresa',
      'Verifique se os menus e formularios esperados estao visiveis',
    ],
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

const CORES: Record<string, { bg: string; text: string; light: string }> = {
  blue: { bg: '#3B82F6', text: '#1E40AF', light: '#EFF6FF' },
  purple: { bg: '#8B5CF6', text: '#5B21B6', light: '#F5F3FF' },
  green: { bg: '#22C55E', text: '#166534', light: '#F0FDF4' },
  amber: { bg: '#F59E0B', text: '#92400E', light: '#FFFBEB' },
  indigo: { bg: '#6366F1', text: '#3730A3', light: '#EEF2FF' },
  rose: { bg: '#F43F5E', text: '#9F1239', light: '#FFF1F2' },
  teal: { bg: '#14B8A6', text: '#115E59', light: '#F0FDFA' },
  gray: { bg: '#6B7280', text: '#374151', light: '#F9FAFB' },
};

export function gerarGuiaSuperadminPDF(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Guia de Configuracao para Superadmin', margin, y + 6);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text('Passo a passo para configurar uma nova empresa no sistema', margin, y + 4);
  y += 10;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Passos
  PASSOS_GUIA.forEach((passo, index) => {
    const cores = CORES[passo.cor] || CORES.blue;

    // Verificar se precisa de nova página
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    // Círculo com número
    const circleX = margin + 5;
    const circleY = y + 4;
    doc.setFillColor(...hexToRgb(cores.bg));
    doc.circle(circleX, circleY, 4, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);
    doc.text(String(index + 1), circleX, circleY + 1, { align: 'center' });

    // Título do passo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(cores.text));
    doc.text(passo.titulo, margin + 14, y + 5);
    y += 10;

    // Descrição
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const descLines = doc.splitTextToSize(passo.descricao, contentWidth - 14);
    doc.text(descLines, margin + 14, y + 2);
    y += descLines.length * 4 + 2;

    // Módulos (se houver)
    if (passo.modulos) {
      passo.modulos.forEach((mod) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setFillColor(...hexToRgb(cores.light));
        doc.roundedRect(margin + 14, y, contentWidth - 14, 10, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...hexToRgb(cores.text));
        doc.text(mod.nome, margin + 17, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(mod.descricao, margin + 17, y + 8);
        y += 12;
      });
      y += 2;
    }

    // Itens (se houver)
    if (passo.itens) {
      passo.itens.forEach((item) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        doc.text(`• ${item}`, margin + 17, y + 2);
        y += 4;
      });
      y += 2;
    }

    // Dica
    if (passo.dica) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin + 14, y, contentWidth - 14, 8, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('Dica:', margin + 17, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(passo.dica, margin + 25, y + 3);
      y += 10;
    }

    // Nota
    if (passo.nota) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin + 14, y, contentWidth - 14, 8, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('Nota:', margin + 17, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(passo.nota, margin + 25, y + 3);
      y += 10;
    }

    // Importância
    if (passo.importancia) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin + 14, y, contentWidth - 14, 8, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('Importante:', margin + 17, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(passo.importancia, margin + 32, y + 3);
      y += 10;
    }

    y += 6;
  });

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('© 2026 - Gestor Financeiro', margin, pageHeight - 10);
    doc.text(`Guia de Configuracao - Pagina ${i} de ${totalPages}`, margin, pageHeight - 6);
  }

  return doc;
}
