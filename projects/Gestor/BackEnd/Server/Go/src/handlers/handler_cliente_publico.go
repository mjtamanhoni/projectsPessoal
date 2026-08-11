package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"gestor-server/database"
)

var digitosRe = regexp.MustCompile(`[^0-9]`)

func apenasDigitos(s string) string {
	return digitosRe.ReplaceAllString(s, "")
}

func (h *BasicCRUD) usuarioPadraoDaEmpresa(r *http.Request, empresaID int) (int, error) {
	var id int
	err := h.Pool.QueryRow(r.Context(),
		`SELECT id FROM public.usuario WHERE empresa_id = $1 ORDER BY id LIMIT 1`, empresaID).Scan(&id)
	if err != nil && err.Error() == "no rows in result set" {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}

// ClientePublicoBuscar retorna clientes de uma empresa pelo documento (CPF/CNPJ).
// GET /clientePublico?empresa=<id>&documento=<cpf/cnpj>
func (h *BasicCRUD) ClientePublicoBuscar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	documento := apenasDigitos(r.URL.Query().Get("documento"))
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}
	if documento == "" {
		jsonError(w, "Parâmetro 'documento' é obrigatório", http.StatusBadRequest)
		return
	}

	query := `SELECT id, empresa_id, nome, telefone, celular, endereco, email, cnpj_cpf, usuario_id
		FROM public.cliente
		WHERE empresa_id = $1
		AND regexp_replace(COALESCE(cnpj_cpf, ''), '[^0-9]', '', 'g') = $2
		ORDER BY id`
	rows, err := h.Pool.Query(r.Context(), query, empresaID, documento)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// ClientePublicoCriar cria um cliente na empresa informada (cadastro público pelo app do cliente).
// POST /clientePublico  body: { empresa, nome, telefone, celular, endereco, email, cnpj_cpf }
func (h *BasicCRUD) ClientePublicoCriar(w http.ResponseWriter, r *http.Request) {
	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(items) == 0 {
		jsonError(w, "Dados não informados", http.StatusBadRequest)
		return
	}
	body := items[0]

	empresaID := getInt(body, "empresa")
	nome := getStr(body, "nome")
	documento := apenasDigitos(getStr(body, "cnpj_cpf"))
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(nome) == "" {
		jsonError(w, "Informe o nome do cliente", http.StatusBadRequest)
		return
	}
	if documento == "" {
		jsonError(w, "Informe o documento (CPF/CNPJ)", http.StatusBadRequest)
		return
	}

	var existenteID int
	err = h.Pool.QueryRow(r.Context(),
		`SELECT id FROM public.cliente
		WHERE empresa_id = $1 AND regexp_replace(COALESCE(cnpj_cpf, ''), '[^0-9]', '', 'g') = $2`,
		empresaID, documento).Scan(&existenteID)
	if err == nil {
		jsonSuccess(w, map[string]interface{}{"id": existenteID, "mensagem": "Cliente já cadastrado"})
		return
	}
	if err.Error() != "no rows in result set" {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	usuarioID, err := h.usuarioPadraoDaEmpresa(r, empresaID)
	if err != nil {
		jsonError(w, "Erro ao resolver usuário padrão: "+err.Error(), http.StatusInternalServerError)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id, err := database.GerarID(r.Context(), tx, empresaID, "cliente")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO public.cliente (id, empresa_id, nome, telefone, celular, endereco, email, cnpj_cpf, usuario_id, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1)`,
		id, empresaID, nome,
		getStr(body, "telefone"), getStr(body, "celular"),
		getStr(body, "endereco"), getStr(body, "email"),
		documento, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"id": id, "mensagem": "Cliente cadastrado com sucesso"})
}

// ProdutoFabricadoListarPublico lista os produtos fabricados de uma empresa (sem autenticação).
// GET /produtoFabricadoPublico?empresa=<id>
func (h *ProducaoHandler) ProdutoFabricadoListarPublico(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}

	query := `SELECT id, empresa_id, nome, descricao, rendimento, unidade_medida,
		custo_unitario, margem_lucro, valor_venda_sugerido, preco, foto, ativo
		FROM produto_fabricado
		WHERE empresa_id = $1
		ORDER BY id`
	rows, err := h.Pool.Query(r.Context(), query, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) clienteIdDaEmpresa(r *http.Request, empresaID int, clienteID int, documento string) (int, error) {
	if clienteID > 0 {
		var ex int
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id FROM public.cliente WHERE id = $1 AND empresa_id = $2`, clienteID, empresaID).Scan(&ex)
		if err != nil {
			return 0, fmt.Errorf("cliente não encontrado nesta empresa")
		}
		return ex, nil
	}
	if documento == "" {
		return 0, fmt.Errorf("Informe o cliente (cliente_id ou documento)")
	}
	var id int
	err := h.Pool.QueryRow(r.Context(),
		`SELECT id FROM public.cliente
		WHERE empresa_id = $1 AND regexp_replace(COALESCE(cnpj_cpf, ''), '[^0-9]', '', 'g') = $2`,
		empresaID, documento).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("Cliente não encontrado para o documento informado")
	}
	return id, nil
}

