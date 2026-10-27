package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"gestor-server/middleware"
)

// Esquema do banco para o montador de relatorios (aba "Montar Relatorio"):
// lista tabelas, colunas (com PK) e chaves estrangeiras para que o frontend
// consiga montar SELECTs com JOIN automatico entre tabelas relacionadas.
var (
	relatorioIaSchemaCache   []byte
	relatorioIaSchemaCacheEm time.Time
	relatorioIaSchemaCacheMu sync.Mutex
)

const relatorioIaSchemaTTL = 10 * time.Minute

type schemaColuna struct {
	Nome string `json:"nome"`
	Tipo string `json:"tipo"`
	PK   bool   `json:"pk"`
}

type schemaFK struct {
	Coluna    string `json:"coluna"`
	TabelaRef string `json:"tabela_ref"`
	ColunaRef string `json:"coluna_ref"`
}

type schemaTabela struct {
	Nome       string        `json:"nome"`
	TemEmpresa bool          `json:"tem_empresa"`
	Colunas    []schemaColuna `json:"colunas"`
	FKs        []schemaFK     `json:"fk"`
}

// Schema devolve tabelas/colunas/FKs do schema public (com cache de 10 min).
// GET /relatorio-ia/schema
func (h *RelatorioIAHandler) Schema(w http.ResponseWriter, r *http.Request) {
	relatorioIaSchemaCacheMu.Lock()
	if relatorioIaSchemaCache != nil && time.Since(relatorioIaSchemaCacheEm) < relatorioIaSchemaTTL {
		cached := relatorioIaSchemaCache
		relatorioIaSchemaCacheMu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(cached)
		return
	}
	relatorioIaSchemaCacheMu.Unlock()

	ordem := []string{}
	tabelas := map[string]*schemaTabela{}

	rows, err := h.Pool.Query(r.Context(), `
		SELECT c.table_name, c.column_name, c.data_type,
		       (a.attnum = ANY(pc.conkey)) AS pk
		FROM information_schema.columns c
		JOIN pg_class cls ON cls.relname = c.table_name AND cls.relnamespace = 'public'::regnamespace
		JOIN pg_attribute a ON a.attrelid = cls.oid AND a.attname = c.column_name AND NOT a.attisdropped
		LEFT JOIN pg_constraint pc ON pc.conrelid = cls.oid AND pc.contype = 'p'
		JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND t.table_type = 'BASE TABLE'
		  AND c.table_name NOT IN ('_migrations', 'relatorio_ia_conversa', 'relatorio_ia_mensagem', 'relatorio_ia_log')
		ORDER BY c.table_name, c.ordinal_position`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var nomeTabela, nomeColuna, tipo string
		var pk bool
		if err := rows.Scan(&nomeTabela, &nomeColuna, &tipo, &pk); err != nil {
			continue
		}
		t, ok := tabelas[nomeTabela]
		if !ok {
			t = &schemaTabela{Nome: nomeTabela, Colunas: []schemaColuna{}, FKs: []schemaFK{}}
			tabelas[nomeTabela] = t
			ordem = append(ordem, nomeTabela)
		}
		t.Colunas = append(t.Colunas, schemaColuna{Nome: nomeColuna, Tipo: tipo, PK: pk})
		if nomeColuna == "empresa_id" {
			t.TemEmpresa = true
		}
	}

	fkRows, err := h.Pool.Query(r.Context(), `
		SELECT c.conrelid::regclass::text AS tabela,
		       a1.attname AS coluna,
		       c.confrelid::regclass::text AS tabela_ref,
		       a2.attname AS coluna_ref
		FROM pg_constraint c
		JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
		JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS rk(attnum, ord) ON rk.ord = k.ord
		JOIN pg_attribute a1 ON a1.attrelid = c.conrelid AND a1.attnum = k.attnum
		JOIN pg_attribute a2 ON a2.attrelid = c.confrelid AND a2.attnum = rk.attnum
		WHERE c.contype = 'f'
		  AND c.connamespace = 'public'::regnamespace
		ORDER BY 1, 2`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer fkRows.Close()

	for fkRows.Next() {
		var tabela, coluna, tabelaRef, colunaRef string
		if err := fkRows.Scan(&tabela, &coluna, &tabelaRef, &colunaRef); err != nil {
			continue
		}
		if t, ok := tabelas[tabela]; ok {
			t.FKs = append(t.FKs, schemaFK{Coluna: coluna, TabelaRef: tabelaRef, ColunaRef: colunaRef})
		}
	}

	lista := make([]schemaTabela, 0, len(ordem))
	for _, nome := range ordem {
		lista = append(lista, *tabelas[nome])
	}

	payload := map[string]interface{}{
		"empresa_id": middleware.GetEmpresaLogada(r),
		"tabelas":    lista,
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		jsonError(w, "Erro ao montar esquema", http.StatusInternalServerError)
		return
	}

	relatorioIaSchemaCacheMu.Lock()
	relatorioIaSchemaCache = bytes
	relatorioIaSchemaCacheEm = time.Now()
	relatorioIaSchemaCacheMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(bytes)
}
