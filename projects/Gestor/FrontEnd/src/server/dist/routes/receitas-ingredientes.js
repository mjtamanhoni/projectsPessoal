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
        const result = (await horseApi_1.horseApi.listarReceitasIngrediente(req.query));
        try {
            const insumos = await horseApi_1.horseApi.listarInsumos();
            const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
            for (const item of result) {
                const insumo = item.insumo_id != null ? insumoPorId.get(item.insumo_id) : undefined;
                if (!insumo)
                    continue;
                item.insumo_nome = item.insumo_nome ?? insumo.nome;
                item.insumo_unidade_medida = item.insumo_unidade_medida ?? insumo.unidade_medida;
                if (item.insumo_custo_medio == null || item.insumo_custo_medio === 0) {
                    item.insumo_custo_medio = insumo.custo_medio ?? 0;
                }
                item.insumo_ativo = item.insumo_ativo ?? insumo.ativo;
            }
        }
        catch {
            // enriquecimento opcional: a listagem segue mesmo sem os custos dos insumos
        }
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.receitaIngredienteBodySchema), async (req, res) => {
    try {
        const body = req.body;
        const items = Array.isArray(body) ? body : [body];
        const result = await horseApi_1.horseApi.salvarReceitasIngrediente(items);
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
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
        const result = await horseApi_1.horseApi.excluirReceitaIngrediente(Number(id));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=receitas-ingredientes.js.map