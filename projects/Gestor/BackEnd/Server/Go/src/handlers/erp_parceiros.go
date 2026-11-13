package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"gestor-server/middleware"
)

type ErpEnderecoInput struct {
	ID            *int64  `json:"id"`
	Tipo          *int16  `json:"tipo"`
	Principal     *bool   `json:"principal"`
	CEP           *string `json:"cep"`
	Logradouro    *string `json:"logradouro"`
	Numero        *string `json:"numero"`
	Complemento   *string `json:"complemento"`
	Bairro        *string `json:"bairro"`
	Municipio     *string `json:"municipio"`
	UF            *string `json:"uf"`
	CodigoIBGE    *string `json:"codigo_ibge_municipio"`
	Pais          *string `json:"pais"`
	PaisCodigoISO *string `json:"pais_codigo_iso"`
	Referencia    *string `json:"referencia"`
	Status        *int16  `json:"status"`
}

type ErpTelefoneInput struct {
	Tipo      *int16  `json:"tipo"`
	Numero    *string `json:"numero"`
	Ramal     *string `json:"ramal"`
	WhatsApp  *bool   `json:"whatsapp"`
	Principal *bool   `json:"principal"`
	Status    *int16  `json:"status"`
}

type ErpEmailInput struct {
	Tipo      *int16  `json:"tipo"`
	Email     *string `json:"email"`
	Principal *bool   `json:"principal"`
	Status    *int16  `json:"status"`
}

type ErpRedeSocialInput struct {
	Tipo          *int16  `json:"tipo"`
	Identificador *string `json:"identificador"`
	URL           *string `json:"url"`
	Principal     *bool   `json:"principal"`
	Status        *int16  `json:"status"`
}

type ErpContatoInput struct {
	ID           *int64               `json:"id"`
	Nome         *string              `json:"nome"`
	Cargo        *string              `json:"cargo"`
	Departamento *string              `json:"departamento"`
	Principal    *bool                `json:"principal"`
	Observacao   *string              `json:"observacao"`
	Status       *int16               `json:"status"`
	Telefones    []ErpTelefoneInput   `json:"telefones"`
	Emails       []ErpEmailInput      `json:"emails"`
	Redes        []ErpRedeSocialInput `json:"redes"`
}

type ErpPessoaInput struct {
	ID                 *int64              `json:"id"`
	TipoPessoa         *string             `json:"tipo_pessoa"`
	TipoDocumento      *string             `json:"tipo_documento"`
	Documento          *string             `json:"documento"`
	Nome               *string             `json:"nome"`
	NomeFantasia       *string             `json:"nome_fantasia"`
	NomeAbreviado      *string             `json:"nome_abreviado"`
	InscricaoEstadual  *string             `json:"inscricao_estadual"`
	InscricaoMunicipal *string             `json:"inscricao_municipal"`
	InscricaoSuframa   *string             `json:"inscricao_suframa"`
	RegimeTributario   *int16              `json:"regime_tributario"`
	DataNascimento     *string             `json:"data_nascimento"`
	DataFundacao       *string             `json:"data_fundacao"`
	Sexo               *string             `json:"sexo"`
	EstadoCivil        *int16              `json:"estado_civil"`
	Profissao          *string             `json:"profissao"`
	Nacionalidade      *string             `json:"nacionalidade"`
	Naturalidade       *string             `json:"naturalidade"`
	LimiteCredito      *float64            `json:"limite_credito"`
	Observacao         *string             `json:"observacao"`
	Status             *int16              `json:"status"`
	Enderecos          *[]ErpEnderecoInput `json:"enderecos"`
	Contatos           *[]ErpContatoInput  `json:"contatos"`
}

type ErpClienteInput struct {
	ID                  *int64              `json:"id"`
	PessoaID            *int64              `json:"pessoa_id"`
	Codigo              *string             `json:"codigo"`
	CondicaoPagamentoID *int64              `json:"condicao_pagamento_id"`
	TabelaPrecoID       *int64              `json:"tabela_preco_id"`
	LimiteCredito       *float64            `json:"limite_credito"`
	DiaFechamento       *int16              `json:"dia_fechamento"`
	DiaVencimento       *int16              `json:"dia_vencimento"`
	Bloqueado           *bool               `json:"bloqueado"`
	MotivoBloqueio      *string             `json:"motivo_bloqueio"`
	Observacao          *string             `json:"observacao"`
	Status              *int16              `json:"status"`
	Pessoa              *ErpPessoaInput     `json:"pessoa"`
	Enderecos           *[]ErpEnderecoInput `json:"enderecos"`
	Contatos            *[]ErpContatoInput  `json:"contatos"`
}

type ErpFornecedorInput struct {
	ID                  *int64              `json:"id"`
	PessoaID            *int64              `json:"pessoa_id"`
	Codigo              *string             `json:"codigo"`
	Categoria           *int16              `json:"categoria"`
	CondicaoPagamentoID *int64              `json:"condicao_pagamento_id"`
	PrazoEntregaDias    *int16              `json:"prazo_entrega_dias"`
	Observacao          *string             `json:"observacao"`
	Status              *int16              `json:"status"`
	Pessoa              *ErpPessoaInput     `json:"pessoa"`
	Enderecos           *[]ErpEnderecoInput `json:"enderecos"`
	Contatos            *[]ErpContatoInput  `json:"contatos"`
}

func onlyDigits(s string) string {
	return strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, s)
}

