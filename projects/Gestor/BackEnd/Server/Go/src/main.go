package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"gestor-server/config"
	"gestor-server/database"
	"gestor-server/handlers"
	gestorLogger "gestor-server/logger"
	"gestor-server/middleware"
)

func main() {
	cfg := config.Load()

	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Erro ao conectar ao banco: %v", err)
	}
	defer database.Close()

	middleware.SetJWTSecret(cfg.JWTSecret)

	pool := database.Pool

	if err := database.InitMigracoes(pool); err != nil {
		log.Fatalf("Erro ao init migrations: %v", err)
	}

	basicCRUD := handlers.NewBasicCRUD(pool)
	financeiro := &handlers.FinanceiroHandler{Pool: pool, BasicCRUD: basicCRUD}
	horasHandler := &handlers.HorasHandler{Pool: pool, BasicCRUD: basicCRUD}
	producao := &handlers.ProducaoHandler{Pool: pool, BasicCRUD: basicCRUD}
	loginHandler := &handlers.LoginHandler{Pool: pool}
	testPage := &handlers.TestPageHandler{Pool: pool, Cfg: cfg}
	logStore := gestorLogger.New(filepath.Join(cfg.DataDir, "logs"))
	go func() {
		logStore.CleanOldLogs()
		for range time.Tick(24 * time.Hour) {
			logStore.CleanOldLogs()
		}
	}()
	r := chi.NewRouter()

	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestLogger(logStore))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public routes
	r.Get("/usuario/login", loginHandler.Login)
	r.Post("/usuario/login", loginHandler.Login)
	r.Get("/empresaPublic", basicCRUD.EmpresaListarPublico)
	r.Get("/clientePublico", basicCRUD.ClientePublicoBuscar)
	r.Post("/clientePublico", basicCRUD.ClientePublicoCriar)
	r.Get("/produtoFabricadoPublico", producao.ProdutoFabricadoListarPublico)
	r.Get("/encomendaPublico", producao.EncomendaPublicoListar)
	r.Post("/encomendaPublico", producao.EncomendaPublicoCriar)
	r.Post("/encomendaPublico/cancelar", producao.EncomendaPublicoCancelar)
	r.Post("/encomendaPublico/itens", producao.EncomendaPublicoItensAtualizar)
	r.Get("/test", testPage.TestPage)
	r.Get("/health", testPage.HealthCheck)
	r.Get("/logs/json", func(w http.ResponseWriter, r *http.Request) {
		anoMes := r.URL.Query().Get("mes")
		if anoMes == "" {
			handlers.JsonError(w, "Parâmetro 'mes' é obrigatório (formato YYYYMM)", http.StatusBadRequest)
			return
		}
		statusStr := r.URL.Query().Get("status")
		empresaStr := r.URL.Query().Get("empresa_id")
		metodoStr := r.URL.Query().Get("metodo")

		data, err := logStore.ReadLog(anoMes, empresaStr)
		if err != nil {
			handlers.JsonError(w, "Arquivo de log não encontrado: "+anoMes, http.StatusNotFound)
			return
		}

		dates := make([]string, 0, len(data))
		for d := range data {
			dates = append(dates, d)
		}
		sort.Sort(sort.Reverse(sort.StringSlice(dates)))

		var statusFilter int
		if statusStr != "" {
			statusFilter, _ = strconv.Atoi(statusStr)
		}
		var empresaFilter int
		if empresaStr != "" {
			empresaFilter, _ = strconv.Atoi(empresaStr)
		}

		sorted := make([]map[string]interface{}, 0, len(dates))
		for _, date := range dates {
			entries := data[date]
			if statusFilter > 0 || empresaFilter > 0 || metodoStr != "" {
				filtered := make([]gestorLogger.LogEntry, 0, len(entries))
				for _, e := range entries {
					if statusFilter > 0 && e.Status != statusFilter {
						continue
					}
					if empresaFilter > 0 && e.EmpresaID != empresaFilter {
						continue
					}
					if metodoStr != "" && !strings.EqualFold(e.Metodo, metodoStr) {
						continue
					}
					filtered = append(filtered, e)
				}
				if len(filtered) == 0 {
					continue
				}
				entries = filtered
			}
			sorted = append(sorted, map[string]interface{}{
				"data": date,
				"logs": entries,
			})
		}
		handlers.JsonSuccess(w, sorted)
	})
	r.Get("/logs", func(w http.ResponseWriter, r *http.Request) {
		anoMes := r.URL.Query().Get("mes")
		if anoMes == "" {
			anoMes = time.Now().Format("200601")
		}

		months, _ := logStore.ListMonths()

		w.Header().Set("Content-Type", "text/html; charset=utf-8")

		fmt.Fprint(w, `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Logs do Sistema</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:system-ui,-apple-system,sans-serif; background:#0f172a; color:#e2e8f0; padding:20px; }
  h1 { font-size:1.5rem; margin-bottom:16px; color:#f8fafc; }
  .filtros { display:flex; gap:12px; flex-wrap:wrap; align-items:end; margin-bottom:16px; }
  .filtros label { font-size:.8rem; color:#94a3b8; display:flex; flex-direction:column; gap:4px; }
  .filtros select, .filtros input { padding:6px 10px; border:1px solid #334155; border-radius:6px; background:#1e293b; color:#e2e8f0; font-size:.875rem; }
  .filtros button { padding:6px 16px; border:none; border-radius:6px; background:#3b82f6; color:#fff; font-size:.875rem; cursor:pointer; }
  .filtros button:hover { background:#2563eb; }
  .loading { text-align:center; padding:40px; color:#64748b; }
  .tabela { width:100%; border-collapse:collapse; font-size:.8rem; }
  .tabela th { text-align:left; padding:8px 10px; border-bottom:2px solid #334155; color:#94a3b8; font-weight:600; white-space:nowrap; }
  .tabela td { padding:6px 10px; border-bottom:1px solid #1e293b; white-space:nowrap; text-align:left; }
  .tabela tr:hover td { background:#1e293b; }
  .status { font-weight:600; padding:2px 8px; border-radius:4px; }
  .status-2xx { color:#22c55e; }
  .status-3xx { color:#3b82f6; }
  .status-4xx { color:#f59e0b; }
  .status-5xx { color:#ef4444; }
  .metodo { font-weight:600; color:#a78bfa; }
  .metodo.GET { color:#22c55e; }
  .metodo.POST { color:#3b82f6; }
  .metodo.PUT { color:#f59e0b; }
  .metodo.DELETE { color:#ef4444; }
  .rota { color:#e2e8f0; font-family:monospace; }
  .msg { max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#94a3b8; }
  .data-label { color:#64748b; font-size:.75rem; white-space:nowrap; }
  .data-group { margin-bottom:8px; }
  .data-header { font-size:.85rem; font-weight:600; color:#f8fafc; padding:10px; background:#1e293b; border-radius:6px; margin-bottom:0; }
  .vazio { text-align:center; padding:40px; color:#64748b; }
  .badge { display:inline-block; background:#334155; color:#94a3b8; padding:2px 8px; border-radius:4px; font-size:.75rem; }
  .log-row { cursor:pointer; }
  .log-details-row { display:none; }
  .log-row.expanded + .log-details-row { display:table-row; }
  .log-details { padding:8px 10px; background:#1e293b; border-radius:6px; }
  .detail-label { font-size:.7rem; color:#94a3b8; margin:4px 0 2px; text-transform:uppercase; letter-spacing:.5px; }
  .detail-json { background:#0f172a; color:#a78bfa; padding:6px 8px; border-radius:4px; font-size:.75rem; margin:2px 0 6px; white-space:pre-wrap; word-break:break-all; max-height:120px; overflow:auto; }
  .detail-sql { background:#0f172a; padding:6px 8px; border-radius:4px; font-size:.75rem; margin:2px 0 4px; white-space:pre-wrap; word-break:break-all; max-height:80px; overflow:auto; }
  .detail-sql.select { color:#22c55e; border-left:3px solid #22c55e; }
  .detail-sql.insert { color:#3b82f6; border-left:3px solid #3b82f6; }
  .detail-sql.update { color:#f59e0b; border-left:3px solid #f59e0b; }
  .detail-sql.delete { color:#ef4444; border-left:3px solid #ef4444; }
  .refresh { margin-left:auto; }
  @media(max-width:768px) { .filtros { flex-direction:column; } .msg { max-width:200px; } }
</style>
</head>
<body>
<h1>Logs do Sistema</h1>
<div class="filtros">
  <label>Mês
    <select id="filtro-mes">`)

		for _, m := range months {
			selected := ""
			if m == anoMes {
				selected = " selected"
			}
			fmt.Fprintf(w, "<option value=\"%s\"%s>%s</option>", m, selected, m)
		}

		fmt.Fprint(w, `</select></label>
  <label>Método
    <select id="filtro-metodo">
      <option value="">Todos</option>
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="DELETE">DELETE</option>
    </select></label>
  <label>Status HTTP
    <select id="filtro-status">
      <option value="">Todos</option>
      <option value="200">200</option>
      <option value="201">201</option>
      <option value="204">204</option>
      <option value="301">301</option>
      <option value="302">302</option>
      <option value="400">400</option>
      <option value="401">401</option>
      <option value="403">403</option>
      <option value="404">404</option>
      <option value="422">422</option>
      <option value="500">500</option>
    </select></label>
  <label>Empresa ID
    <input type="number" id="filtro-empresa" placeholder="Todas" min="0"></label>
  <button onclick="carregar()">Filtrar</button>
  <button class="refresh" onclick="carregar()">Atualizar</button>
</div>
<div id="resultado" class="loading">Carregando...</div>
<script>
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
const params = new URLSearchParams(location.search);
if (params.get("status")) document.getElementById("filtro-status").value = params.get("status");
if (params.get("empresa_id")) document.getElementById("filtro-empresa").value = params.get("empresa_id");
if (params.get("metodo")) document.getElementById("filtro-metodo").value = params.get("metodo");

async function carregar() {
  const mes = document.getElementById("filtro-mes").value;
  const metodo = document.getElementById("filtro-metodo").value;
  const status = document.getElementById("filtro-status").value;
  const empresa = document.getElementById("filtro-empresa").value;
  const url = new URL("/logs/json", location.origin);
  url.searchParams.set("mes", mes);
  if (metodo) url.searchParams.set("metodo", metodo);
  if (status) url.searchParams.set("status", status);
  if (empresa) url.searchParams.set("empresa_id", empresa);
  const div = document.getElementById("resultado");
  div.innerHTML = '<div class="loading">Carregando...</div>';
  try {
    const resp = await fetch(url);
    const json = await resp.json();
    if (json && json.erro) { div.innerHTML = '<div class="vazio">Erro: ' + json.erro + '</div>'; return; }
    const data = json;
    if (!data || data.length === 0) { div.innerHTML = '<div class="vazio">Nenhum registro encontrado.</div>'; return; }
    let html = '';
    data.forEach(dia => {
      html += '<div class="data-group"><div class="data-header">' + dia.data + ' (' + dia.logs.length + ' req)</div>';
      html += '<table class="tabela"><thead><tr><th>Hora</th><th>Método</th><th>Rota</th><th>Status</th><th>Mensagem</th><th>Emp</th><th>Usuário</th><th>Duração</th></tr></thead><tbody>';
      dia.logs.forEach(e => {
        const stCls = e.status >= 500 ? 'status-5xx' : e.status >= 400 ? 'status-4xx' : e.status >= 300 ? 'status-3xx' : 'status-2xx';
	  const details = [];
	  if (e.jsonRecebido) details.push('<div class="detail-label">Recebido</div><pre class="detail-json">' + esc(e.jsonRecebido) + '</pre>');
	  if (e.jsonRetornado) details.push('<div class="detail-label">Retornado</div><pre class="detail-json">' + esc(e.jsonRetornado) + '</pre>');
	  if (e.scripts && e.scripts.length) {
	    details.push('<div class="detail-label">Scripts</div>');
	    e.scripts.forEach(s => {
	      const key = Object.keys(s)[0];
	      details.push('<pre class="detail-sql ' + key + '">' + esc(s[key]) + '</pre>');
	    });
	  }
	  const detailHtml = details.length ? '<div class="log-details">' + details.join('') + '</div>' : '';
	  html += '<tr class="log-row" onclick="this.classList.toggle(\'expanded\')"><td class="data-label">' + e.hora + '</td><td class="metodo ' + e.metodo + '">' + e.metodo + '</td><td class="rota">' + e.rota + '</td><td><span class="status ' + stCls + '">' + e.status + '</span></td><td class="msg" title="' + esc(e.mensagem) + '">' + e.mensagem + '</td><td><span class="badge">' + e.empresa_id + '</span></td><td><span class="badge">' + e.usuario_id + '</span></td><td class="data-label">' + e.duracao_ms + 'ms</td></tr><tr class="log-details-row"><td colspan="8">' + detailHtml + '</td></tr>';
      });
      html += '</tbody></table></div>';
    });
    div.innerHTML = html;
  } catch(e) {
    div.innerHTML = '<div class="vazio">Erro ao carregar: ' + (e.message || e) + '</div>';
  }
}
carregar();
</script>
</body>
</html>`)
	})
	// Uploads estáticos (fotos de produtos)
	uploadsDir := cfg.FotosDir
	os.MkdirAll(uploadsDir, 0755)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))

	// JWT-protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth)

		// Usuario
		r.Get("/usuario", basicCRUD.UsuarioListar)
		r.Post("/usuario", basicCRUD.UsuarioAtualizar)
		r.Put("/usuario", basicCRUD.UsuarioAtualizar)
		r.Delete("/usuario", basicCRUD.UsuarioExcluir)
		r.Put("/usuario/alterarSenha", basicCRUD.UsuarioAlterarSenha)
		r.Put("/usuario/alterarPin", basicCRUD.UsuarioAlterarPin)

		// Fornecedor
		r.Get("/fornecedor", basicCRUD.FornecedorListar)
		r.Post("/fornecedor", basicCRUD.FornecedorAtualizar)
		r.Delete("/fornecedor", basicCRUD.FornecedorExcluir)

		// Cliente
		r.Get("/cliente", basicCRUD.ClienteListar)
		r.Post("/cliente", basicCRUD.ClienteAtualizar)
		r.Delete("/cliente", basicCRUD.ClienteExcluir)

		// Categoria Pagar
		r.Get("/categoriaPagar", basicCRUD.CategoriaPagarListar)
		r.Post("/categoriaPagar", basicCRUD.CategoriaPagarAtualizar)
		r.Delete("/categoriaPagar", basicCRUD.CategoriaPagarExcluir)

		// Categoria Receber
		r.Get("/categoriaReceber", basicCRUD.CategoriaReceberListar)
		r.Post("/categoriaReceber", basicCRUD.CategoriaReceberAtualizar)
		r.Delete("/categoriaReceber", basicCRUD.CategoriaReceberExcluir)

		// Contas Pagar
		r.Get("/contasPagar", financeiro.ContasPagarListar)
		r.Post("/contasPagar", financeiro.ContasPagarAtualizar)
		r.Delete("/contasPagar", financeiro.ContasPagarExcluir)
		r.Put("/contasPagar/pagar", financeiro.ContasPagarPagar)
		r.Put("/contasPagar/estornar", financeiro.ContasPagarEstornar)

		// Contas Receber
		r.Get("/contasReceber", financeiro.ContasReceberListar)
		r.Post("/contasReceber", financeiro.ContasReceberAtualizar)
		r.Delete("/contasReceber", financeiro.ContasReceberExcluir)
		r.Put("/contasReceber/receber", financeiro.ContasReceberReceber)
		r.Put("/contasReceber/estornar", financeiro.ContasReceberEstornar)

		// Servico
		r.Get("/servico", basicCRUD.ServicoListar)
		r.Post("/servico", basicCRUD.ServicoAtualizar)
		r.Delete("/servico", basicCRUD.ServicoExcluir)

		// Horas Trabalhadas
		r.Get("/horasTrabalhadas", horasHandler.HorasTrabalhadasListar)
		r.Post("/horasTrabalhadas", horasHandler.HorasTrabalhadasAtualizar)
		r.Delete("/horasTrabalhadas", horasHandler.HorasTrabalhadasExcluir)

		// Horas Abatidas
		r.Get("/horasAbatidas", horasHandler.HorasAbatidasListar)
		r.Post("/horasAbatidas", horasHandler.HorasAbatidasAtualizar)
		r.Delete("/horasAbatidas", horasHandler.HorasAbatidasExcluir)

		// Horas Excedidas
		r.Get("/horasExcedidas", horasHandler.HorasExcedidasListar)
		r.Post("/horasExcedidas", horasHandler.HorasExcedidasAtualizar)
		r.Delete("/horasExcedidas", horasHandler.HorasExcedidasExcluir)

		// Dashboard
		r.Get("/dashboard", financeiro.DashboardListar)
		r.Get("/horasDashboard", horasHandler.HorasDashboardListar)
		r.Get("/producaoDashboard", producao.ProducaoDashboardListar)

		// Formulario
		r.Get("/formulario", basicCRUD.FormularioListar)
		r.Post("/formulario", basicCRUD.FormularioAtualizar)
		r.Delete("/formulario", basicCRUD.FormularioExcluir)

		// Usuario Formulario
		r.Get("/usuarioFormulario", basicCRUD.UsuarioFormularioListar)
		r.Post("/usuarioFormulario", basicCRUD.UsuarioFormularioAtualizar)
		r.Delete("/usuarioFormulario", basicCRUD.UsuarioFormularioExcluir)

		// Permissao
		r.Get("/permissao", basicCRUD.PermissaoListar)

		// Usuario Formulario Permissao
		r.Get("/usuarioFormularioPermissao", basicCRUD.UsuarioFormularioPermissaoListar)
		r.Post("/usuarioFormularioPermissao", basicCRUD.UsuarioFormularioPermissaoSalvar)

		// Usuario Permissoes
		r.Get("/usuarioPermissoes", basicCRUD.UsuarioPermissoes)

		// Insumo
		r.Get("/insumo", producao.InsumoListar)
		r.Post("/insumo", producao.InsumoAtualizar)
		r.Delete("/insumo", producao.InsumoExcluir)
		r.Get("/insumoRecalcular", producao.InsumoRecalcular)

		// Compra Insumo
		r.Get("/compraInsumo", producao.CompraInsumoListar)
		r.Post("/compraInsumo", producao.CompraInsumoAtualizar)
		r.Delete("/compraInsumo", producao.CompraInsumoExcluir)

		// Produto Fabricado
		r.Get("/produtoFabricado", producao.ProdutoFabricadoListar)
		r.Post("/produtoFabricado", producao.ProdutoFabricadoAtualizar)
		r.Delete("/produtoFabricado", producao.ProdutoFabricadoExcluir)

		// Foto do Produto Fabricado
		r.Post("/produtoFoto", producao.ProdutoFotoSalvar)

		// Receita Ingrediente
		r.Get("/receitaIngrediente", producao.ReceitaIngredienteListar)
		r.Post("/receitaIngrediente", producao.ReceitaIngredienteAtualizar)
		r.Delete("/receitaIngrediente", producao.ReceitaIngredienteExcluir)

		// Custo Adicional Tipo
		r.Get("/custoAdicionalTipo", producao.CustoAdicionalTipoListar)
		r.Post("/custoAdicionalTipo", producao.CustoAdicionalTipoAtualizar)
		r.Delete("/custoAdicionalTipo", producao.CustoAdicionalTipoExcluir)

		// Fabricacao
		r.Get("/fabricacao", producao.FabricacaoListar)
		r.Post("/fabricacao", producao.FabricacaoAtualizar)
		r.Delete("/fabricacao", producao.FabricacaoExcluir)

		// Venda Produto
		r.Get("/vendaProduto", producao.VendaProdutoListar)
		r.Post("/vendaProduto", producao.VendaProdutoAtualizar)
		r.Delete("/vendaProduto", producao.VendaProdutoExcluir)

		// Encomenda
		r.Get("/encomenda", producao.EncomendaListar)
		r.Post("/encomenda", producao.EncomendaAtualizar)
		r.Delete("/encomenda", producao.EncomendaExcluir)
		r.Post("/encomenda/gerarVenda", producao.EncomendaGerarVenda)

		// Fabricacao Custo Adicional
		r.Get("/fabricacaoCustoAdicional", producao.FabricacaoCustoAdicionalListar)
		r.Post("/fabricacaoCustoAdicional", producao.FabricacaoCustoAdicionalAtualizar)
		r.Delete("/fabricacaoCustoAdicional", producao.FabricacaoCustoAdicionalExcluir)

		// Lancamento Automatico Config
		r.Get("/lancamentoAutomaticoConfig", producao.LancamentoAutomaticoConfigListar)
		r.Post("/lancamentoAutomaticoConfig", producao.LancamentoAutomaticoConfigSalvar)
		r.Delete("/lancamentoAutomaticoConfig", producao.LancamentoAutomaticoConfigExcluir)

		// Estoque Insumo
		r.Get("/estoqueInsumo", producao.EstoqueInsumoListar)
		r.Post("/estoqueInsumo", producao.EstoqueInsumoAtualizar)
		r.Delete("/estoqueInsumo", producao.EstoqueInsumoExcluir)

		// Estoque Produto Fabricado
		r.Get("/estoqueProdutoFabricado", producao.EstoqueProdutoFabricadoListar)
		r.Post("/estoqueProdutoFabricado", producao.EstoqueProdutoFabricadoAtualizar)
		r.Delete("/estoqueProdutoFabricado", producao.EstoqueProdutoFabricadoExcluir)

		// Modulo
		r.Get("/modulo", basicCRUD.ModuloListar)
		r.Post("/modulo", basicCRUD.ModuloAtualizar)
		r.Delete("/modulo", basicCRUD.ModuloExcluir)

		// Modulo Formulario
		r.Get("/moduloFormulario", basicCRUD.ModuloFormularioListar)
		r.Post("/moduloFormulario", basicCRUD.ModuloFormularioSalvar)
		r.Delete("/moduloFormulario", basicCRUD.ModuloFormularioExcluir)

		// Empresa Modulo
		r.Get("/empresaModulo", basicCRUD.EmpresaModuloListar)
		r.Post("/empresaModulo", basicCRUD.EmpresaModuloSalvar)
		r.Delete("/empresaModulo", basicCRUD.EmpresaModuloExcluir)

		// Empresa
		r.Get("/empresa", basicCRUD.EmpresaListar)
		r.Post("/empresa", basicCRUD.EmpresaAtualizar)
		r.Put("/empresa", basicCRUD.EmpresaAtualizar)
		r.Delete("/empresa", basicCRUD.EmpresaExcluir)
		r.Post("/empresa/limpar-dados", basicCRUD.EmpresaLimparDados)
		r.Post("/empresa/atualizar-sequencias", basicCRUD.EmpresaAtualizarSequencias)

		// Marca
		r.Get("/marca", basicCRUD.MarcaListar)
		r.Post("/marca", basicCRUD.MarcaAtualizar)
		r.Delete("/marca", basicCRUD.MarcaExcluir)

		// Perda Insumo
		r.Get("/perdaInsumo", producao.PerdaInsumoListar)
		r.Post("/perdaInsumo", producao.PerdaInsumoAtualizar)
		r.Delete("/perdaInsumo", producao.PerdaInsumoExcluir)

		// Perda Produto Fabricado
		r.Get("/perdaProdutoFabricado", producao.PerdaProdutoFabricadoListar)
		r.Post("/perdaProdutoFabricado", producao.PerdaProdutoFabricadoAtualizar)
		r.Delete("/perdaProdutoFabricado", producao.PerdaProdutoFabricadoExcluir)

		// Uso Consumo
		r.Get("/usoConsumo", producao.UsoConsumoListar)
		r.Post("/usoConsumo", producao.UsoConsumoAtualizar)
		r.Delete("/usoConsumo", producao.UsoConsumoExcluir)

		// Migracoes
		r.Get("/migracoes", handlers.MigracoesListar(pool))
		r.Post("/migracoes/aplicar", handlers.MigracoesAplicar(pool))

	})

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Servidor iniciado na porta %s", cfg.ServerPort)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Erro ao iniciar servidor: %v", err)
	}
}
