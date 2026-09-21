# -*- coding: utf-8 -*-
from fpdf import FPDF

FONT_PATH = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/arialbd.ttf"

class DocPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("Arial", "", FONT_PATH)
        self.add_font("Arial", "B", FONT_BOLD_PATH)

    def header(self):
        if self.page_no() > 1:
            self.set_font("Arial", "B", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, "Gestor Financeiro - Roteiro de Configuracao Delivery", align="L")
            self.cell(0, 8, "Pagina %d" % self.page_no(), align="R")
            self.ln(3)
            self.set_draw_color(200, 200, 200)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "Gestor Financeiro - Roteiro de Configuracao Delivery", align="C")

    def titulo(self, t):
        self.set_font("Arial", "B", 16)
        self.set_text_color(20, 20, 80)
        self.multi_cell(0, 9, t)
        self.ln(3)

    def sub(self, t):
        self.set_font("Arial", "B", 12)
        self.set_text_color(40, 40, 120)
        self.multi_cell(0, 7, t)
        self.ln(2)

    def sub2(self, t):
        self.set_font("Arial", "B", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, t)
        self.ln(1)

    def txt(self, t):
        self.set_font("Arial", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, t)
        self.ln(2)

    def bullet(self, t):
        self.set_font("Arial", "", 10)
        self.set_text_color(30, 30, 30)
        self.cell(6, 5.5, "\u2022")
        self.multi_cell(0, 5.5, t)
        self.ln(1)

    def numbered(self, n, t):
        self.set_font("Arial", "B", 10)
        self.set_text_color(40, 40, 120)
        self.cell(8, 5.5, "%d." % n)
        self.set_font("Arial", "", 10)
        self.set_text_color(30, 30, 30)
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

    def alerta(self, t):
        self.set_fill_color(255, 250, 230)
        self.set_draw_color(255, 200, 0)
        self.set_font("Arial", "B", 9)
        self.set_text_color(150, 100, 0)
        y = self.get_y()
        self.rect(10, y, 190, 14, style="DF")
        self.set_xy(14, y + 2)
        self.multi_cell(182, 5, "ATENCAO: " + t)
        self.ln(5)

    def dica(self, t):
        self.set_fill_color(230, 245, 255)
        self.set_draw_color(0, 120, 200)
        self.set_font("Arial", "", 9)
        self.set_text_color(0, 80, 140)
        y = self.get_y()
        self.rect(10, y, 190, 10, style="DF")
        self.set_xy(14, y + 2)
        self.multi_cell(182, 5, t)
        self.ln(4)


pdf = DocPDF()
pdf.set_auto_page_break(auto=True, margin=20)

# CAPA
pdf.add_page()
pdf.ln(30)
pdf.titulo("Roteiro de Configuracao\nSistema de Delivery")
pdf.ln(10)
pdf.set_font("Arial", "", 12)
pdf.set_text_color(80, 80, 80)
pdf.multi_cell(0, 7, "Passo a passo completo para cadastrar uma nova empresa\nno modulo de Delivery do Gestor Financeiro.\n\nExecutado como usuario SuperAdmin.")
pdf.ln(15)
pdf.set_font("Arial", "", 10)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 6, "Versao: 1.0 - Setembro 2026")
pdf.ln(6)
pdf.cell(0, 6, "Responsavel: Administrador do Sistema")

# SUMARIO
pdf.add_page()
pdf.sub("Sumario")
pdf.ln(2)
pdf.numbered(1, "Visao Geral do Fluxo de Configuracao")
pdf.numbered(2, "Cadastrar a Empresa")
pdf.numbered(3, "Vincular Modulos a Empresa")
pdf.numbered(4, "Cadastrar o Usuario Administrador")
pdf.numbered(5, "Cadastrar Categorias Financeiras")
pdf.numbered(6, "Configurar Lancamentos Automaticos")
pdf.numbered(7, "Cadastrar Formas e Condicoes de Pagamento")
pdf.numbered(8, "Cadastrar Clientes")
pdf.numbered(9, "Verificacoes Finais")
pdf.numbered(10, "Erros Comuns e Como Evitar")