func normalizeDocumento(tipo, doc string) (string, error) {
	tipo = strings.ToUpper(strings.TrimSpace(tipo))
	doc = strings.TrimSpace(doc)
	if tipo == "CPF" || tipo == "CNPJ" {
		digits := onlyDigits(doc)
		want := 11
		if tipo == "CNPJ" {
			want = 14
		}
		if len(digits) != want {
			return "", fmt.Errorf("%s deve conter %d dígitos", tipo, want)
		}
		return digits, nil
	}
	if doc == "" {
		return "", errors.New("documento é obrigatório")
	}
	return strings.ToUpper(doc), nil
}

func ptrAny[T any](p *T) any {
	if p == nil {
		return nil
	}
	return *p
}

func moneyText(p *float64) any {
	if p == nil {
		return nil
	}
	return strconv.FormatFloat(*p, 'f', 2, 64)
}

func nextErpIDTx(ctx context.Context, tx pgx.Tx, table string) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx,
		`SELECT nextval(pg_get_serial_sequence('erp.' || $1, 'id'))`, table).Scan(&id)
	return id, err
}

func salvarEnderecosTx(ctx context.Context, tx pgx.Tx, empresaID, userID int, pessoaID int64, list []ErpEnderecoInput) error {
	if _, err := tx.Exec(ctx,
		`DELETE FROM erp.endereco WHERE empresa_id = $1 AND pessoa_id = $2`, empresaID, pessoaID); err != nil {
		return err
	}

	principais := map[int16]bool{}
	for i := range list {
		tipo := int16(1)
		if list[i].Tipo != nil && *list[i].Tipo > 0 {
			tipo = *list[i].Tipo
		}
		if list[i].Principal != nil && *list[i].Principal {
			if principais[tipo] {
				f := false
				list[i].Principal = &f
			} else {
				principais[tipo] = true
			}
		}
	}

	for _, e := range list {
		id, err := nextErpIDTx(ctx, tx, "endereco")
		if err != nil {
			return err
		}
		tipo := int16(1)
		if e.Tipo != nil && *e.Tipo > 0 {
			tipo = *e.Tipo
		}
		principal := false
		if e.Principal != nil {
			principal = *e.Principal
		}
		status := int16(1)
		if e.Status != nil {
			status = *e.Status
		}
		cep := ""
		if e.CEP != nil {
			cep = onlyDigits(*e.CEP)
		}
		pais := "Brasil"
		if e.Pais != nil && strings.TrimSpace(*e.Pais) != "" {
			pais = strings.TrimSpace(*e.Pais)
		}
		paisISO := "BRA"
		if e.PaisCodigoISO != nil && strings.TrimSpace(*e.PaisCodigoISO) != "" {
			paisISO = strings.ToUpper(strings.TrimSpace(*e.PaisCodigoISO))
		}
		uf := ""
		if e.UF != nil {
			uf = strings.ToUpper(strings.TrimSpace(*e.UF))
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO erp.endereco
			(empresa_id, id, pessoa_id, tipo, principal, cep, logradouro, numero, complemento,
			 bairro, municipio, uf, codigo_ibge_municipio, pais, pais_codigo_iso, referencia,
			 status, criado_por)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
			empresaID, id, pessoaID, tipo, principal, cep,
			strings.TrimSpace(derefString(e.Logradouro)), strings.TrimSpace(derefString(e.Numero)),
			strings.TrimSpace(derefString(e.Complemento)), strings.TrimSpace(derefString(e.Bairro)),
			strings.TrimSpace(derefString(e.Municipio)), uf, strings.TrimSpace(derefString(e.CodigoIBGE)),
			pais, paisISO, strings.TrimSpace(derefString(e.Referencia)), status, userID)
		if err != nil {
			return err
		}
	}
	return nil
}

func derefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func salvarContatosTx(ctx context.Context, tx pgx.Tx, empresaID, userID int, pessoaID int64, list []ErpContatoInput) error {
	if _, err := tx.Exec(ctx,
		`DELETE FROM erp.contato WHERE empresa_id = $1 AND pessoa_id = $2`, empresaID, pessoaID); err != nil {
		return err
	}

	principalUsado := false
	for i := range list {
		if list[i].Principal != nil && *list[i].Principal {
			if principalUsado {
				f := false
				list[i].Principal = &f
			} else {
				principalUsado = true
			}
		}
	}

	for _, c := range list {
		id, err := nextErpIDTx(ctx, tx, "contato")
		if err != nil {
			return err
		}
		principal := false
		if c.Principal != nil {
			principal = *c.Principal
		}
		status := int16(1)
		if c.Status != nil {
			status = *c.Status
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO erp.contato
			(empresa_id, id, pessoa_id, nome, cargo, departamento, principal, observacao, status, criado_por)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			empresaID, id, pessoaID, strings.TrimSpace(derefString(c.Nome)),
			strings.TrimSpace(derefString(c.Cargo)), strings.TrimSpace(derefString(c.Departamento)),
			principal, strings.TrimSpace(derefString(c.Observacao)), status, userID)
		if err != nil {
			return err
		}

		phonePrincipal := false
		for _, p := range c.Telefones {
			if strings.TrimSpace(derefString(p.Numero)) == "" {
				continue
			}
			pid, err := nextErpIDTx(ctx, tx, "contato_telefone")
			if err != nil {
				return err
			}
			tipo := int16(1)
			if p.Tipo != nil && *p.Tipo > 0 {
				tipo = *p.Tipo
			}
			principalPhone := false
			if p.Principal != nil && *p.Principal && !phonePrincipal {
				principalPhone = true
				phonePrincipal = true
			}
			whats := false
			if p.WhatsApp != nil {
				whats = *p.WhatsApp
			}
			st := int16(1)
			if p.Status != nil {
				st = *p.Status
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO erp.contato_telefone
				(empresa_id, id, contato_id, tipo, numero, ramal, whatsapp, principal, status, criado_por)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				empresaID, pid, id, tipo, onlyDigits(derefString(p.Numero)),
				strings.TrimSpace(derefString(p.Ramal)), whats, principalPhone, st, userID)
			if err != nil {
				return err
			}
		}

		emailPrincipal := false
		for _, e := range c.Emails {
			mail := strings.TrimSpace(strings.ToLower(derefString(e.Email)))
			if mail == "" {
				continue
			}
			eid, err := nextErpIDTx(ctx, tx, "contato_email")
			if err != nil {
				return err
			}
			tipo := int16(1)
			if e.Tipo != nil && *e.Tipo > 0 {
				tipo = *e.Tipo
			}
			principalEmail := false
			if e.Principal != nil && *e.Principal && !emailPrincipal {
				principalEmail = true
				emailPrincipal = true
			}
			st := int16(1)
			if e.Status != nil {
				st = *e.Status
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO erp.contato_email
				(empresa_id, id, contato_id, tipo, email, principal, status, criado_por)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				empresaID, eid, id, tipo, mail, principalEmail, st, userID)
			if err != nil {
				return err
			}
		}

		redePrincipal := false
		for _, rs := range c.Redes {
			ident := strings.TrimSpace(derefString(rs.Identificador))
			if ident == "" {
				continue
			}
			rid, err := nextErpIDTx(ctx, tx, "contato_rede_social")
			if err != nil {
				return err
			}
			tipo := int16(1)
			if rs.Tipo != nil && *rs.Tipo > 0 {
				tipo = *rs.Tipo
			}
			principalRede := false
			if rs.Principal != nil && *rs.Principal && !redePrincipal {
				principalRede = true
				redePrincipal = true
			}
			st := int16(1)
			if rs.Status != nil {
				st = *rs.Status
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO erp.contato_rede_social
				(empresa_id, id, contato_id, tipo, identificador, url, principal, status, criado_por)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				empresaID, rid, id, tipo, ident, strings.TrimSpace(derefString(rs.URL)),
				principalRede, st, userID)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func salvarPessoaTx(ctx context.Context, tx pgx.Tx, empresaID, userID int, in ErpPessoaInput) (int64, error) {
	tipoPessoa := "F"
	if in.TipoPessoa != nil && strings.TrimSpace(*in.TipoPessoa) != "" {
		tipoPessoa = strings.ToUpper(strings.TrimSpace(*in.TipoPessoa))
	}
	tipoDoc := "CPF"
	if in.TipoDocumento != nil && strings.TrimSpace(*in.TipoDocumento) != "" {
		tipoDoc = strings.ToUpper(strings.TrimSpace(*in.TipoDocumento))
	}
	doc := ""
	if in.Documento != nil {
		doc = *in.Documento
	}

	id := int64(0)
	if in.ID != nil && *in.ID > 0 {
		id = *in.ID
	} else if strings.TrimSpace(doc) != "" {
		docLookup := strings.ToUpper(strings.TrimSpace(doc))
		if tipoDoc == "CPF" || tipoDoc == "CNPJ" {
			docLookup = onlyDigits(doc)
		}
		var found int64
		err := tx.QueryRow(ctx, `
			SELECT id FROM erp.pessoa
			WHERE empresa_id = $1 AND tipo_documento = $2 AND documento = $3
			LIMIT 1`, empresaID, tipoDoc, docLookup).Scan(&found)
		if err == nil {
			id = found
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return 0, err
		}
	}

	if id == 0 {
		if in.Nome == nil || strings.TrimSpace(*in.Nome) == "" {
			return 0, errors.New("nome é obrigatório")
		}
		normalized, err := normalizeDocumento(tipoDoc, doc)
		if err != nil {
			return 0, err
		}
		id, err = nextErpIDTx(ctx, tx, "pessoa")
		if err != nil {
			return 0, err
		}
		status := int16(1)
		if in.Status != nil {
			status = *in.Status
		}
		limite := "0"
		if in.LimiteCredito != nil {
			limite = strconv.FormatFloat(*in.LimiteCredito, 'f', 2, 64)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO erp.pessoa
			(empresa_id, id, tipo_pessoa, tipo_documento, documento, nome, nome_fantasia,
			 nome_abreviado, inscricao_estadual, inscricao_municipal, inscricao_suframa,
			 regime_tributario, data_nascimento, data_fundacao, sexo, estado_civil, profissao,
			 nacionalidade, naturalidade, limite_credito, observacao, status, criado_por)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
			 NULLIF($13,'')::date, NULLIF($14,'')::date, NULLIF($15,''), $16, $17, $18, $19,
			 $20::numeric, $21, $22, $23)`,
			empresaID, id, tipoPessoa, tipoDoc, normalized, strings.TrimSpace(*in.Nome),
			strings.TrimSpace(derefString(in.NomeFantasia)), strings.TrimSpace(derefString(in.NomeAbreviado)),
			strings.TrimSpace(derefString(in.InscricaoEstadual)), strings.TrimSpace(derefString(in.InscricaoMunicipal)),
			strings.TrimSpace(derefString(in.InscricaoSuframa)), ptrAny(in.RegimeTributario),
			strings.TrimSpace(derefString(in.DataNascimento)), strings.TrimSpace(derefString(in.DataFundacao)),
			strings.ToUpper(strings.TrimSpace(derefString(in.Sexo))), ptrAny(in.EstadoCivil),
			strings.TrimSpace(derefString(in.Profissao)), strings.TrimSpace(derefString(in.Nacionalidade)),
			strings.TrimSpace(derefString(in.Naturalidade)), limite,
			strings.TrimSpace(derefString(in.Observacao)), status, userID)
		if err != nil {
			return 0, err
		}
	} else {
		set := []string{}
		args := []any{}
		n := 1
		add := func(col string, val any, cast string) {
			if val == nil {
				return
			}
			if cast != "" {
				set = append(set, fmt.Sprintf("%s = CAST($%d::text AS %s)", col, n, cast))
			} else {
				set = append(set, fmt.Sprintf("%s = $%d", col, n))
			}
			if cast != "" {
				args = append(args, sqlStringValue(val))
			} else {
				args = append(args, val)
			}
			n++
		}
		if in.TipoPessoa != nil {
			add("tipo_pessoa", tipoPessoa, "character")
		}
		if in.TipoDocumento != nil {
			add("tipo_documento", tipoDoc, "text")
		}
		if in.Documento != nil {
			normalized, err := normalizeDocumento(tipoDoc, doc)
			if err != nil {
				return 0, err
			}
			add("documento", normalized, "text")
		}
		if in.Nome != nil {
			add("nome", strings.TrimSpace(*in.Nome), "text")
		}
		if in.NomeFantasia != nil {
			add("nome_fantasia", strings.TrimSpace(*in.NomeFantasia), "text")
		}
		if in.NomeAbreviado != nil {
			add("nome_abreviado", strings.TrimSpace(*in.NomeAbreviado), "text")
		}
		if in.InscricaoEstadual != nil {
			add("inscricao_estadual", strings.TrimSpace(*in.InscricaoEstadual), "text")
		}
		if in.InscricaoMunicipal != nil {
			add("inscricao_municipal", strings.TrimSpace(*in.InscricaoMunicipal), "text")
		}
		if in.InscricaoSuframa != nil {
			add("inscricao_suframa", strings.TrimSpace(*in.InscricaoSuframa), "text")
		}
		if in.RegimeTributario != nil {
			add("regime_tributario", *in.RegimeTributario, "smallint")
		}
		if in.DataNascimento != nil {
			add("data_nascimento", strings.TrimSpace(*in.DataNascimento), "date")
		}
		if in.DataFundacao != nil {
			add("data_fundacao", strings.TrimSpace(*in.DataFundacao), "date")
		}
		if in.Sexo != nil {
			add("sexo", strings.ToUpper(strings.TrimSpace(*in.Sexo)), "character")
		}
		if in.EstadoCivil != nil {
			add("estado_civil", *in.EstadoCivil, "smallint")
		}
		if in.Profissao != nil {
			add("profissao", strings.TrimSpace(*in.Profissao), "text")
		}
		if in.Nacionalidade != nil {
			add("nacionalidade", strings.TrimSpace(*in.Nacionalidade), "text")
		}
		if in.Naturalidade != nil {
			add("naturalidade", strings.TrimSpace(*in.Naturalidade), "text")
		}
		if in.LimiteCredito != nil {
			add("limite_credito", moneyText(in.LimiteCredito), "numeric")
		}
		if in.Observacao != nil {
			add("observacao", strings.TrimSpace(*in.Observacao), "text")
		}
		if in.Status != nil {
			add("status", *in.Status, "smallint")
		}
		if userID > 0 {
			add("atualizado_por", userID, "")
		}
		if len(set) > 0 {
			where := fmt.Sprintf("empresa_id = $%d AND id = $%d", n, n+1)
			args = append(args, empresaID, id)
			_, err := tx.Exec(ctx,
				fmt.Sprintf(`UPDATE erp.pessoa SET %s WHERE %s`, strings.Join(set, ", "), where),
				args...)
			if err != nil {
				return 0, err
			}
		}
	}

	enderecos := in.Enderecos
	if enderecos != nil {
		if err := salvarEnderecosTx(ctx, tx, empresaID, userID, id, *enderecos); err != nil {
			return 0, err
		}
	}
	contatos := in.Contatos
	if contatos != nil {
		if err := salvarContatosTx(ctx, tx, empresaID, userID, id, *contatos); err != nil {
			return 0, err
		}
	}
	return id, nil
}

func (h *ErpHandler) fetchPessoa(ctx context.Context, empresaID int, id int64) (map[string]any, error) {
	row, err := h.fetchErpRow(ctx, "pessoa", "id", empresaID, id)
	if err != nil {
		return nil, err
	}
	enderecos, err := h.jsonList(ctx, `
		SELECT row_to_json(e)::text FROM erp.endereco e
		WHERE e.pessoa_id = $1 AND ($2 = 0 OR e.empresa_id = $2)
		ORDER BY e.tipo, e.principal DESC, e.id`, id, empresaID)
	if err != nil {
		return nil, err
	}
	contatos, err := h.jsonList(ctx, `
		SELECT row_to_json(x)::text FROM (
			SELECT c.*, COALESCE((
				SELECT json_agg(t ORDER BY t.principal DESC, t.id)
				FROM erp.contato_telefone t
				WHERE t.contato_id = c.id AND ($2 = 0 OR t.empresa_id = $2)
			), '[]'::json) AS telefones, COALESCE((
				SELECT json_agg(e ORDER BY e.principal DESC, e.id)
				FROM erp.contato_email e
				WHERE e.contato_id = c.id AND ($2 = 0 OR e.empresa_id = $2)
			), '[]'::json) AS emails, COALESCE((
				SELECT json_agg(r ORDER BY r.principal DESC, r.id)
				FROM erp.contato_rede_social r
				WHERE r.contato_id = c.id AND ($2 = 0 OR r.empresa_id = $2)
			), '[]'::json) AS redes
			FROM erp.contato c
			WHERE c.pessoa_id = $1 AND ($2 = 0 OR c.empresa_id = $2)
			ORDER BY c.principal DESC, c.id
		) x`, id, empresaID)
	if err != nil {
		return nil, err
	}
	row["enderecos"] = enderecos
	row["contatos"] = contatos
	return row, nil
}

func (h *ErpHandler) fetchCliente(ctx context.Context, empresaID int, id int64) (map[string]any, error) {
	row, err := h.fetchErpRow(ctx, "cliente", "id", empresaID, id)
	if err != nil {
		return nil, err
	}
	var pessoaID int64
	if v, ok := row["pessoa_id"]; ok {
		pessoaID, _ = strconv.ParseInt(fmt.Sprint(v), 10, 64)
	}
	if pessoaID > 0 {
		pessoa, err := h.fetchPessoa(ctx, empresaID, pessoaID)
		if err != nil {
			return nil, err
		}
		row["pessoa"] = pessoa
		row["enderecos"] = pessoa["enderecos"]
		row["contatos"] = pessoa["contatos"]
	}
	return row, nil
}

func (h *ErpHandler) fetchFornecedor(ctx context.Context, empresaID int, id int64) (map[string]any, error) {
	row, err := h.fetchErpRow(ctx, "fornecedor", "id", empresaID, id)
	if err != nil {
		return nil, err
	}
	var pessoaID int64
	if v, ok := row["pessoa_id"]; ok {
		pessoaID, _ = strconv.ParseInt(fmt.Sprint(v), 10, 64)
	}
	if pessoaID > 0 {
		pessoa, err := h.fetchPessoa(ctx, empresaID, pessoaID)
		if err != nil {
			return nil, err
		}
		row["pessoa"] = pessoa
		row["enderecos"] = pessoa["enderecos"]
		row["contatos"] = pessoa["contatos"]
	}
	return row, nil
}

func (h *ErpHandler) PessoasListar(w http.ResponseWriter, r *http.Request) {
	empresaID := erpEmpresaRead(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	statusInt := -1
	if status != "" && status != "all" {
		statusInt, _ = strconv.Atoi(status)
	}
	list, err := h.jsonList(r.Context(), `
		SELECT row_to_json(x)::text FROM (
			SELECT p.*,
				(SELECT e.logradouro || COALESCE(', ' || NULLIF(e.numero,''), '') ||
					COALESCE(' - ' || NULLIF(e.bairro,''), '') ||
					COALESCE(' - ' || NULLIF(e.municipio,''), '') ||
					COALESCE('/' || NULLIF(e.uf,''), '') ||
					COALESCE(' - CEP ' || NULLIF(e.cep,''), '')
				 FROM erp.endereco e
				 WHERE e.pessoa_id = p.id AND e.empresa_id = p.empresa_id
				 ORDER BY e.principal DESC, e.id LIMIT 1) AS endereco_principal,
				(SELECT ct.numero FROM erp.contato_telefone ct
				 JOIN erp.contato c ON c.empresa_id = ct.empresa_id AND c.id = ct.contato_id
				 WHERE c.pessoa_id = p.id AND c.empresa_id = p.empresa_id
				 ORDER BY ct.principal DESC, ct.id LIMIT 1) AS telefone_principal,
				(SELECT ce.email FROM erp.contato_email ce
				 JOIN erp.contato c ON c.empresa_id = ce.empresa_id AND c.id = ce.contato_id
				 WHERE c.pessoa_id = p.id AND c.empresa_id = p.empresa_id
				 ORDER BY ce.principal DESC, ce.id LIMIT 1) AS email_principal
			FROM erp.pessoa p
			WHERE ($1 = 0 OR p.empresa_id = $1)
			  AND ($2 = '' OR p.nome ILIKE '%' || $2 || '%' OR p.documento ILIKE '%' || $2 || '%')
			  AND ($3 = -1 OR p.status = $3)
			ORDER BY p.nome
			LIMIT 500
		) x`, empresaID, q, statusInt)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, list)
}

func (h *ErpHandler) PessoaObter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}
	row, err := h.fetchPessoa(r.Context(), erpEmpresaRead(r), id)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Pessoa não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) PessoaSalvar(w http.ResponseWriter, r *http.Request) {
	var in ErpPessoaInput
	if err := decodeErpJson(r, &in); err != nil {
		JsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if raw := chi.URLParam(r, "id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			JsonError(w, "Identificador inválido", http.StatusBadRequest)
			return
		}
		in.ID = &id
	}
	empresaID := erpEmpresaWrite(r)
	if empresaID <= 0 {
		JsonError(w, "Empresa não identificada", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		erpError(w, err)
		return
	}
	defer tx.Rollback(ctx)

	id, err := salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), in)
	if err != nil {
		erpError(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		erpError(w, err)
		return
	}
	row, err := h.fetchPessoa(ctx, empresaID, id)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) PessoaExcluir(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}
	empresaID := erpEmpresaWrite(r)
	_, err = h.Pool.Exec(r.Context(), `
		UPDATE erp.pessoa SET status = 0, atualizado_por = $1
		WHERE empresa_id = $2 AND id = $3`, middleware.GetUserID(r), empresaID, id)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, map[string]bool{"sucesso": true})
}

func (h *ErpHandler) ClientesListar(w http.ResponseWriter, r *http.Request) {
	h.parceirosListar(w, r, "cliente")
}

func (h *ErpHandler) FornecedoresListar(w http.ResponseWriter, r *http.Request) {
	h.parceirosListar(w, r, "fornecedor")
}

func (h *ErpHandler) parceirosListar(w http.ResponseWriter, r *http.Request, tabela string) {
	empresaID := erpEmpresaRead(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	statusInt := -1
	if status != "" && status != "all" {
		statusInt, _ = strconv.Atoi(status)
	}
	extra := ""
	if tabela == "fornecedor" {
		extra = ", f.categoria"
	}
	list, err := h.jsonList(r.Context(), fmt.Sprintf(`
		SELECT row_to_json(x)::text FROM (
			SELECT f.*%s, p.nome, p.nome_fantasia, p.documento, p.tipo_pessoa, p.tipo_documento,
				(SELECT e.logradouro || COALESCE(', ' || NULLIF(e.numero,''), '') ||
					COALESCE(' - ' || NULLIF(e.bairro,''), '') ||
					COALESCE(' - ' || NULLIF(e.municipio,''), '') ||
					COALESCE('/' || NULLIF(e.uf,''), '')
				 FROM erp.endereco e
				 WHERE e.pessoa_id = p.id AND e.empresa_id = p.empresa_id
				 ORDER BY e.principal DESC, e.id LIMIT 1) AS endereco_principal,
				(SELECT ct.numero FROM erp.contato_telefone ct
				 JOIN erp.contato c ON c.empresa_id = ct.empresa_id AND c.id = ct.contato_id
				 WHERE c.pessoa_id = p.id AND c.empresa_id = p.empresa_id
				 ORDER BY ct.principal DESC, ct.id LIMIT 1) AS telefone_principal,
				(SELECT ce.email FROM erp.contato_email ce
				 JOIN erp.contato c ON c.empresa_id = ce.empresa_id AND c.id = ce.contato_id
				 WHERE c.pessoa_id = p.id AND c.empresa_id = p.empresa_id
				 ORDER BY ce.principal DESC, ce.id LIMIT 1) AS email_principal
			FROM erp.%s f
			JOIN erp.pessoa p ON p.empresa_id = f.empresa_id AND p.id = f.pessoa_id
			WHERE ($1 = 0 OR f.empresa_id = $1)
			  AND ($2 = '' OR p.nome ILIKE '%%' || $2 || '%%' OR p.documento ILIKE '%%' || $2 || '%%' OR f.codigo ILIKE '%%' || $2 || '%%')
			  AND ($3 = -1 OR f.status = $3)
			ORDER BY p.nome
			LIMIT 500
		) x`, extra, quoteIdent(tabela)), empresaID, q, statusInt)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, list)
}

func (h *ErpHandler) ClienteObter(w http.ResponseWriter, r *http.Request) {
	h.parceiroObter(w, r, "cliente", h.fetchCliente)
}

func (h *ErpHandler) FornecedorObter(w http.ResponseWriter, r *http.Request) {
	h.parceiroObter(w, r, "fornecedor", h.fetchFornecedor)
}

func (h *ErpHandler) parceiroObter(w http.ResponseWriter, r *http.Request, _ string, fetch func(context.Context, int, int64) (map[string]any, error)) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}
	row, err := fetch(r.Context(), erpEmpresaRead(r), id)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) ClienteSalvar(w http.ResponseWriter, r *http.Request) {
	var in ErpClienteInput
	if err := decodeErpJson(r, &in); err != nil {
		JsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if raw := chi.URLParam(r, "id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			JsonError(w, "Identificador inválido", http.StatusBadRequest)
			return
		}
		in.ID = &id
	}
	h.salvarCliente(w, r, in)
}

func (h *ErpHandler) FornecedorSalvar(w http.ResponseWriter, r *http.Request) {
	var in ErpFornecedorInput
	if err := decodeErpJson(r, &in); err != nil {
		JsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if raw := chi.URLParam(r, "id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			JsonError(w, "Identificador inválido", http.StatusBadRequest)
			return
		}
		in.ID = &id
	}
	h.salvarFornecedor(w, r, in)
}

func attachPessoaArrays(pessoa *ErpPessoaInput, enderecos *[]ErpEnderecoInput, contatos *[]ErpContatoInput) {
	if pessoa == nil {
		return
	}
	if enderecos != nil {
		pessoa.Enderecos = enderecos
	}
	if contatos != nil {
		pessoa.Contatos = contatos
	}
}

func (h *ErpHandler) salvarCliente(w http.ResponseWriter, r *http.Request, in ErpClienteInput) {
	empresaID := erpEmpresaWrite(r)
	if empresaID <= 0 {
		JsonError(w, "Empresa não identificada", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		erpError(w, err)
		return
	}
	defer tx.Rollback(ctx)

	if (in.PessoaID == nil || *in.PessoaID == 0) && in.ID != nil && *in.ID > 0 {
		var found int64
		if err := tx.QueryRow(ctx, `SELECT pessoa_id FROM erp.cliente WHERE empresa_id = $1 AND id = $2`,
			empresaID, *in.ID).Scan(&found); err == nil {
			in.PessoaID = &found
		}
	}

	var pessoaID int64
	if in.PessoaID != nil && *in.PessoaID > 0 {
		pessoaID = *in.PessoaID
		if in.Pessoa != nil {
			in.Pessoa.ID = &pessoaID
			attachPessoaArrays(in.Pessoa, in.Enderecos, in.Contatos)
			pessoaID, err = salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), *in.Pessoa)
			if err != nil {
				erpError(w, err)
				return
			}
		} else if in.Enderecos != nil || in.Contatos != nil {
			update := ErpPessoaInput{ID: &pessoaID, Enderecos: in.Enderecos, Contatos: in.Contatos}
			if _, err := salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), update); err != nil {
				erpError(w, err)
				return
			}
		}
	} else {
		if in.Pessoa == nil {
			JsonError(w, "Dados da pessoa são obrigatórios", http.StatusBadRequest)
			return
		}
		attachPessoaArrays(in.Pessoa, in.Enderecos, in.Contatos)
		pessoaID, err = salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), *in.Pessoa)
		if err != nil {
			erpError(w, err)
			return
		}
	}

	id := int64(0)
	if in.ID != nil && *in.ID > 0 {
		id = *in.ID
	} else {
		var found int64
		err := tx.QueryRow(ctx, `SELECT id FROM erp.cliente WHERE empresa_id = $1 AND pessoa_id = $2 LIMIT 1`,
			empresaID, pessoaID).Scan(&found)
		if err == nil {
			id = found
		} else if !errors.Is(err, pgx.ErrNoRows) {
			erpError(w, err)
			return
		}
	}

	if id == 0 {
		id, err = nextErpIDTx(ctx, tx, "cliente")
		if err != nil {
			erpError(w, err)
			return
		}
		codigo := strings.TrimSpace(derefString(in.Codigo))
		if codigo == "" {
			codigo = fmt.Sprintf("C%06d", id)
		}
		status := int16(1)
		if in.Status != nil {
			status = *in.Status
		}
		limite := "0"
		if in.LimiteCredito != nil {
			limite = strconv.FormatFloat(*in.LimiteCredito, 'f', 2, 64)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO erp.cliente
			(empresa_id, id, pessoa_id, codigo, condicao_pagamento_id, tabela_preco_id,
			 limite_credito, dia_fechamento, dia_vencimento, bloqueado, motivo_bloqueio,
			 observacao, status, criado_por)
			VALUES ($1,$2,$3,$4,$5,$6,$7::numeric,$8,$9,COALESCE($10,false),$11,$12,$13,$14)`,
			empresaID, id, pessoaID, codigo, ptrAny(in.CondicaoPagamentoID), ptrAny(in.TabelaPrecoID),
			limite, ptrAny(in.DiaFechamento), ptrAny(in.DiaVencimento), ptrAny(in.Bloqueado),
			strings.TrimSpace(derefString(in.MotivoBloqueio)), strings.TrimSpace(derefString(in.Observacao)),
			status, middleware.GetUserID(r))
		if err != nil {
			erpError(w, err)
			return
		}
	} else {
		set := []string{}
		args := []any{}
		n := 1
		add := func(col string, val any, cast string) {
			if val == nil {
				return
			}
			if cast != "" {
				set = append(set, fmt.Sprintf("%s = CAST($%d::text AS %s)", col, n, cast))
			} else {
				set = append(set, fmt.Sprintf("%s = $%d", col, n))
			}
			if cast != "" {
				args = append(args, sqlStringValue(val))
			} else {
				args = append(args, val)
			}
			n++
		}
		if in.Codigo != nil {
			add("codigo", strings.TrimSpace(*in.Codigo), "text")
		}
		if in.CondicaoPagamentoID != nil {
			add("condicao_pagamento_id", *in.CondicaoPagamentoID, "bigint")
		}
		if in.TabelaPrecoID != nil {
			add("tabela_preco_id", *in.TabelaPrecoID, "bigint")
		}
		if in.LimiteCredito != nil {
			add("limite_credito", moneyText(in.LimiteCredito), "numeric")
		}
		if in.DiaFechamento != nil {
			add("dia_fechamento", *in.DiaFechamento, "smallint")
		}
		if in.DiaVencimento != nil {
			add("dia_vencimento", *in.DiaVencimento, "smallint")
		}
		if in.Bloqueado != nil {
			add("bloqueado", *in.Bloqueado, "")
		}
		if in.MotivoBloqueio != nil {
			add("motivo_bloqueio", strings.TrimSpace(*in.MotivoBloqueio), "text")
		}
		if in.Observacao != nil {
			add("observacao", strings.TrimSpace(*in.Observacao), "text")
		}
		if in.Status != nil {
			add("status", *in.Status, "smallint")
		}
		add("atualizado_por", middleware.GetUserID(r), "")
		if len(set) > 0 {
			where := fmt.Sprintf("empresa_id = $%d AND id = $%d", n, n+1)
			args = append(args, empresaID, id)
			_, err := tx.Exec(ctx,
				fmt.Sprintf(`UPDATE erp.cliente SET %s WHERE %s`, strings.Join(set, ", "), where), args...)
			if err != nil {
				erpError(w, err)
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		erpError(w, err)
		return
	}
	row, err := h.fetchCliente(ctx, empresaID, id)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) salvarFornecedor(w http.ResponseWriter, r *http.Request, in ErpFornecedorInput) {
	empresaID := erpEmpresaWrite(r)
	if empresaID <= 0 {
		JsonError(w, "Empresa não identificada", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		erpError(w, err)
		return
	}
	defer tx.Rollback(ctx)

	if (in.PessoaID == nil || *in.PessoaID == 0) && in.ID != nil && *in.ID > 0 {
		var found int64
		if err := tx.QueryRow(ctx, `SELECT pessoa_id FROM erp.fornecedor WHERE empresa_id = $1 AND id = $2`,
			empresaID, *in.ID).Scan(&found); err == nil {
			in.PessoaID = &found
		}
	}

	var pessoaID int64
	if in.PessoaID != nil && *in.PessoaID > 0 {
		pessoaID = *in.PessoaID
		if in.Pessoa != nil {
			in.Pessoa.ID = &pessoaID
			attachPessoaArrays(in.Pessoa, in.Enderecos, in.Contatos)
			pessoaID, err = salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), *in.Pessoa)
			if err != nil {
				erpError(w, err)
				return
			}
		} else if in.Enderecos != nil || in.Contatos != nil {
			update := ErpPessoaInput{ID: &pessoaID, Enderecos: in.Enderecos, Contatos: in.Contatos}
			if _, err := salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), update); err != nil {
				erpError(w, err)
				return
			}
		}
	} else {
		if in.Pessoa == nil {
			JsonError(w, "Dados da pessoa são obrigatórios", http.StatusBadRequest)
			return
		}
		attachPessoaArrays(in.Pessoa, in.Enderecos, in.Contatos)
		pessoaID, err = salvarPessoaTx(ctx, tx, empresaID, middleware.GetUserID(r), *in.Pessoa)
		if err != nil {
			erpError(w, err)
			return
		}
	}

	id := int64(0)
	if in.ID != nil && *in.ID > 0 {
		id = *in.ID
	} else {
		var found int64
		err := tx.QueryRow(ctx, `SELECT id FROM erp.fornecedor WHERE empresa_id = $1 AND pessoa_id = $2 LIMIT 1`,
			empresaID, pessoaID).Scan(&found)
		if err == nil {
			id = found
		} else if !errors.Is(err, pgx.ErrNoRows) {
			erpError(w, err)
			return
		}
	}

	if id == 0 {
		id, err = nextErpIDTx(ctx, tx, "fornecedor")
		if err != nil {
			erpError(w, err)
			return
		}
		codigo := strings.TrimSpace(derefString(in.Codigo))
		if codigo == "" {
			codigo = fmt.Sprintf("F%06d", id)
		}
		status := int16(1)
		if in.Status != nil {
			status = *in.Status
		}
		categoria := int16(1)
		if in.Categoria != nil {
			categoria = *in.Categoria
		}
		prazo := int16(0)
		if in.PrazoEntregaDias != nil {
			prazo = *in.PrazoEntregaDias
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO erp.fornecedor
			(empresa_id, id, pessoa_id, codigo, categoria, condicao_pagamento_id,
			 prazo_entrega_dias, observacao, status, criado_por)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			empresaID, id, pessoaID, codigo, categoria, ptrAny(in.CondicaoPagamentoID),
			prazo, strings.TrimSpace(derefString(in.Observacao)), status, middleware.GetUserID(r))
		if err != nil {
			erpError(w, err)
			return
		}
	} else {
		set := []string{}
		args := []any{}
		n := 1
		add := func(col string, val any, cast string) {
			if val == nil {
				return
			}
			if cast != "" {
				set = append(set, fmt.Sprintf("%s = CAST($%d::text AS %s)", col, n, cast))
			} else {
				set = append(set, fmt.Sprintf("%s = $%d", col, n))
			}
			if cast != "" {
				args = append(args, sqlStringValue(val))
			} else {
				args = append(args, val)
			}
			n++
		}
		if in.Codigo != nil {
			add("codigo", strings.TrimSpace(*in.Codigo), "text")
		}
		if in.Categoria != nil {
			add("categoria", *in.Categoria, "smallint")
		}
		if in.CondicaoPagamentoID != nil {
			add("condicao_pagamento_id", *in.CondicaoPagamentoID, "bigint")
		}
		if in.PrazoEntregaDias != nil {
			add("prazo_entrega_dias", *in.PrazoEntregaDias, "smallint")
		}
		if in.Observacao != nil {
			add("observacao", strings.TrimSpace(*in.Observacao), "text")
		}
		if in.Status != nil {
			add("status", *in.Status, "smallint")
		}
		add("atualizado_por", middleware.GetUserID(r), "")
		if len(set) > 0 {
			where := fmt.Sprintf("empresa_id = $%d AND id = $%d", n, n+1)
			args = append(args, empresaID, id)
			_, err := tx.Exec(ctx,
				fmt.Sprintf(`UPDATE erp.fornecedor SET %s WHERE %s`, strings.Join(set, ", "), where), args...)
			if err != nil {
				erpError(w, err)
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		erpError(w, err)
		return
	}
	row, err := h.fetchFornecedor(ctx, empresaID, id)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) ClienteExcluir(w http.ResponseWriter, r *http.Request) {
	h.parceiroExcluir(w, r, "cliente")
}

func (h *ErpHandler) FornecedorExcluir(w http.ResponseWriter, r *http.Request) {
	h.parceiroExcluir(w, r, "fornecedor")
}

func (h *ErpHandler) parceiroExcluir(w http.ResponseWriter, r *http.Request, tabela string) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}
	empresaID := erpEmpresaWrite(r)
	_, err = h.Pool.Exec(r.Context(), fmt.Sprintf(`
		UPDATE erp.%s SET status = 0, atualizado_por = $1
		WHERE empresa_id = $2 AND id = $3`, quoteIdent(tabela)),
		middleware.GetUserID(r), empresaID, id)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, map[string]bool{"sucesso": true})
}

func decodeErpJson(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}
