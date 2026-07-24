"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        console.log('[HorasTrabalhadas] Listagem iniciada, usuarioId:', req.usuarioId);
        const result = await horseApi_1.horseApi.listarHorasTrabalhadas(req.query);
        console.log('[HorasTrabalhadas] Listagem resultado:', Array.isArray(result) ? `${result.length} registros` : 'nao-array', Array.isArray(result) && result.length > 0 ? JSON.stringify(result[0]) : '');
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        console.error('[HorasTrabalhadas] Erro na listagem:', status, error instanceof Error ? error.message : error);
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.horaTrabalhadaBodySchema), async (req, res) => {
    try {
        const body = req.body;
        const horas = Array.isArray(body) ? body : [body];
        const primeiraHora = horas[0];
        console.log('[HorasTrabalhadas] Inicio da Insercao, dados:', JSON.stringify(primeiraHora));
        if (primeiraHora?.usuarioId && primeiraHora?.clienteId && primeiraHora?.servicoId && primeiraHora?.dataServico) {
            const [ano, mes] = primeiraHora.dataServico.split('-').map(Number);
            const mesAnterior = mes === 1 ? 12 : mes - 1;
            const anoAnterior = mes === 1 ? ano - 1 : ano;
            const primeiroDiaMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
            const ultimoDiaMes = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
            const ultimoDiaMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${new Date(anoAnterior, mesAnterior, 0).getDate()}`;
            const primeiroDiaMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`;
            const entradasMesAtual = await horseApi_1.horseApi.listarHorasTrabalhadas({
                usuario_id: primeiraHora.usuarioId,
                cliente_id: primeiraHora.clienteId,
                servico_id: primeiraHora.servicoId,
                data_inicial: primeiroDiaMes,
                data_final: ultimoDiaMes,
            });
            const jaPossuiExcedente = entradasMesAtual.some((h) => h.observacoes?.includes('Horas excedentes do mes anterior'));
            if (entradasMesAtual.length === 0 && !jaPossuiExcedente) {
                console.log('[HorasTrabalhadas] Primeiro lancamento do mes, verificando horas excedentes...');
                const entradasMesAnterior = await horseApi_1.horseApi.listarHorasTrabalhadas({
                    usuario_id: primeiraHora.usuarioId,
                    cliente_id: primeiraHora.clienteId,
                    servico_id: primeiraHora.servicoId,
                    data_inicial: primeiroDiaMesAnterior,
                    data_final: ultimoDiaMesAnterior,
                });
                const abatimentosMesAnterior = await horseApi_1.horseApi.listarHorasAbatidas({
                    usuario_id: primeiraHora.usuarioId,
                    data_inicial: primeiroDiaMesAnterior,
                    data_final: ultimoDiaMesAnterior,
                });
                const totalHorasTrabalhadas = entradasMesAnterior.reduce((acc, h) => acc + (h.quantidadeHoras ?? 0), 0);
                const totalHorasAbatidas = abatimentosMesAnterior.reduce((acc, a) => acc + a.quantidadeHoras, 0);
                const servicos = await horseApi_1.horseApi.listarServicos();
                const servico = servicos.find((s) => (s.id ?? s.codigo) === primeiraHora.servicoId);
                const parseIntervalToDecimal = (iv) => {
                    const match = iv.match(/(\d+):(\d+):(\d+)/);
                    if (!match)
                        return 0;
                    return Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
                };
                const horasMinimas = parseIntervalToDecimal(servico?.horasMinimas ?? '0');
                const excedidasAnterior = await horseApi_1.horseApi.listarHorasExcedidas({
                    usuario_id: primeiraHora.usuarioId,
                    cliente_id: primeiraHora.clienteId,
                    servico_id: primeiraHora.servicoId,
                    mes_origem: mesAnterior,
                    ano_origem: anoAnterior,
                });
                const saldoAcumuladoAnterior = excedidasAnterior.length > 0 ? excedidasAnterior[0].deltaHoras : 0;
                const novoAcumulado = (saldoAcumuladoAnterior + totalHorasTrabalhadas) - (totalHorasAbatidas + horasMinimas);
                console.log(`[HorasTrabalhadas] Acumulado anterior: ${saldoAcumuladoAnterior}, Trabalhadas: ${totalHorasTrabalhadas}, Abatidas: ${totalHorasAbatidas}, Minimas: ${horasMinimas}, Novo acumulado: ${novoAcumulado}`);
                const acumulado = {
                    usuarioId: Number(primeiraHora.usuarioId),
                    clienteId: Number(primeiraHora.clienteId),
                    servicoId: Number(primeiraHora.servicoId),
                    mesOrigem: mesAnterior,
                    anoOrigem: anoAnterior,
                    deltaHoras: novoAcumulado,
                };
                console.log('[HorasTrabalhadas] Registrando acumulado:', JSON.stringify(acumulado));
                await horseApi_1.horseApi.salvarHorasExcedidas([acumulado]);
                console.log('[HorasTrabalhadas] Acumulado registrado com sucesso');
            }
        }
        const result = await horseApi_1.horseApi.salvarHorasTrabalhadas(horas);
        console.log('[HorasTrabalhadas] Insercao bem sucedida:', result);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        console.error('[HorasTrabalhadas] Erro na Insercao:', status, error instanceof Error ? error.message : error);
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.delete('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID e obrigatorio' });
            return;
        }
        const result = await horseApi_1.horseApi.excluirHoraTrabalhada(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=horasTrabalhadas.js.map