# 1. VISAO GERAL
pdf.add_page()
pdf.sub("1. Visao Geral do Fluxo de Configuracao")
pdf.txt(
    "Antes de comecar, e importante entender a ordem correta das configuracoes. "
    "Cada etapa depende da anterior. Siga a ordem abaixo para evitar erros."
)
pdf.sub2("Ordem de execucao:")
pdf.numbered(1, "Cadastrar a Empresa (delivery = 1)")
pdf.numbered(2, "Vincular os modulos GERAL e DELIVERY a empresa")
pdf.numbered(3, "Cadastrar o usuario administrador da empresa")
pdf.numbered(4, "Cadastrar categorias de receita e despesa")
pdf.numbered(5, "Configurar lancamentos automaticos")
pdf.numbered(6, "Cadastrar formas de pagamento e condicoes de pagamento")
pdf.numbered(7, "Cadastrar clientes (opcional, pode ser feito depois)")
pdf.numbered(8, "Verificar se tudo esta funcionando")
pdf.alerta(
    "Nao pule etapas! O erro mais comum e esquecer de criar as categorias "
    "financeiras ou os lancamentos automaticos, o que gera erro ao finalizar encomendas."
)

# 2. CADASTRAR EMPRESA
pdf.add_page()
pdf.sub("2. Cadastrar a Empresa")
pdf.sub2("2.1. Acessar o formulario")
pdf.txt(
    "1. Faca login como SuperAdmin (mjtamanhoni@gmail.com, empresa 1)\n"
    "2. No menu lateral, va em Gestor > Empresas\n"
    "3. Clique em 'Novo' para criar uma nova empresa"
)
pdf.sub2("2.2. Preencher os dados obrigatorios")
pdf.txt("Campos obrigatorios:")
pdf.bullet("Razao Social: razao social completa da empresa")
pdf.bullet("Fantasia: nome fantasia (aparece no topo do sistema)")
pdf.bullet("CNPJ/CPF: documento da empresa")
pdf.bullet("Telefone: telefone de contato")
pdf.sub2("2.3. Configuracao de Delivery")
pdf.alerta(
    "Este e o campo mais importante para o Delivery. Sem ele, o sistema "
    "nao ativara as funcionalidades de entrega."
)
pdf.txt(
    "No formulario de edicao da empresa, defina:\n\n"
    "  Delivery = 1\n\n"
    "Isso ativa o modulo de Delivery para esta empresa. "
    "O campo 'delivery' fica na tabela 'empresa' do banco de dados."
)
pdf.sub2("2.4. Outros campos uteis")
pdf.bullet("Chave PIX: chave PIX para pagamento dos clientes")
pdf.bullet("Logomarca: arquivo de imagem da logomarca (aparece no menu)")

# 3. VINCULAR MODULOS
pdf.add_page()
pdf.sub("3. Vincular Modulos a Empresa")
pdf.txt(
    "A empresa precisa ter ao menos 2 modulos vinculados: GERAL e DELIVERY. "
    "O modulo GERAL fornece funcionalidades basicas (clientes, usuarios, "
    "configuracoes). O modulo DELIVERY fornece as funcionalidades de encomendas."
)
pdf.sub2("3.1. Acessar Empresa x Modulo")
pdf.txt(
    "1. No menu lateral, va em Gestor > Empresa x Modulo\n"
    "2. Clique em 'Novo'"
)
pdf.sub2("3.2. Vincular modulo GERAL")
pdf.txt(
    "1. Selecione a empresa criada no campo 'Empresa'\n"
    "2. Selecione 'GERAL' no campo 'Modulo'\n"
    "3. Salve"
)
pdf.sub2("3.3. Vincular modulo DELIVERY")
pdf.txt(
    "1. Clique em 'Novo' novamente\n"
    "2. Selecione a empresa criada no campo 'Empresa'\n"
    "3. Selecione 'DELIVERY' no campo 'Modulo'\n"
    "4. Salve"
)
pdf.dica(
    "Dica: Verifique se os modulos foram vinculados corretamente "
    "listando os registros na tela 'Empresa x Modulo'."
)
pdf.sub2("Formularios incluidos em cada modulo:")
pdf.txt("Modulo GERAL (21 formularios):")
pdf.bullet("Clientes, Fornecedores, Usuarios, Marcas, Bandeiras Cartao")
pdf.bullet("Formas de Pagamento, Condicoes de Pagamento")
pdf.bullet("Configuracoes, Lancamentos Automaticos, Permissoes")
pdf.bullet("Usuario x Formulario, Modulos, Formularios, etc.")
pdf.txt("Modulo DELIVERY (13 formularios):")
pdf.bullet("Encomendas, Acompanhar Encomendas")
pdf.bullet("Produtos de Venda, Adicionais, Classificacao Produtos")
pdf.bullet("Formas de Pagamento, Condicoes de Pagamento")
pdf.bullet("Custos Adicionais, Receitas Ingredientes")
pdf.bullet("Vendas Produto, Relatorio Vendas Produto")
pdf.bullet("Lancamentos Automaticos, Endereco de Entrega")

