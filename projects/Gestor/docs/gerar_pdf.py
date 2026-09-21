# -*- coding: utf-8 -*-
from fpdf import FPDF

class DocPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Gestor Financeiro - Documentacao Tecnica", align="R")
        self.ln(3)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Pagina {self.page_no()}/{{nb}}", align="C")

    def titulo(self, t):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(20, 20, 80)
        self.multi_cell(0, 9, t)
        self.ln(3)

    def sub(self, t):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, t)
        self.ln(2)

    def sub2(self, t):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, t)
        self.ln(1)

    def txt(self, t):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, t)
        self.ln(2)

    def bullet(self, t):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.cell(6, 5.5, "  *")
        self.multi_cell(0, 5.5, t)
        self.ln(1)

    def code(self, lines):
        self.set_font("Courier", "", 8)
        self.set_text_color(30, 30, 30)
        self.set_fill_color(240, 240, 240)
        for l in lines:
            self.cell(0, 4.5, "  " + l, fill=True)
            self.ln(4.5)
        self.ln(3)

    def sep(self):
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

pdf = DocPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# ---- Pagina 1 ----
pdf.add_page()
pdf.titulo("Relatorio de Correcao\nErro de Chave Estrangeira em contas_receber")
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 6, "Data: 20 de setembro de 2026")
pdf.ln(6)
pdf.cell(0, 6, "Modulo: Encomendas (Delivery)")
pdf.ln(6)
pdf.cell(0, 6, "Empresa afetada: Empresa 7 (Delivery)")
pdf.ln(10)
pdf.sep()

# 1
pdf.sub("1. Descricao do Problema")
pdf.txt(
    "Ao informar que uma encomenda foi entregue na tela de Acompanhar Encomendas, "
    "o sistema retornava o seguinte erro:"
)
pdf.code([
    'ERRO: insercao ou atualizacao em tabela "contas_receber"',
    '  viola restricao de chave estrangeira',
    '  "fk_ctr_categoria" (SQLSTATE 23503)',
])
pdf.txt(
    "O erro acontecia no endpoint POST /encomenda (status 2 - finalizada), "
    "quando o sistema tentava criar o registro financeiro (contas a receber) "
    "a partir da encomenda."
)

# 2
pdf.sub("2. Causa Raiz")
pdf.txt(
    "A empresa 7 (Delivery) nao possuia os dados cadastrais necessarios para "
    "que o sistema gerasse automaticamente os registros financeiros ao finalizar "
    "uma encomenda. Especificamente, faltavam dois registros:"
)

pdf.sub2("2.1. Tabela categoria_receber")
pdf.txt(
    "A empresa nao tinha nenhuma categoria de receita cadastrada. A tabela "
    "contas_receber possui uma chave estrangeira (fk_ctr_categoria) que exige "
    "que o campo id_categoria referencie um registro valido na tabela "
    "categoria_receber. Como nao existia nenhuma categoria para a empresa 7, "
    "qualquer tentativa de insercao falhava com erro de violacao de chave "
    "estrangeira."
)

pdf.sub2("2.2. Tabela lancamento_automatico_config")
pdf.txt(
    "A empresa nao tinha uma configuracao de lancamento automatico para o tipo "
    "venda_produto. Quando a encomenda e finalizada (status 2), o sistema busca "
    "nessa tabela a categoria_id para criar o registro em contas_receber. Sem "
    "essa configuracao, o sistema nao sabia qual categoria utilizar."
)

pdf.sub2("2.3. Fluxo de execucao")
pdf.txt("O fluxo que causava o erro era o seguinte:")
pdf.bullet("Usuario informa que a encomenda foi entregue (status 2)")
pdf.bullet("Sistema consulta lancamento_automatico_config para obter a categoria")
pdf.bullet("Obtem um categoria_id invalido (ou zero, por falta de configuracao)")
pdf.bullet("Tenta inserir em contas_receber com esse categoria_id")
pdf.bullet("PostgreSQL rejeita a insercao por violar a restricao de chave estrangeira")

# ---- Pagina 2 ----
pdf.add_page()
pdf.sub("3. Correcao Aplicada")

pdf.sub2("3.1. Correcao no codigo Go (handler_producao.go)")
pdf.txt(
    "Foram adicionadas duas protecoes na funcao gerarVendaDeEncomendaTx, que e "
    "responsavel por criar a venda e o registro financeiro:"
)

pdf.txt(
    "a) Validacao de existencia da categoria: Apos obter o categoria_id "
    "(tanto do request quanto do lancamento_automatico_config), o sistema agora "
    "verifica se essa categoria existe na tabela categoria_receber para a "
    "empresa atual. Se nao existir, o catID e zerado."
)
pdf.code([
    'if catID > 0 {',
    '    var catExists bool',
    '    tx.QueryRow(ctx,',
    '        "SELECT EXISTS(SELECT 1 FROM categoria_receber',
    '         WHERE id = $1 AND empresa_id = $2)",',
    '        catID, empresaID).Scan(&catExists)',
    '    if !catExists {',
    '        catID = 0',
    '    }',
    '}',
])

