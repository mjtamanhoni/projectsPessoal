package handlers

import (
	"regexp"
	"strings"
)

var documentoRe = regexp.MustCompile(`[^0-9A-Za-z]`)

// normalizarDocumento remove pontuação e mantém dígitos e letras, convertendo
// para maiúsculas. Suporta CPF (11 dígitos) e CNPJ numérico ou alfanumérico
// (IN RFB nº 2.229/2024).
func normalizarDocumento(s string) string {
	return strings.ToUpper(documentoRe.ReplaceAllString(s, ""))
}

func cnpjPossuiLetra(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 'A' && s[i] <= 'Z' {
			return true
		}
	}
	return false
}

// validarCnpj valida um CNPJ numérico ou alfanumérico de 14 posições,
// conferindo os dois dígitos verificadores pelo algoritmo oficial.
func validarCnpj(cnpj string) bool {
	cnpj = normalizarDocumento(cnpj)
	if len(cnpj) != 14 {
		return false
	}
	for i := 0; i < 12; i++ {
		c := cnpj[i]
		if (c < '0' || c > '9') && (c < 'A' || c > 'Z') {
			return false
		}
	}
	if cnpj[12] < '0' || cnpj[12] > '9' || cnpj[13] < '0' || cnpj[13] > '9' {
		return false
	}
	dv1 := digitoCnpj(cnpj[:12], []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2})
	dv2 := digitoCnpj(cnpj[:13], []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2})
	return int(cnpj[12]-'0') == dv1 && int(cnpj[13]-'0') == dv2
}

func digitoCnpj(base string, pesos []int) int {
	soma := 0
	for i := 0; i < len(base); i++ {
		soma += valorCaractereDocumento(base[i]) * pesos[i]
	}
	resto := soma % 11
	if resto < 2 {
		return 0
	}
	return 11 - resto
}

// valorCaractereDocumento usa a regra oficial: valor ASCII menos 48,
// de modo que '0'..'9' valem 0..9 e 'A'..'Z' valem 17..42.
func valorCaractereDocumento(c byte) int {
	return int(c) - 48
}

// validarDocumento valida CPF (11 dígitos, comportamento legado) ou CNPJ
// numérico/alfanumérico de 14 posições.
func validarDocumento(s string) bool {
	doc := normalizarDocumento(s)
	if len(doc) == 11 {
		return !cnpjPossuiLetra(doc)
	}
	if len(doc) == 14 {
		return validarCnpj(doc)
	}
	return false
}