# 4. CADASTRAR USUARIO
pdf.add_page()
pdf.sub("4. Cadastrar o Usuario Administrador")
pdf.sub2("4.1. Acessar o formulario")
pdf.txt(
    "1. No menu lateral, va em Gestor > Usuarios\n"
    "2. Clique em 'Novo' para criar um novo usuario"
)
pdf.sub2("4.2. Preencher os dados")
pdf.txt("Campos obrigatorios:")
pdf.bullet("Nome: nome completo do usuario")
pdf.bullet("Email: email do usuario (usado como login)")
pdf.bullet("Senha: senha de acesso")
pdf.bullet("PIN: codigo PIN para acesso rapido (opcional)")
pdf.sub2("4.3. Configuracao importante")
pdf.alerta(
    "Nao marque 'SuperAdmin' para usuarios normais da empresa. "
    "SuperAdmin tem acesso irrestrito a todas as empresas. "
    "Apenas usuarios de suporte/dev devem ser SuperAdmin."
)
pdf.txt(
    "Para o primeiro usuario administrador da empresa:\n\n"
    "  is_superadmin = false\n"
    "  status = 1 (ativo)\n\n"
    "O usuario sera criado automaticamente vinculado a empresa selecionada."
)
pdf.sub2("4.4. Importante sobre permissoes")
pdf.txt(
    "Se voce NAO cadastrar permissoes para o usuario (tabela "
    "usuario_formulario), ele tera acesso IRRESTRITO a todas as paginas. "
    "Se cadastrar permissoes, ele so vera as paginas dos formularios vinculados."
)
pdf.dica(
    "Para o primeiro usuario da empresa, deixe SEM permissoes vinculadas "
    "para que ele tenha acesso total. Depois crie usuarios restritos."
)

# 5. CATEGORIAS FINANCEIRAS
pdf.add_page()
pdf.sub("5. Cadastrar Categorias Financeiras")
pdf.alerta(
    "ETAPA OBRIGATORIA! Sem categorias, o sistema nao consegue gerar "
    "contas a receber quando uma encomenda e finalizada."
)
pdf.sub2("5.1. Categorias de Receita (categoria_receber)")
pdf.txt(
    "1. Acesse a tela de Configuracoes do sistema\n"
    "2. Cadastre ao menos 1 categoria de receita\n\n"
    "Exemplo obrigatoria:\n"
    "  Nome: VENDA DE PRODUTOS\n"
    "  Descricao: Vendas de produtos do Delivery\n"
    "  Ativo: Sim"
)
pdf.sub2("5.2. Categorias de Despesa (categoria_pagar)")
pdf.txt(
    "Se a empresa tera compras de insumos, cadastre tambem:\n\n"
    "Exemplo:\n"
    "  Nome: COMPRAS DE INSUMOS\n"
    "  Descricao: Compras de materias-primas\n"
    "  Ativo: Sim"
)
pdf.code([
    "-- Exemplo SQL (se necessario criar direto no banco):",
    "-- Categoria de receita",
    "INSERT INTO categoria_receber",
    "  (empresa_id, id, nome, descricao, ativo, usuario_id, status)",
    "VALUES",
    "  (ID_EMPRESA, 1, 'VENDA DE PRODUTOS',",
    "   'Vendas de produtos', true, 1, 1);",
    "",
    "-- Categoria de despesa",
    "INSERT INTO categoria_pagar",
    "  (empresa_id, id, nome, descricao, ativo, usuario_id, status)",
    "VALUES",
    "  (ID_EMPRESA, 1, 'COMPRAS DE INSUMOS',",
    "   'Compras de materias-primas', true, 1, 1);",
])

