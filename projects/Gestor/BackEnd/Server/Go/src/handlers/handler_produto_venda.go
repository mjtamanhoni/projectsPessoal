package handlers

import (
	"fmt"
	"net/http"

	"gestor-server/middleware"
)

// --- Produto de Venda ---
// Produto comercializavel (encomenda/venda). Pode derivar de um produto fabricado
// e possui itens (receita comercial) que podem ser removidos e/ou adicionados.

func (h *ProducaoHandler) ProdutoVendaListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT pv.*, pf.nome as produto_fabricado_nome
		FROM produto_venda pv
		LEFT JOIN produto_fabricado pf ON pf.id = pv.produto_fabricado_id AND pf.empresa_id = pv.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND pv.id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(pv.nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += fmt.Sprintf(" AND (pv.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY pv.id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) ProdutoVendaAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "produto_venda",
		[]string{"nome", "descricao", "preco", "produto_fabricado_id", "foto", "ativo"})
}

func (h *ProducaoHandler) ProdutoVendaExcluir(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		"DELETE FROM produto_venda_item WHERE produto_venda_id = $1 AND empresa_id = $2",
		id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tag, err := tx.Exec(r.Context(),
		"DELETE FROM produto_venda WHERE id = $1 AND empresa_id = $2",
		id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Produto de venda excluído com sucesso"})
}

// --- Item do Produto de Venda ---

func (h *ProducaoHandler) ProdutoVendaItemListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	produtoVendaID := parseInt(r.URL.Query().Get("produto_venda_id"), 0)

	query := `SELECT pvi.*, pv.nome as produto_venda_nome,
		ad.nome as adicional_nome, ad.preco as adicional_preco, ad.descricao as adicional_descricao,
		ad.ativo as adicional_ativo
		FROM produto_venda_item pvi
		LEFT JOIN produto_venda pv ON pv.id = pvi.produto_venda_id AND pv.empresa_id = pvi.empresa_id
		LEFT JOIN adicional ad ON ad.id = pvi.adicional_id AND ad.empresa_id = pvi.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND pvi.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoVendaID > 0 {
		query += fmt.Sprintf(" AND pvi.produto_venda_id = $%d", argN); argN++; args = append(args, produtoVendaID)
	}
	query += fmt.Sprintf(" AND (pvi.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY pvi.ordem, pvi.id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) ProdutoVendaItemAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "produto_venda_item",
		[]string{"produto_venda_id", "nome", "pode_remover", "pode_adicionar", "adicional_id", "ordem", "ativo"})
}

func (h *ProducaoHandler) ProdutoVendaItemExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "produto_venda_item")
}