package handlers

import (
	"testing"
	"time"
)

func TestCalcularHorasPonto(t *testing.T) {
	entrada := func(dia, hora string, id int) pontoLancamento {
		data, _ := time.Parse("2006-01-02", dia)
		h, _ := time.Parse("15:04", hora)
		return pontoLancamento{ID: id, Data: data, Hora: h, Tipo: "E"}
	}
	saida := func(dia, hora string, id int) pontoLancamento {
		data, _ := time.Parse("2006-01-02", dia)
		h, _ := time.Parse("15:04", hora)
		return pontoLancamento{ID: id, Data: data, Hora: h, Tipo: "S"}
	}

	casos := []struct {
		nome        string
		lancamentos []pontoLancamento
		esperado    float64
	}{
		{
			nome: "dois pares no mesmo dia",
			lancamentos: []pontoLancamento{
				entrada("2026-12-01", "08:00", 1),
				saida("2026-12-01", "12:00", 2),
				entrada("2026-12-01", "13:00", 3),
				saida("2026-12-01", "17:00", 4),
			},
			esperado: 8,
		},
		{
			nome: "periodo que atravessa a meia-noite",
			lancamentos: []pontoLancamento{
				entrada("2026-12-01", "22:00", 1),
				saida("2026-12-01", "02:00", 2),
			},
			esperado: 4,
		},
		{
			nome: "marcacoes fora de ordem",
			lancamentos: []pontoLancamento{
				saida("2026-12-01", "17:00", 2),
				entrada("2026-12-01", "08:00", 1),
			},
			esperado: 9,
		},
		{
			nome: "saida sem entrada e ignorada",
			lancamentos: []pontoLancamento{
				saida("2026-12-01", "12:00", 1),
				entrada("2026-12-01", "13:00", 2),
				saida("2026-12-01", "17:00", 3),
			},
			esperado: 4,
		},
		{
			nome: "entrada sem saida e ignorada",
			lancamentos: []pontoLancamento{
				entrada("2026-12-01", "08:00", 1),
				saida("2026-12-01", "12:00", 2),
				entrada("2026-12-01", "13:00", 3),
			},
			esperado: 4,
		},
		{
			nome: "entradas nao sao pareadas entre dias",
			lancamentos: []pontoLancamento{
				entrada("2026-12-01", "22:00", 1),
				saida("2026-12-02", "02:00", 2),
			},
			esperado: 0,
		},
		{
			nome:        "sem marcacoes",
			lancamentos: nil,
			esperado:    0,
		},
	}

	for _, caso := range casos {
		t.Run(caso.nome, func(t *testing.T) {
			if obtido := calcularHorasPonto(caso.lancamentos); obtido != caso.esperado {
				t.Fatalf("calcularHorasPonto() = %v, esperado %v", obtido, caso.esperado)
			}
		})
	}
}