# 6. LANCAMENTOS AUTOMATICOS
pdf.add_page()
pdf.sub("6. Configurar Lancamentos Automaticos")
pdf.alerta(
    "ETAPA OBRIGATORIA! Sem esta configuracao, o sistema nao gera "
    "contas a receber automaticamente ao finalizar encomendas."
)
pdf.sub2("6.1. Acessar a configuracao")
pdf.txt(
    "1. Faca login como o usuario da empresa de Delivery\n"
    "2. No menu lateral, va em Configuracoes > Lancamentos Automaticos\n"
    "3. Clique em 'Novo'"
)
pdf.sub2("6.2. Preencher os dados")
pdf.txt("Campos:")
pdf.bullet("Tipo Origem: venda_produto")
pdf.bullet("Tipo Lancamento: receber")
pdf.bullet("Categoria: selecione a categoria de receita criada no passo 5")
pdf.bullet("Dias Vencimento: 30 (ou conforme necessidade)")
pdf.bullet("Descricao Template: Venda de produtos fabricados")
pdf.bullet("Ativo: Sim")
pdf.sub2("6.3. O que essa configuracao faz")
pdf.txt(
    "Quando uma encomenda e finalizada (status 2), o sistema:\n\n"
    "1. Cria um registro de venda (venda_produto)\n"
    "2. Copia os itens da encomenda para venda_produto_item\n"
    "3. Consulta esta configuracao para obter a categoria\n"
    "4. Cria o registro em contas_receber com a categoria indicada\n\n"
    "Sem esta configuracao, o passo 3 falha e a conta a receber nao e criada."
)
pdf.code([
    "-- Exemplo SQL:",
    "INSERT INTO lancamento_automatico_config",
    "  (empresa_id, id, tipo_origem, tipo_lancamento,",
    "   categoria_id, dias_vencimento, descricao_template,",
    "   usuario_id, ativo, status)",
    "VALUES",
    "  (ID_EMPRESA, 1, 'venda_produto', 'receber', 1, 30,",
    "   'Venda de produtos fabricados', 1, true, 1);",
])

# 7. FORMAS DE PAGAMENTO
pdf.add_page()
pdf.sub("7. Cadastrar Formas e Condicoes de Pagamento")
pdf.sub2("7.1. Formas de Pagamento")
pdf.txt(
    "1. No menu lateral, va em Cadastro > Formas de Pagamento\n"
    "2. Cadastre as formas de pagamento aceitas:\n\n"
    "Exemplos obrigatorios:\n"
    "  - Dinheiro\n"
    "  - Cartao de Credito\n"
    "  - Cartao de Debito\n"
    "  - PIX\n"
    "  - Vale Refeicao / Alimentacao"
)
pdf.sub2("7.2. Bandeiras de Cartao")
pdf.txt(
    "1. No menu lateral, va em Cadastro > Bandeiras Cartao\n"
    "2. Cadastre as bandeiras aceitas:\n\n"
    "Exemplos:\n"
    "  - Visa\n"
    "  - Mastercard\n"
    "  - Elo\n"
    "  - Amex"
)
pdf.sub2("7.3. Condicoes de Pagamento")
pdf.txt(
    "1. No menu lateral, va em Cadastro > Condicoes de Pagamento\n"
    "2. Cadastre as condicoes de pagamento:\n\n"
    "Exemplos:\n"
    "  - A Vista\n"
    "  - 30 Dias\n"
    "  - Parcelado em 2x\n"
    "  - Parcelado em 3x"
)
pdf.dica(
    "Essas configuracoes sao usadas quando o cliente realiza o pagamento "
    "da encomenda. Se nao estiverem cadastradas, o sistema pode apresentar "
    "erros ao registrar o pagamento."
)

# 8. CLIENTES
pdf.add_page()
pdf.sub("8. Cadastrar Clientes")
pdf.txt(
    "O cadastro de clientes e opcional no inicio, mas necessario para "
    "registrar encomendas com dados do cliente."
)
pdf.sub2("8.1. Acessar o formulario")
pdf.txt(
    "1. No menu lateral, va em Cadastro > Clientes\n"
    "2. Clique em 'Novo'"
)
pdf.sub2("8.2. Dados obrigatorios")
pdf.bullet("Nome: nome completo do cliente")
pdf.bullet("Telefone: telefone de contato")
pdf.sub2("8.3. Dados opcionais mas uteis")
pdf.bullet("Endereco: para entregas")
pdf.bullet("Bairro: para facilitar buscas")
pdf.bullet("Cidade/UF: localizacao")
pdf.bullet("Email: para comunicacoes")
pdf.bullet("CPF/CNPJ: para nota fiscal se necessario")
pdf.dica(
    "Clientes tambem podem ser cadastrados direto pela tela de Encomendas, "
    "quando o atendente esta registrando um pedido novo."
)

