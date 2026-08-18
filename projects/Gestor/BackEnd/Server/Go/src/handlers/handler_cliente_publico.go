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

// unidadesPorItem define em quantas linhas de 1 unidade um item deve ser gravado.
// Produtos de venda (customizáveis) ou itens com customização (removidos/adicionais)
// com quantidade inteira > 1 são divididos para permitir ajustar cada lanche
// individualmente. Quantidades decimais ou itens simples (ex.: bebidas) não dividem.
func unidadesPorItem(produtoVendaID int, quantidade float64, item map[string]interface{}) int {
	if quantidade <= 1 || quantidade != float64(int(quantidade)) {
		return 1
	}
	customizado := false
	for _, campo := range []string{"removidos", "adicionais"} {
		if arr, ok := item[campo].([]interface{}); ok && len(arr) > 0 {
			customizado = true
			break
		}
	}
	if produtoVendaID <= 0 && !customizado {
		return 1
	}
	return int(quantidade)
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

// ClientePublicoBuscar retorna clientes de uma empresa pelo documento (CPF/CNPJ) ou telefone (celular).
// GET /clientePublico?empresa=<id>&documento=<cpf/cnpj>   ou   ?empresa=<id>&telefone=<numero>
func (h *BasicCRUD) ClientePublicoBuscar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	documento := apenasDigitos(r.URL.Query().Get("documento"))
	telefone := apenasDigitos(r.URL.Query().Get("telefone"))
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}
	if documento == "" && telefone == "" {
		jsonError(w, "Informe 'documento' ou 'telefone'", http.StatusBadRequest)
		return
	}

	selects := `SELECT id, empresa_id, nome, telefone, celular, endereco, email, cnpj_cpf, usuario_id
		FROM public.cliente`
	var query string
	var args []interface{}
	if documento != "" {
		query = selects + `
		WHERE empresa_id = $1
		AND regexp_replace(COALESCE(cnpj_cpf, ''), '[^0-9]', '', 'g') = $2
		ORDER BY id`
		args = []interface{}{empresaID, documento}
	} else {
		query = selects + `
		WHERE empresa_id = $1
		AND regexp_replace(COALESCE(celular, telefone), '[^0-9]', '', 'g') = $2
		ORDER BY id`
		args = []interface{}{empresaID, telefone}
	}
	rows, err := h.Pool.Query(r.Context(), query, args...)
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

	query := `SELECT pf.id, pf.empresa_id, pf.nome, pf.descricao, pf.rendimento, pf.unidade_medida,
		pf.custo_unitario, pf.margem_lucro, pf.valor_venda_sugerido, pf.preco, pf.foto, pf.ativo,
		COALESCE((SELECT json_agg(x) FROM (
			SELECT ri.id, ri.insumo_id, i.nome as nome, ri.quantidade
			FROM receita_ingrediente ri
			JOIN insumo i ON i.id = ri.insumo_id AND i.empresa_id = ri.empresa_id
			WHERE ri.produto_fabricado_id = pf.id AND ri.empresa_id = pf.empresa_id) x),
			'[]'::json)::text as ingredientes,
		COALESCE((SELECT json_agg(x) FROM (
			SELECT pa.adicional_id, ad.nome as nome, ad.descricao, ad.preco
			FROM produto_adicional pa
			JOIN adicional ad ON ad.id = pa.adicional_id AND ad.empresa_id = pa.empresa_id
			WHERE pa.produto_fabricado_id = pf.id AND pa.empresa_id = pf.empresa_id
				AND ad.ativo = true) x),
			'[]'::json)::text as adicionais
		FROM produto_fabricado pf
		WHERE pf.empresa_id = $1
		ORDER BY pf.id`
	rows, err := h.Pool.Query(r.Context(), query, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// ProdutoVendaListarPublico lista os produtos de venda ativos de uma empresa
// (sem autenticação), incluindo os itens da receita comercial (pode_remover,
// pode_adicionar, adicional_preco) para montagem da customização na encomenda.
// GET /produtoVendaPublico?empresa=<id>
func (h *ProducaoHandler) ProdutoVendaListarPublico(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}

	query := `SELECT pv.id, pv.empresa_id, pv.nome, pv.descricao, pv.preco,
		pv.produto_fabricado_id, pv.foto, pv.ativo,
		pf.nome as produto_fabricado_nome,
		COALESCE((SELECT json_agg(x) FROM (
			SELECT pvi.id, pvi.nome, pvi.pode_remover, pvi.pode_adicionar,
				pvi.adicional_id, ad.nome as adicional_nome, ad.preco as adicional_preco,
				pvi.ordem
			FROM produto_venda_item pvi
			LEFT JOIN adicional ad ON ad.id = pvi.adicional_id AND ad.empresa_id = pvi.empresa_id
			WHERE pvi.produto_venda_id = pv.id AND pvi.empresa_id = pv.empresa_id
				AND pvi.ativo = true
			ORDER BY pvi.ordem, pvi.id) x),
			'[]'::json)::text as itens
		FROM produto_venda pv
		LEFT JOIN produto_fabricado pf ON pf.id = pv.produto_fabricado_id AND pf.empresa_id = pv.empresa_id
		WHERE pv.empresa_id = $1 AND pv.ativo = true
		ORDER BY pv.nome`
	rows, err := h.Pool.Query(r.Context(), query, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) clienteIdDaEmpresa(r *http.Request, empresaID int, clienteID int, documento string, telefone string) (int, error) {
	if clienteID > 0 {
		var ex int
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id FROM public.cliente WHERE id = $1 AND empresa_id = $2`, clienteID, empresaID).Scan(&ex)
		if err != nil {
			return 0, fmt.Errorf("cliente não encontrado nesta empresa")
		}
		return ex, nil
	}
	if documento != "" {
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
	if telefone != "" {
		var id int
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id FROM public.cliente
			WHERE empresa_id = $1 AND regexp_replace(COALESCE(celular, telefone), '[^0-9]', '', 'g') = $2`,
			empresaID, telefone).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("Cliente não encontrado para o telefone informado")
		}
		return id, nil
	}
	return 0, fmt.Errorf("Informe o cliente (cliente_id, documento ou telefone)")
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
		getInt(header, "cliente_id"), apenasDigitos(getStr(header, "documento")), apenasDigitos(getStr(header, "telefone")))
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	dataEncomenda := getStr(header, "data_encomenda")
	if dataEncomenda == "" {
		jsonError(w, "Data da encomenda é obrigatória", http.StatusBadRequest)
		return
	}
	dataEntrega := getStr(header, "data_entrega")
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
		INSERT INTO encomenda (id, empresa_id, cliente_id, data_encomenda, data_entrega, valor_total, observacao, usuario_id, status)
		VALUES ($1,$2,$3,$4::date,$5::date,0,$6,$7,0)`,
		id, empresaID, clienteID, dataEncomenda, dataOuNil(dataEntrega), observacao, usuarioID)
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
		produtoVendaID := getInt(item, "produto_venda_id")
		quantidade := getFloat(item, "quantidade")
		valorUnitario := getFloat(item, "valor_unitario")

		unidades := unidadesPorItem(produtoVendaID, quantidade, item)
		quantidadeUnidade := quantidade
		if unidades > 1 {
			quantidadeUnidade = 1
		}
		for u := 0; u < unidades; u++ {
			valorTotalItem := quantidadeUnidade * valorUnitario

			itemID, err := database.GerarID(r.Context(), tx, empresaID, "encomenda_item")
			if err != nil {
				jsonError(w, "Erro ao gerar ID do item: "+err.Error(), http.StatusInternalServerError)
				return
			}
			adicionalValor, err := salvarCustomizacaoItem(r.Context(), tx, empresaID, itemID,
				"encomenda_item_id", "encomenda_item_removido", "encomenda_item_adicional", item)
			if err != nil {
				jsonError(w, "Erro ao salvar customização: "+err.Error(), http.StatusInternalServerError)
				return
			}
			valorTotalItem += adicionalValor

			_, err = tx.Exec(r.Context(), `
				INSERT INTO encomenda_item (id, empresa_id, encomenda_id, produto_fabricado_id, produto_venda_id,
					cliente_id, quantidade, valor_unitario, valor_total)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				itemID, empresaID, id, produtoFabricadoID, produtoVendaID, clienteID,
				quantidadeUnidade, valorUnitario, valorTotalItem)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			totalValor += valorTotalItem
		}
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

