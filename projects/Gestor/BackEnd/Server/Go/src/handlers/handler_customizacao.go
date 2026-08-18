package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"

	"gestor-server/database"
	"gestor-server/middleware"
)

// adicionalItem contém os dados de um adicional aplicado a um item de encomenda
// ou venda (snapshot de nome e preço na gravação).
type adicionalItem struct {
	AdicionalID        int
	ProdutoVendaItemID int
	Nome               string
	Quantidade         float64
	ValorUnitario      float64
	ValorTotal         float64
}

// removidoItem contém o nome de um ingrediente/item removido e, quando proveniente
// de um produto de venda, a referência ao item da receita comercial.
type removidoItem struct {
	Nome               string
	ProdutoVendaItemID int
}

// parseItemRemovidosAdicionais extrai "removidos" e "adicionais" de um item do
// payload de encomenda/venda.
// - removidos: lista de strings (nomes) ou objetos { nome, produto_venda_item_id? }
// - adicionais: objetos { adicional_id?, produto_venda_item_id?, nome, quantidade, valor_unitario }
func parseItemRemovidosAdicionais(item map[string]interface{}) ([]removidoItem, []adicionalItem) {
	var removidos []removidoItem
	if raw, ok := item["removidos"]; ok {
		if arr, ok := raw.([]interface{}); ok {
			for _, v := range arr {
				switch val := v.(type) {
				case string:
					if val != "" {
						removidos = append(removidos, removidoItem{Nome: val})
					}
				default:
					if obj, ok := val.(map[string]interface{}); ok {
						nome := getStr(obj, "nome")
						if nome != "" {
							removidos = append(removidos, removidoItem{
								Nome:               nome,
								ProdutoVendaItemID: getInt(obj, "produto_venda_item_id"),
							})
						}
					}
				}
			}
		}
	}

	var adicionais []adicionalItem
	if raw, ok := item["adicionais"]; ok {
		if arr, ok := raw.([]interface{}); ok {
			for _, v := range arr {
				extra, ok := v.(map[string]interface{})
				if !ok {
					continue
				}
				nome := getStr(extra, "nome")
				if nome == "" {
					continue
				}
				quantidade := getFloat(extra, "quantidade")
				if quantidade <= 0 {
					quantidade = 1
				}
				valorUnitario := getFloat(extra, "valor_unitario")
				adicionais = append(adicionais, adicionalItem{
					AdicionalID:        getInt(extra, "adicional_id"),
					ProdutoVendaItemID: getInt(extra, "produto_venda_item_id"),
					Nome:               nome,
					Quantidade:         quantidade,
					ValorUnitario:      valorUnitario,
					ValorTotal:         quantidade * valorUnitario,
				})
			}
		}
	}
	return removidos, adicionais
}

// salvarCustomizacaoItem persiste os ingredientes/itens removidos e os adicionais de um
// item de encomenda ou venda. Devolve o valor total acrescido pelos adicionais.
func salvarCustomizacaoItem(ctx context.Context, tx pgx.Tx, empresaID, itemID int,
	colItem string, tabelaRemovidos string, tabelaAdicionais string,
	item map[string]interface{}) (float64, error) {

	removidos, adicionais := parseItemRemovidosAdicionais(item)

	for _, rem := range removidos {
		id, err := database.GerarID(ctx, tx, empresaID, tabelaRemovidos)
		if err != nil {
			return 0, err
		}
		var pviID interface{}
		if rem.ProdutoVendaItemID > 0 {
			pviID = rem.ProdutoVendaItemID
		}
		_, err = tx.Exec(ctx, fmt.Sprintf(
			"INSERT INTO %s (empresa_id, id, %s, nome, produto_venda_item_id) VALUES ($1,$2,$3,$4,$5)",
			tabelaRemovidos, colItem),
			empresaID, id, itemID, rem.Nome, pviID)
		if err != nil {
			return 0, err
		}
	}

	var adicionalValor float64
	for _, a := range adicionais {
		id, err := database.GerarID(ctx, tx, empresaID, tabelaAdicionais)
		if err != nil {
			return 0, err
		}

		// O preco do adicional e autoritativo: vem da tabela adicional
		// (quando vinculado), independente do valor enviado pelo cliente.
		var preco float64
		if a.AdicionalID > 0 {
			err = tx.QueryRow(ctx,
				"SELECT COALESCE(preco, 0) FROM adicional WHERE id = $1 AND empresa_id = $2",
				a.AdicionalID, empresaID).Scan(&preco)
			if err != nil {
				return 0, err
			}
		} else {
			preco = a.ValorUnitario
		}

		valorTotal := a.Quantidade * preco

		var adicionalID interface{}
		if a.AdicionalID > 0 {
			adicionalID = a.AdicionalID
		}
		var pviID interface{}
		if a.ProdutoVendaItemID > 0 {
			pviID = a.ProdutoVendaItemID
		}
		_, err = tx.Exec(ctx, fmt.Sprintf(
			"INSERT INTO %s (empresa_id, id, %s, adicional_id, nome, quantidade, valor_unitario, valor_total, produto_venda_item_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
			tabelaAdicionais, colItem),
			empresaID, id, itemID, adicionalID, a.Nome,
			a.Quantidade, preco, valorTotal, pviID)
		if err != nil {
			return 0, err
		}
		adicionalValor += valorTotal
	}
	return adicionalValor, nil
}