pdf.txt(
    "b) Insercao condicional com NULL: A insercao em contas_receber so ocorre "
    "se catID > 0. Caso contrario, o campo id_categoria e definido como NULL "
    "(coluna e nullable), permitindo que o registro financeiro seja criado "
    "sem categoria vinculada."
)
pdf.code([
    'var catIDPtr interface{} = catID',
    'if catID == 0 {',
    '    catIDPtr = nil',
    '}',
    '',
    'err = tx.QueryRow(ctx, `',
    '    INSERT INTO contas_receber (..., id_categoria, ...)',
    '    VALUES (..., $9, ...)',
    '    RETURNING id',
    '` ..., catIDPtr, ...)',
])

pdf.sub2("3.2. Correcao de dados no banco (Empresa 7)")
pdf.txt("Foram criados os registros necessarios para a empresa 7:")
pdf.code([
    "-- Categoria de receita",
    "INSERT INTO categoria_receber",
    "  (empresa_id, id, nome, descricao, ativo, usuario_id, status)",
    "VALUES",
    "  (7, 1, 'VENDA DE PRODUTOS', 'Venda de produtos',",
    "   true, 1, 1);",
    "",
    "-- Configuracao de lancamento automatico",
    "INSERT INTO lancamento_automatico_config",
    "  (empresa_id, id, tipo_origem, tipo_lancamento,",
    "   categoria_id, dias_vencimento, descricao_template,",
    "   usuario_id, ativo, status)",
    "VALUES",
    "  (7, 1, 'venda_produto', 'receber', 1, 30,",
    "   'Venda de produtos fabricados', 1, true, 1);",
])

# ---- Pagina 3 ----
pdf.add_page()
pdf.sub("4. Como Testar")
pdf.bullet("Acesse o sistema como superadmin para a empresa 7")
pdf.bullet(
    "Va em Configuracoes > Lancamentos Automaticos e verifique se existe "
    "uma configuracao para 'Venda Produto' com uma categoria valida"
)
pdf.bullet(
    "Se nao existir, cadastre uma categoria de receita e vincule-a na "
    "configuracao"
)
pdf.bullet("Crie uma encomenda e finalize (status 2)")
pdf.bullet(
    "Verifique se o registro em contas_receber foi criado corretamente"
)

pdf.sep()
pdf.sub("5. Procedimentos para Empresas Futuras")
pdf.txt(
    "Para evitar que esse problema ocorra ao cadastrar novas empresas que "
    "utilizem Lancamentos Automaticos, e necessario garantir o seguinte:"
)

pdf.sub2("5.1. Categorias obrigatorias")
pdf.txt(
    "Ao cadastrar uma nova empresa, e necessario criar ao menos:"
)
pdf.bullet(
    "Uma categoria de receita na tabela categoria_receber "
    "(para vendas, encomendas, etc.)"
)
pdf.bullet(
    "Uma categoria de despesa na tabela categoria_pagar "
    "(para compras, insumos, etc.)"
)

pdf.sub2("5.2. Configuracao de lancamento automatico")
pdf.txt(
    "A empresa deve ter configuracoes na tabela "
    "lancamento_automatico_config para cada tipo de origem que sera "
    "utilizado:"
)
pdf.code([
    'Tipo Origem      | Lancamento | Descricao',
    '--------------------------------------------------',
    'venda_produto    | receber    | Vendas de produtos',
    'compra_insumo    | pagar      | Compras de insumos',
])

pdf.txt(
    "Cada configuracao deve apontar para um categoria_id que exista na "
    "tabela correspondente (categoria_receber para receber, categoria_pagar "
    "para pagar) para a mesma empresa."
)

pdf.sub2("5.3. Checklist de cadastro de empresa")
pdf.txt("Antes de liberar a empresa para uso, verificar:")
pdf.bullet(
    "A empresa possui categorias de receita (categoria_receber) cadastradas"
)
pdf.bullet(
    "A empresa possui categorias de despesa (categoria_pagar) cadastradas"
)
pdf.bullet(
    "Existe lancamento_automatico_config para cada tipo de origem desejado"
)
pdf.bullet(
    "O categoria_id em lancamento_automatico_config referencia uma categoria "
    "que existe na tabela correspondente"
)
pdf.bullet(
    "A configuracao esta com ativo = true"
)

pdf.sep()
pdf.sub("6. Arquivos Modificados")
pdf.bullet(
    "BackEnd/Server/Go/src/handlers/handler_producao.go "
    "- Validacao de categoria e insercao condicional"
)
pdf.bullet(
    "FrontEnd/src/server/src/routes/auth.ts "
    "- Superadmins recebem irrestrito: true"
)
pdf.bullet(
    "FrontEnd/src/client/src/pages/ModuloSelector.tsx "
    "- Superadmins nao sao redirecionados"
)
pdf.bullet(
    "FrontEnd/src/client/src/components/ui/Sidebar.tsx "
    "- Subgrupo hardcoded de Delivery removido"
)

output_path = r"C:\Users\mjtam\developer\projects\Gestor\docs\relatorio-correcao-encomenda-2026-09-20.pdf"
pdf.output(output_path)
print(f"PDF gerado: {output_path}")