// EncomendaPublicoListar lista encomendas de um cliente por documento ou telefone (com itens).
// GET /encomendaPublico?empresa=<id>&documento=<cpf/cnpj>   ou   ?empresa=<id>&telefone=<numero>[&id=<encomenda>]
func (h *ProducaoHandler) EncomendaPublicoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	if empresaID == 0 {
		jsonError(w, "Parâmetro 'empresa' é obrigatório", http.StatusBadRequest)
		return
	}
	documento := apenasDigitos(r.URL.Query().Get("documento"))
	telefone := apenasDigitos(r.URL.Query().Get("telefone"))
	id := parseInt(r.URL.Query().Get("id"), 0)
	if documento == "" && telefone == "" {
		jsonError(w, "Informe 'documento' ou 'telefone'", http.StatusBadRequest)
		return
	}

	query := `SELECT e.id, e.empresa_id, e.cliente_id, e.data_encomenda, e.data_entrega,
		e.valor_total, e.observacao, e.usuario_id, e.status, e.created_at, e.venda_id,
		c.nome as cliente_nome,
		CASE WHEN e.status >= 2 THEN true ELSE false END as baixado,
		ei.id as item_id, ei.produto_fabricado_id, ei.quantidade,
		ei.valor_unitario, ei.valor_total as item_valor_total,
		pf.nome as produto_nome,
		COALESCE((SELECT json_agg(x) FROM (
			SELECT ir.id, ir.nome FROM encomenda_item_removido ir
			WHERE ir.encomenda_item_id = ei.id AND ir.empresa_id = ei.empresa_id) x),
			'[]'::json)::text as removidos,
		COALESCE((SELECT json_agg(x) FROM (
			SELECT ia.id, ia.adicional_id, ia.nome, ia.quantidade, ia.valor_unitario, ia.valor_total
			FROM encomenda_item_adicional ia
			WHERE ia.encomenda_item_id = ei.id AND ia.empresa_id = ei.empresa_id) x),
			'[]'::json)::text as adicionais
		FROM encomenda e
		JOIN encomenda_item ei ON ei.encomenda_id = e.id AND ei.empresa_id = e.empresa_id
		JOIN public.cliente c ON c.id = e.cliente_id AND c.empresa_id = e.empresa_id
		LEFT JOIN produto_fabricado pf ON pf.id = ei.produto_fabricado_id AND pf.empresa_id = ei.empresa_id
		WHERE e.empresa_id = $1`
	args := []interface{}{empresaID}
	argN := 2
	if documento != "" {
		query += fmt.Sprintf(" AND regexp_replace(COALESCE(c.cnpj_cpf, ''), '[^0-9]', '', 'g') = $%d", argN)
		args = append(args, documento)
		argN++
	} else {
		query += fmt.Sprintf(" AND regexp_replace(COALESCE(c.celular, c.telefone), '[^0-9]', '', 'g') = $%d", argN)
		args = append(args, telefone)
		argN++
	}
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