// apagarCustomizacaoDeItens apaga os registros de customização (removidos/adicionais)
// de todos os itens de uma encomenda ou venda.
func apagarCustomizacaoDeItens(ctx context.Context, tx pgx.Tx, empresaID, paiID int,
	tabelaItens string, colPai string, colItem string, tabelaRemovidos, tabelaAdicionais string) error {
	sub := fmt.Sprintf("SELECT id FROM %s WHERE %s = $1 AND empresa_id = $2", tabelaItens, colPai)
	for _, tabela := range []string{tabelaRemovidos, tabelaAdicionais} {
		_, err := tx.Exec(ctx,
			fmt.Sprintf("DELETE FROM %s WHERE %s IN (%s)", tabela, colItem, sub),
			paiID, empresaID)
		if err != nil {
			return err
		}
	}
	return nil
}

// --- Adicional ---
func (h *ProducaoHandler) AdicionalListar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Listar(w, r, "producao", "adicional", "", "", "")
}

func (h *ProducaoHandler) AdicionalAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "adicional",
		[]string{"nome", "descricao", "preco", "ativo"})
}

func (h *ProducaoHandler) AdicionalExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "adicional")
}

// --- Produto Adicional (vínculo produto -> adicionais disponíveis) ---
func (h *ProducaoHandler) ProdutoAdicionalListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)

	query := `SELECT pa.produto_fabricado_id, pa.adicional_id, ad.nome as adicional_nome,
		ad.descricao as adicional_descricao, ad.preco as adicional_preco, ad.ativo as adicional_ativo
		FROM produto_adicional pa
		JOIN adicional ad ON ad.id = pa.adicional_id AND ad.empresa_id = pa.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND pa.produto_fabricado_id = $%d", argN)
		argN++
		args = append(args, produtoFabricadoID)
	}
	query += fmt.Sprintf(" AND (pa.empresa_id = $%d OR $%d = 0)", argN, argN)
	args = append(args, empresaID)
	query += " ORDER BY ad.nome"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

// ProdutoAdicionalAtualizar substitui todos os vínculos de adicionais do(s) produto(s).
// Body: { produto_fabricado_id, adicionais: [adicional_id, ...] }
// ou array de { produto_fabricado_id, adicional_id }.
func (h *ProducaoHandler) ProdutoAdicionalAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil || len(items) == 0 {
		jsonError(w, "Dados não informados", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	pares := map[int]map[int]bool{}
	if v, ok := items[0]["adicionais"]; ok {
		produtoFabricadoID := getInt(items[0], "produto_fabricado_id")
		if produtoFabricadoID == 0 {
			jsonError(w, "produto_fabricado_id é obrigatório", http.StatusBadRequest)
			return
		}
		if arr, ok := v.([]interface{}); ok {
			conj := map[int]bool{}
			for _, raw := range arr {
				switch val := raw.(type) {
				case float64:
					conj[int(val)] = true
				default:
					if obj, ok := val.(map[string]interface{}); ok {
						conj[getInt(obj, "adicional_id")] = true
					}
				}
			}
			pares[produtoFabricadoID] = conj
		}
	} else {
		for _, item := range items {
			produtoFabricadoID := getInt(item, "produto_fabricado_id")
			adicionalID := getInt(item, "adicional_id")
			if produtoFabricadoID == 0 || adicionalID == 0 {
				continue
			}
			if pares[produtoFabricadoID] == nil {
				pares[produtoFabricadoID] = map[int]bool{}
			}
			pares[produtoFabricadoID][adicionalID] = true
		}
	}

	if len(pares) == 0 {
		jsonError(w, "Nenhum vínculo informado", http.StatusBadRequest)
		return
	}

	for produtoFabricadoID, adicionaisIDs := range pares {
		_, err = tx.Exec(r.Context(), `
			DELETE FROM produto_adicional WHERE produto_fabricado_id = $1 AND empresa_id = $2`,
			produtoFabricadoID, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for adicionalID := range adicionaisIDs {
			if adicionalID == 0 {
				continue
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO produto_adicional (empresa_id, produto_fabricado_id, adicional_id)
				VALUES ($1,$2,$3)`,
				empresaID, produtoFabricadoID, adicionalID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Adicionais do produto atualizados com sucesso"})
}

func (h *ProducaoHandler) ProdutoAdicionalExcluir(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)
	adicionalID := parseInt(r.URL.Query().Get("adicional_id"), 0)
	if produtoFabricadoID == 0 || adicionalID == 0 {
		jsonError(w, "produto_fabricado_id e adicional_id são obrigatórios", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `
		DELETE FROM produto_adicional WHERE produto_fabricado_id = $1 AND adicional_id = $2 AND empresa_id = $3`,
		produtoFabricadoID, adicionalID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Vínculo excluído com sucesso"})
}