// EncomendaPublicoCriar cria uma encomenda (sem autenticação) para um cliente da empresa.
// POST /encomendaPublico  body: { empresa, cliente_id?, documento?, data_encomenda, observacao, itens:[{produto_fabricado_id, quantidade, valor_unitario}] }
func (h *ProducaoHandler) EncomendaPublicoCriar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(items) == 0 {
		jsonError(w, "Dados não informados", http.StatusBadRequest)
		return
	}

	header := items[0]
	empresaID := getInt(header, "empresa")
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}

	clienteID, err := h.clienteIdDaEmpresa(r, empresaID,
		getInt(header, "cliente_id"), apenasDigitos(getStr(header, "documento")))
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	dataEncomenda := getStr(header, "data_encomenda")
	if dataEncomenda == "" {
		jsonError(w, "Data da encomenda é obrigatória", http.StatusBadRequest)
		return
	}
	observacao := getStr(header, "observacao")

	rawItens, ok := header["itens"]
	if !ok {
		jsonError(w, "itens não informados", http.StatusBadRequest)
		return
	}
	itensArr, ok := rawItens.([]interface{})
	if !ok {
		jsonError(w, "itens deve ser um array", http.StatusBadRequest)
		return
	}
	if len(itensArr) == 0 {
		jsonError(w, "Adicione pelo menos um item à encomenda", http.StatusBadRequest)
		return
	}

	usuarioID, err := h.BasicCRUD.usuarioPadraoDaEmpresa(r, empresaID)
	if err != nil {
		jsonError(w, "Erro ao resolver usuário padrão: "+err.Error(), http.StatusInternalServerError)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id, err := database.GerarID(r.Context(), tx, empresaID, "encomenda")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}
	_, err = tx.Exec(r.Context(), `
		INSERT INTO encomenda (id, empresa_id, cliente_id, data_encomenda, valor_total, observacao, usuario_id, status)
		VALUES ($1,$2,$3,$4::date,0,$5,$6,1)`,
		id, empresaID, clienteID, dataEncomenda, observacao, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var totalValor float64
	for _, rawItem := range itensArr {
		item, ok := rawItem.(map[string]interface{})
		if !ok {
			continue
		}
		produtoFabricadoID := getInt(item, "produto_fabricado_id")
		quantidade := getFloat(item, "quantidade")
		valorUnitario := getFloat(item, "valor_unitario")
		valorTotalItem := quantidade * valorUnitario

		itemID, err := database.GerarID(r.Context(), tx, empresaID, "encomenda_item")
		if err != nil {
			jsonError(w, "Erro ao gerar ID do item: "+err.Error(), http.StatusInternalServerError)
			return
		}
		_, err = tx.Exec(r.Context(), `
			INSERT INTO encomenda_item (id, empresa_id, encomenda_id, produto_fabricado_id,
				cliente_id, quantidade, valor_unitario, valor_total)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			itemID, empresaID, id, produtoFabricadoID, clienteID,
			quantidade, valorUnitario, valorTotalItem)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		totalValor += valorTotalItem
	}

	_, err = tx.Exec(r.Context(),
		`UPDATE encomenda SET valor_total = $1 WHERE id = $2 AND empresa_id = $3`,
		totalValor, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Encomenda salva com sucesso", "codigo": id, "id": id})
}

// EncomendaPublicoListar lista encomendas de um cliente por documento (com itens).
// GET /encomendaPublico?empresa=<id>&documento=<cpf/cnpj>[&id=<encomenda>]
func (h *ProducaoHandler) EncomendaPublicoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}
	documento := apenasDigitos(r.URL.Query().Get("documento"))
	id := parseInt(r.URL.Query().Get("id"), 0)
	if documento == "" {
		jsonError(w, "Parâmetro 'documento' é obrigatório", http.StatusBadRequest)
		return
	}

	query := `SELECT e.id, e.empresa_id, e.cliente_id, e.data_encomenda,
		e.valor_total, e.observacao, e.usuario_id, e.status, e.created_at, e.venda_id,
		c.nome as cliente_nome,
		CASE WHEN e.status = 2 THEN true ELSE false END as baixado,
		ei.id as item_id, ei.produto_fabricado_id, ei.quantidade,
		ei.valor_unitario, ei.valor_total as item_valor_total,
		pf.nome as produto_nome
		FROM encomenda e
		JOIN encomenda_item ei ON ei.encomenda_id = e.id AND ei.empresa_id = e.empresa_id
		JOIN public.cliente c ON c.id = e.cliente_id AND c.empresa_id = e.empresa_id
		LEFT JOIN produto_fabricado pf ON pf.id = ei.produto_fabricado_id AND pf.empresa_id = ei.empresa_id
		WHERE e.empresa_id = $1
		AND regexp_replace(COALESCE(c.cnpj_cpf, ''), '[^0-9]', '', 'g') = $2`
	args := []interface{}{empresaID, documento}
	argN := 3
	if id > 0 {
		query += fmt.Sprintf(" AND e.id = $%d", argN)
		args = append(args, id)
	}
	query += " ORDER BY e.id, ei.id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}