// EncomendaPublicoCancelar cancela uma encomenda do cliente (sem autenticação).
// Só permite cancelar encomendas em Aguardando (0) ou Em produção (1).
// POST /encomendaPublico/cancelar  body: { empresa, id, cliente_id?, documento?, telefone? }
func (h *ProducaoHandler) EncomendaPublicoCancelar(w http.ResponseWriter, r *http.Request) {
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
	encomendaID := getInt(header, "id")
	if encomendaID == 0 {
		jsonError(w, "Parâmetro 'id' é obrigatório", http.StatusBadRequest)
		return
	}

	clienteID, err := h.clienteIdDaEmpresa(r, empresaID,
		getInt(header, "cliente_id"), apenasDigitos(getStr(header, "documento")), apenasDigitos(getStr(header, "telefone")))
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.Pool.Exec(r.Context(),
		`UPDATE encomenda SET status = 4
		WHERE id = $1 AND empresa_id = $2 AND cliente_id = $3 AND status < 2`,
		encomendaID, empresaID, clienteID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	afetadas := res.RowsAffected()
	if afetadas == 0 {
		jsonError(w, "Encomenda não encontrada ou não pode ser cancelada (já finalizada ou entregue)", http.StatusBadRequest)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Encomenda cancelada com sucesso"})
}

// EncomendaPublicoItensAtualizar substitui os itens de uma encomenda em Aguardando (status 0),
// recalculando o valor_total. Permite adicionar/remover itens pelo app do cliente.
// POST /encomendaPublico/itens  body: { empresa, id, cliente_id?, documento?, telefone?, itens:[{produto_fabricado_id, quantidade, valor_unitario}] }
func (h *ProducaoHandler) EncomendaPublicoItensAtualizar(w http.ResponseWriter, r *http.Request) {
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
	encomendaID := getInt(header, "id")
	if encomendaID == 0 {
		jsonError(w, "Parâmetro 'id' é obrigatório", http.StatusBadRequest)
		return
	}

	clienteID, err := h.clienteIdDaEmpresa(r, empresaID,
		getInt(header, "cliente_id"), apenasDigitos(getStr(header, "documento")), apenasDigitos(getStr(header, "telefone")))
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

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

	var status int
	err = h.Pool.QueryRow(r.Context(),
		`SELECT status FROM encomenda WHERE id = $1 AND empresa_id = $2 AND cliente_id = $3`,
		encomendaID, empresaID, clienteID).Scan(&status)
	if err != nil {
		jsonError(w, "Encomenda não encontrada para este cliente", http.StatusBadRequest)
		return
	}
	if status != 0 {
		jsonError(w, "Só é possível alterar itens de encomendas em Aguardando", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`DELETE FROM encomenda_item WHERE encomenda_id = $1 AND empresa_id = $2`,
		encomendaID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	err = apagarCustomizacaoDeItens(r.Context(), tx, empresaID, encomendaID,
		"encomenda_item", "encomenda_id", "encomenda_item_id",
		"encomenda_item_removido", "encomenda_item_adicional")
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
		produtoVendaID := getInt(item, "produto_venda_id")
		quantidade := getFloat(item, "quantidade")
		valorUnitario := getFloat(item, "valor_unitario")

		unidades := unidadesPorItem(produtoVendaID, quantidade, item)
		quantidadeUnidade := quantidade
		if unidades > 1 {
			quantidadeUnidade = 1
		}
		for u := 0; u < unidades; u++ {
			valorTotalItem := quantidadeUnidade * valorUnitario

			itemID, err := database.GerarID(r.Context(), tx, empresaID, "encomenda_item")
			if err != nil {
				jsonError(w, "Erro ao gerar ID do item: "+err.Error(), http.StatusInternalServerError)
				return
			}
			adicionalValor, err := salvarCustomizacaoItem(r.Context(), tx, empresaID, itemID,
				"encomenda_item_id", "encomenda_item_removido", "encomenda_item_adicional", item)
			if err != nil {
				jsonError(w, "Erro ao salvar customização: "+err.Error(), http.StatusInternalServerError)
				return
			}
			valorTotalItem += adicionalValor

			_, err = tx.Exec(r.Context(), `
				INSERT INTO encomenda_item (id, empresa_id, encomenda_id, produto_fabricado_id, produto_venda_id,
					cliente_id, quantidade, valor_unitario, valor_total)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				itemID, empresaID, encomendaID, produtoFabricadoID, produtoVendaID, clienteID,
				quantidadeUnidade, valorUnitario, valorTotalItem)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			totalValor += valorTotalItem
		}
	}

	_, err = tx.Exec(r.Context(),
		`UPDATE encomenda SET valor_total = $1 WHERE id = $2 AND empresa_id = $3`,
		totalValor, encomendaID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Itens da encomenda atualizados com sucesso", "id": encomendaID})
}
