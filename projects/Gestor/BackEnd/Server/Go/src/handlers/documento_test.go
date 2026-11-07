package handlers

import "testing"

func TestNormalizarDocumento(t *testing.T) {
	casos := map[string]string{
		"12.ABC.345/01DE-35": "12ABC34501DE35",
		"12abc34501de35":     "12ABC34501DE35",
		"":                   "",
	}
	for entrada, esperado := range casos {
		if obtido := normalizarDocumento(entrada); obtido != esperado {
			t.Fatalf("normalizarDocumento(%q) = %q, esperado %q", entrada, obtido, esperado)
		}
	}
}

func TestValidarCnpj(t *testing.T) {
	casos := []struct {
		documento string
		valido    bool
	}{
		{"12ABC34501DE35", true},
		{"12.ABC.345/01DE-35", true},
		{"12ABC34501DE36", false},
		{"11222333000181", true},
		{"11.222.333/0001-81", true},
		{"11222333000182", false},
		{"12ABC34501DE3", false},
		{"12ABC34501DEAA", false},
	}
	for _, caso := range casos {
		if obtido := validarCnpj(caso.documento); obtido != caso.valido {
			t.Fatalf("validarCnpj(%q) = %v, esperado %v", caso.documento, obtido, caso.valido)
		}
	}
}

func TestValidarDocumento(t *testing.T) {
	casos := []struct {
		documento string
		valido    bool
	}{
		{"122.635.997-38", true},
		{"12263599738", true},
		{"12ABC34501DE35", true},
		{"", false},
		{"123", false},
		{"1226359973A", false},
		{"12ABC34501DE36", false},
	}
	for _, caso := range casos {
		if obtido := validarDocumento(caso.documento); obtido != caso.valido {
			t.Fatalf("validarDocumento(%q) = %v, esperado %v", caso.documento, obtido, caso.valido)
		}
	}
}
