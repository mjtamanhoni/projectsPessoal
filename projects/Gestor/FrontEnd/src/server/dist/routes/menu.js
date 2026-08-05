"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const formOrdem = {
    Producao: [
        'Dashboard Produção',
        'Insumos',
        'Compras Insumo',
        'Estoque Insumo',
        'Produtos Fabricados',
        'Receitas Ingredientes',
        'Custos Adicionais',
        'Fabricacoes',
        'Estoque Produto Fabricado',
        'Vendas Produto',
        'Encomendas',
        'Relatorio Insumos',
        'Relatorio Produtos Fabricados',
        'Relatorio Fabricacoes',
        'Relatorio Vendas Produto',
    ],
};
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const empresaId = req.empresaId;
        if (!empresaId) {
            res.status(400).json({ error: 'Empresa nao identificada' });
            return;
        }
        let empresaModulos = [];
        let moduloFormularios = [];
        let modulos = [];
        let formularios = [];
        try {
            empresaModulos = (await horseApi_1.horseApi.listarEmpresaModulos({ empresa_id: empresaId })) || [];
        }
        catch { }
        try {
            moduloFormularios = (await horseApi_1.horseApi.listarModuloFormularios()) || [];
        }
        catch { }
        try {
            modulos = (await horseApi_1.horseApi.listarModulos()) || [];
        }
        catch { }
        try {
            formularios = (await horseApi_1.horseApi.listarFormularios()) || [];
        }
        catch { }
        const formMap = new Map();
        for (const f of formularios) {
            formMap.set(f.id ?? f.codigo ?? 0, f.nome);
        }
        const moduloMap = new Map();
        for (const m of modulos) {
            moduloMap.set(m.id ?? m.codigo ?? 0, m);
        }
        const formPorModulo = new Map();
        for (const mf of moduloFormularios) {
            const mid = mf.modulo_id;
            if (!formPorModulo.has(mid))
                formPorModulo.set(mid, []);
            const formId = mf.formulario_id;
            const formNome = mf.formulario_nome || formMap.get(formId) || 'Desconhecido';
            formPorModulo.get(mid).push({ id: formId, nome: formNome, abertura: mf.abertura ?? 0 });
        }
        const result = [];
        for (const em of empresaModulos) {
            const modulo = moduloMap.get(em.modulo_id);
            if (!modulo)
                continue;
            let forms = formPorModulo.get(em.modulo_id) || [];
            const ordem = formOrdem[modulo.nome];
            if (ordem) {
                const ordemMap = new Map(ordem.map((n, i) => [n, i]));
                forms = forms.sort((a, b) => {
                    const oa = ordemMap.get(a.nome);
                    const ob = ordemMap.get(b.nome);
                    if (oa !== undefined && ob !== undefined)
                        return oa - ob;
                    if (oa !== undefined)
                        return -1;
                    if (ob !== undefined)
                        return 1;
                    return 0;
                });
            }
            result.push({
                id: em.modulo_id,
                nome: modulo.nome,
                descricao: modulo.descricao || '',
                formularios: forms,
            });
        }
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=menu.js.map