const { jsPDF } = require('jspdf');
const { autoTable } = require('jspdf-autotable');
const { writeFileSync } = require('fs');
const { join } = require('path');

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const PAGE_W = doc.internal.pageSize.getWidth();
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

doc.setFillColor(24, 24, 27);
doc.rect(0, 0, PAGE_W, 110, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
doc.text('Produto de Venda - Relatorio de Alteracoes', MARGIN, 45);
doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.text('Concluido: estrutura de dados, Backend Go, BFF, FrontEnd Web e app Cliente (parcial)', MARGIN, 67);
doc.setFontSize(9);
doc.setTextColor(196, 181, 253);
doc.text('Data: 17/08/2026 - Gestor Financeiro / Modulo Producao', MARGIN, 88);

let y = 140;

function section(title) {
  if (y > 720) {
    doc.addPage();
    y = 60;
  }
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text(title, MARGIN, y);
  y += 18;
}

function table(head, rows) {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body: rows,
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [55, 55, 60] },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    styles: { cellPadding: 5 },
  });
  y = doc.lastAutoTable.finalY + 22;
}

function paragraph(text) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
    doc.text(line, MARGIN, y);
    y += 14;
  }
  y += 4;
}

// 1. Banco de dados
section('1. Banco de Dados (migracoes 013 e 014)');
table(
  ['Tabela', 'Colunas principais'],
  [
    ['adicional', 'empresa_id, id, nome, descricao, preco, ativo (adicionais pagos da personalizacao)'],
    ['produto_adicional', 'empresa_id, produto_fabricado_id, adicional_id (adicionais disponiveis por produto)'],
    ['produto_venda', 'empresa_id, id, nome, descricao (TEXT), preco, produto_fabricado_id (origem), foto (TEXT), ativo, usuario_id'],
    ['produto_venda_item', 'empresa_id, id, produto_venda_id, nome, pode_remover, pode_adicionar, preco_adicional, ordem, ativo'],
    ['encomenda_item', '+ produto_venda_id (INTEGER)'],
    ['venda_produto_item', '+ produto_venda_id (INTEGER)'],
    ['encomenda_item_removido', 'id, encomenda_item_id, nome + produto_venda_item_id'],
    ['encomenda_item_adicional', 'id, encomenda_item_id, adicional_id, nome, quantidade, valor_unitario, valor_total + produto_venda_item_id'],
    ['venda_produto_item_removido', 'id, venda_produto_item_id, nome + produto_venda_item_id'],
    ['venda_produto_item_adicional', 'id, venda_produto_item_id, adicional_id, nome, quantidade, valor_unitario, valor_total + produto_venda_item_id'],
  ],
);
paragraph('Migrations idempotentes em BackEnd\\Server\\Go\\src\\database\\migrations.go (013_customizacao_produto e 014_produto_venda), aplicadas via GET /migracoes e POST /migracoes/aplicar. Sequencias (EmpresaAtualizarSequencias) e limpeza de dados (EmpresaLimparDados) incluem as novas tabelas. Scripts de registro de formularios (ignorados no git por *.sql): formulario_produtos_venda.sql e formulario_adicionais.sql.');