# 9. VERIFICACOES FINAIS
pdf.add_page()
pdf.sub("9. Verificacoes Finais")
pdf.txt("Apos todas as configuracoes, faca os seguintes testes:")
pdf.sub2("9.1. Teste de login")
pdf.bullet("Facа login com o usuario criado para a empresa")
pdf.bullet("Verifique se o menu lateral mostra os modulos GERAL e DELIVERY")
pdf.bullet("Verifique se todas as paginas estao acessiveis")
pdf.sub2("9.2. Teste de encomenda")
pdf.bullet("Va em Delivery > Encomendas")
pdf.bullet("Crie uma nova encomenda com pelo menos 1 item")
pdf.bullet("Finalize a encomenda (status 2)")
pdf.bullet("Verifique se nao apareceu erro de chave estrangeira")
pdf.bullet("Verifique se a conta a receber foi criada em Financeiro > Contas a Receber")
pdf.sub2("9.3. Teste de acompanhamento")
pdf.bullet("Va em Delivery > Acompanhar Encomendas")
pdf.bullet("Verifique se a encomenda aparece na lista")
pdf.bullet("Mude o status para 'Saiu para Entrega' (status 3)")
pdf.bullet("Mude o status para 'Entregue' (status 4)")
pdf.alerta(
    "Se qualquer teste falhar, verifique a ordem das configuracoes. "
    "O erro mais comum e esquecer a categoria financeira ou o lancamento automatico."
)

# 10. ERROS COMUNS
pdf.add_page()
pdf.sub("10. Erros Comuns e Como Evitar")

pdf.sub2("Erro 1: 'violacao de chave estrangeira fk_ctr_categoria'")
pdf.txt(
    "Causa: A empresa nao tem categoria de receita cadastrada, ou a "
    "categoria configurada no lancamento automatico nao existe.\n\n"
    "Solucao: Cadastre a categoria de receita (passo 5) e verifique "
    "se o lancamento automatico aponta para ela (passo 6)."
)

pdf.sub2("Erro 2: 'modulo nao encontrado no menu'")
pdf.txt(
    "Causa: O modulo nao foi vinculado a empresa no passo 3.\n\n"
    "Solucao: Acesse Gestor > Empresa x Modulo e verifique se os modulos "
    "GERAL e DELIVERY estao vinculados a empresa."
)

pdf.sub2("Erro 3: 'usuario sem acesso as paginas'")
pdf.txt(
    "Causa: O usuario tem registros na tabela usuario_formulario que "
    "restringem o acesso.\n\n"
    "Solucao: Para acesso total, remova os registros de usuario_formulario "
    "do usuario. Se nao houver registros, o usuario recebe acesso irrestrito."
)

pdf.sub2("Erro 4: 'menu de modulos nao aparece'")
pdf.txt(
    "Causa: O usuario nao tem modulos vinculados a empresa, ou o campo "
    "delivery nao esta configurado.\n\n"
    "Solucao: Verifique se a empresa tem delivery=1 e se os modulos "
    "GERAL e DELIVERY estao vinculados."
)

pdf.sub2("Erro 5: 'encomenda nao gera venda'")
pdf.txt(
    "Causa: A encomenda nao atingiu o status 2 (finalizada).\n\n"
    "Solucao: Na tela Acompanhar Encomendas, mude o status para 2 "
    "(finalizada). Apenas nesse momento o sistema gera a venda e a "
    "conta a receber."
)

pdf.sep()
pdf.sub("Resumo Rapido de Configuracao")
pdf.txt(
    "Para uma nova empresa de Delivery, siga esta ordem:\n\n"
    "1. Criar empresa com delivery = 1\n"
    "2. Vincular modulos GERAL e DELIVERY\n"
    "3. Criar usuario administrador (sem permissoes = acesso total)\n"
    "4. Criar categoria de receita (VENDA DE PRODUTOS)\n"
    "5. Configurar lancamento automatico (venda_produto / receber)\n"
    "6. Cadastrar formas de pagamento (Dinheiro, PIX, Cartao)\n"
    "7. Cadastrar bandeiras de cartao\n"
    "8. Cadastrar condicoes de pagamento\n"
    "9. Testar criando uma encomenda e finalizando-a"
)

output = r"C:\Users\mjtam\developer\projects\Gestor\docs\roteiro-configuracao-delivery.pdf"
pdf.output(output)
print("PDF gerado: " + output)