// 2. Backend Go
section('2. Backend Go (API)');
table(
  ['Endpoint', 'Metodo', 'Descricao'],
  [
    ['/produtoVenda', 'GET/POST/DELETE', 'CRUD de produto de venda (lista com produto_fabricado_nome; DELETE em transacao remove itens)'],
    ['/produtoVendaItem', 'GET/POST/DELETE', 'CRUD dos itens da receita comercial (pode_remover, pode_adicionar, preco_adicional, ordem)'],
    ['/adicional', 'GET/POST/DELETE', 'CRUD de adicionais pagos'],
    ['/produtoAdicional', 'GET/POST/DELETE', 'Vinculo produto fabricado x adicionais disponiveis (POST substitui a lista)'],
    ['/produtoVendaFoto', 'POST', 'Upload/remocao de foto do produto de venda (base64 -> arquivo em /uploads/Produtos de Venda)'],
    ['/produtoVendaPublico', 'GET', 'NOVO - lista produtos de venda ativos sem autenticacao, com itens (flags + preco adicional) para o app Cliente'],
    ['/encomendaPublico', 'POST', 'Criacao de encomenda aceita produto_venda_id + customizacao (removidos/adicionais)'],
    ['/encomendaPublico/itens', 'POST', 'Atualizacao de itens preserva/apaga customizacao'],
    ['/encomendaPublico', 'GET', 'Lista encomendas do cliente com removidos/adicionais'],
    ['/produtoFabricadoPublico', 'GET', 'Passa a incluir ingredientes (receita) e adicionais do produto'],
  ],
);
paragraph('Novos arquivos: handlers\\handler_produto_venda.go e handlers\\handler_customizacao.go (persistencia de removidos/adicionais com snapshot de nome e preco, reutilizada em encomenda, venda e encomenda publica). EncomendaAtualizar/VendaProdutoAtualizar/Excluir e gerarVendaDeEncomendaTx agora tratam produto_venda_id, copiam a customizacao da encomenda para a venda gerada e so baixam estoque quando ha produto fabricado vinculado (produto de venda sem origem nao baixa estoque). Rotas registradas em main.go (grupo JWT e grupo publico). go build e go vet OK.');

// 3. BFF
section('3. BFF (Express em FrontEnd\\src\\server)');
table(
  ['Arquivo', 'Rotas'],
  [
    ['types.ts', 'Adicional, ProdutoAdicional, ProdutoVenda, ProdutoVendaItem + campos de customizacao em EncomendaItem/VendaProdutoItem (removidos, adicionais, produto_venda_id)'],
    ['schemas/index.ts', 'adicionalBodySchema, produtoAdicionalBodySchema, produtoVendaBodySchema, produtoVendaItemBodySchema + customizacao nos schemas de pedido'],
    ['services/horseApi.ts', 'listar/salvar/excluir de Adicionais, ProdutosAdicionais, ProdutosVenda, ProdutosVendaItens, salvarFotoProdutoVenda; passagem de adicionais/removidos em encomenda/venda'],
    ['routes/adicionais.ts', 'GET/POST/DELETE em /api/adicionais'],
    ['routes/produtos-adicionais.ts', 'GET/POST/DELETE em /api/produtos-adicionais'],
    ['routes/produtos-venda.ts', 'GET/POST/DELETE + /foto em /api/produtos-venda'],
    ['routes/produtos-venda-itens.ts', 'GET/POST/DELETE em /api/produtos-venda-itens'],
    ['index.ts', 'Mounts registrados'],
  ],
);

// 4. FrontEnd Web
section('4. FrontEnd Web (React)');
table(
  ['Arquivo', 'Alteracao'],
  [
    ['types/index.ts', '+ Adicional, ProdutoAdicional, ProdutoVenda, ProdutoVendaItem, AdicionalItemPedido; produto_venda_id/removidos/adicionais em itens'],
    ['pages/ProdutosVenda.tsx', 'Nova pagina: CRUD de produtos de venda com grid expansivel de itens (badges Remover/Adicionar, preco adicional, ordem)'],
    ['pages/Adicionais.tsx', 'Nova pagina: CRUD de adicionais'],
    ['components/forms/ProdutoVendaForm.tsx', 'Form: nome, descricao, preco, origem (Produto Fabricado), foto (upload/URL/remocao), ativo'],
    ['components/forms/ProdutoVendaItemForm.tsx', 'Form: nome, flags pode_remover/pode_adicionar, preco_adicional, ordem'],
    ['components/forms/AdicionalForm.tsx', 'Form: nome, descricao, preco, ativo'],
    ['components/forms/ItemCustomizacaoModal.tsx', 'Modal de personalizacao: itens do produto de venda (remover/adicionar conforme flags), remocao de ingredientes da receita e adicionais do produto'],
    ['pages/ProdutosFabricados.tsx', 'Aba "Adicionais do Produto": vincula adicionais disponiveis ao produto fabricado'],
    ['pages/Encomendas.tsx + EncomendaForm', 'Selecao de produtos fabricados E produtos de venda; botao de personalizacao por item; badge "Personalizado"'],
    ['pages/VendasProduto.tsx + VendaProdutoForm', 'Idem para pedido de venda'],
    ['App.tsx / Sidebar.tsx / lib/permissions.ts', 'Rotas /adicionais e /produtos-venda (modulo PRODUCAO), itens de menu e mapa de permissoes'],
  ],
);
paragraph('Fluxo completo: cadastro de produto de venda (com origem opcional em produto fabricado) + itens da receita comercial -> selecao na Encomenda/Venda -> personalizacao por item -> persistencia com recalculculo do total (base + adicionais). tsc OK.');

// 5. Mobile (app Cliente - parcial)
section('5. Mobile - app Cliente (parcial)');
table(
  ['Arquivo', 'Alteracao'],
  [
    ['src/api.ts', 'IngredientePublico, AdicionalPublico, AdicionalItemPedido; produto fabricado com ingredientes/adicionais; encomendas com removidos/adicionais'],
    ['src/pages/Pedido.tsx', 'Personalizacao de produto (remover ingredientes da receita + adicionar adicionais com preco) com recalculo do total'],
    ['src/pages/MinhasEncomendas.tsx', 'Exibe customizacao dos itens (Sem: ... / + adicionais)'],
    ['src/components/PlusButton.tsx', 'FAB arrastavel com posicao salva (evita cobrir itens do pedido)'],
    ['src/styles.css', 'Ajustes visuais do fluxo de pedido'],
  ],
);
paragraph('Ainda pendente no Mobile: listar/consumir produtos de venda (endpoint publico ja criado no backend - produtoVendaPublico), usar a receita comercial (produto_venda_item) como fonte de remover/adicionar, e ajustar o app Producao.');

// 6. Proximos passos
section('6. Proximos Passos');
table(
  ['#', 'Etapa', 'Descricao'],
  [
    ['1', 'App Cliente - produtos de venda', 'Consumir /produtoVendaPublico: lista de produtos de venda com itens (remover/adicionar) no lugar/ao lado de produto fabricado'],
    ['2', 'App Producao', 'Telas de Produtos de Venda e Adicionais no app Producao (espelhando o Web)'],
    ['3', 'Modulo Vendas', 'Avaliar criacao de modulo "Vendas" separado (novo formulario/modulo no banco) com relatorios proprios'],
    ['4', 'Relatorios', 'Relatorio de vendas por produto de venda (incluir adicionais e customizacao)'],
    ['5', 'Testes integrados', 'BFF em :3001 com fluxo web completo + validacao com superadmin'],
    ['6', 'Deploy', 'Recompilar gestor-server.exe, subir BFF/client (publicar.bat) e gerar novos APKs'],
  ],
);

// 7. Notas
section('7. Notas');
paragraph('- O "Produto de Venda" e o produto comercializavel (encomenda/pedido de venda). Sua receita comercial (produto_venda_item) define o que pode ser removido e/ou adicionado, com preco de adicional proprio. Ex.: XTotal - Pao (somente remover), Bife/Queijo/Presunto/Bacon/Ovo/Milho/Banana/Batata palha/Alface/Tomate (remover e adicionar).');
paragraph('- As flags pode_remover e pode_adicionar sao independentes: o item pode ter apenas uma marcada ou as duas.');
paragraph('- Produto fabricado (formado por insumos, sem remocao) pode ser transformado em produto de venda via campo produto_fabricado_id, mantendo rastreabilidade de producao e baixa de estoque.');
paragraph('- Adicionais pagos sao cadastrados em /adicionais e vinculados por produto em ProdutosFabricados (ou usados diretamente nos itens de produto de venda).');

const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 155);
  doc.text(`Pagina ${i} de ${totalPages}`, PAGE_W - MARGIN, doc.internal.pageSize.getHeight() - 25, { align: 'right' });
}

const out = join(__dirname, 'relatorio-alteracoes-produto-venda.pdf');
writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log('PDF gerado em', out);
