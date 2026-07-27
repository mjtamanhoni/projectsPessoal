"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const horseApi_1 = require("../services/horseApi");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/insumos', auth_1.authMiddleware, async (_req, res) => {
    try {
        const [insumos, compras, estoques] = await Promise.all([
            horseApi_1.horseApi.listarInsumos(),
            horseApi_1.horseApi.listarComprasInsumo(),
            horseApi_1.horseApi.listarEstoqueInsumo(),
        ]);
        const compraPorInsumo = new Map();
        for (const c of compras) {
            const list = compraPorInsumo.get(c.insumo_id) || [];
            list.push(c);
            compraPorInsumo.set(c.insumo_id, list);
        }
        const estoqueMap = new Map();
        for (const e of estoques) {
            estoqueMap.set(e.insumo_id, e.quantidade);
        }
        const result = insumos.map((i) => {
            const id = i.id ?? i.codigo ?? 0;
            const comprasInsumo = (compraPorInsumo.get(id) || []).sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());
            const ultimaCompra = comprasInsumo[0];
            return {
                id,
                nome: i.nome,
                unidade_medida: i.unidade_medida,
                custo_medio: i.custo_medio ?? 0,
                ultima_compra_data: ultimaCompra?.data_compra || null,
                ultima_compra_qtd: ultimaCompra?.quantidade || 0,
                ultima_compra_valor_unitario: ultimaCompra?.valor_unitario || (ultimaCompra ? ultimaCompra.valor_total / ultimaCompra.quantidade : 0),
                estoque_atual: estoqueMap.get(id) || 0,
            };
        });
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.get('/produtos-fabricados', auth_1.authMiddleware, async (_req, res) => {
    try {
        const [produtos, vendas, estoques, receitas, insumos] = await Promise.all([
            horseApi_1.horseApi.listarProdutosFabricados(),
            horseApi_1.horseApi.listarVendasProduto(),
            horseApi_1.horseApi.listarEstoqueProdutoFabricado(),
            horseApi_1.horseApi.listarReceitasIngrediente(),
            horseApi_1.horseApi.listarInsumos(),
        ]);
        const insumoMap = new Map();
        for (const i of insumos) {
            insumoMap.set(i.id ?? i.codigo ?? 0, { nome: i.nome, unidade_medida: i.unidade_medida, custo_medio: i.custo_medio ?? 0 });
        }
        const vendaPorProduto = new Map();
        for (const v of vendas) {
            const list = vendaPorProduto.get(v.produto_fabricado_id) || [];
            list.push(v);
            vendaPorProduto.set(v.produto_fabricado_id, list);
        }
        const estoqueMap = new Map();
        for (const e of estoques) {
            estoqueMap.set(e.produto_fabricado_id, e.quantidade);
        }
        const receitaPorProduto = new Map();
        for (const r of receitas) {
            const list = receitaPorProduto.get(r.produto_fabricado_id) || [];
            list.push(r);
            receitaPorProduto.set(r.produto_fabricado_id, list);
        }
        const result = produtos.map((p) => {
            const id = p.id ?? p.codigo ?? 0;
            const vendasProduto = (vendaPorProduto.get(id) || []).sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
            const ultimaVenda = vendasProduto[0];
            const ingredientes = (receitaPorProduto.get(id) || []).map((r) => {
                const ins = insumoMap.get(r.insumo_id);
                return {
                    insumo_id: r.insumo_id,
                    insumo_nome: ins?.nome || 'Desconhecido',
                    unidade_medida: ins?.unidade_medida || '',
                    quantidade: r.quantidade,
                    custo_medio: ins?.custo_medio || 0,
                    valor_gasto: (ins?.custo_medio || 0) * r.quantidade,
                };
            });
            return {
                id,
                nome: p.nome,
                descricao: p.descricao || '',
                unidade_medida: p.unidade_medida || '',
                custo_unitario: p.custo_unitario ?? 0,
                valor_venda_sugerido: p.valor_venda_sugerido ?? 0,
                ultima_venda_data: ultimaVenda?.data_venda || null,
                ultima_venda_qtd: ultimaVenda?.quantidade || 0,
                ultima_venda_preco: ultimaVenda?.valor_unitario || 0,
                estoque_atual: estoqueMap.get(id) || 0,
                ingredientes,
            };
        });
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
router.get('/fabricacoes', auth_1.authMiddleware, async (req, res) => {
    try {
        const { dataInicio, dataFim, ultimo } = req.query;
        const [fabricacoes, custosAdicionaisFab, receitas, insumos, custosAdicionaisTipo] = await Promise.all([
            horseApi_1.horseApi.listarFabricacoes(),
            horseApi_1.horseApi.listarFabricacoesCustoAdicional(),
            horseApi_1.horseApi.listarReceitasIngrediente(),
            horseApi_1.horseApi.listarInsumos(),
            horseApi_1.horseApi.listarCustosAdicionaisTipo(),
        ]);
        const estoqueMap = new Map();
        try {
            const estoques = await horseApi_1.horseApi.listarEstoqueProdutoFabricado();
            if (Array.isArray(estoques)) {
                for (const e of estoques) {
                    estoqueMap.set(e.produto_fabricado_id, e.quantidade);
                }
            }
        }
        catch (_e) {
            console.warn('[fabricacoes] Erro ao buscar estoque, usando 0');
        }
        const insumoMap = new Map();
        for (const i of insumos) {
            insumoMap.set(i.id ?? i.codigo ?? 0, { nome: i.nome, custo_medio: i.custo_medio ?? 0 });
        }
        const receitaPorProduto = new Map();
        for (const r of receitas) {
            const list = receitaPorProduto.get(r.produto_fabricado_id) || [];
            list.push(r);
            receitaPorProduto.set(r.produto_fabricado_id, list);
        }
        const custoAdicionalTipoMap = new Map();
        for (const c of custosAdicionaisTipo) {
            custoAdicionalTipoMap.set(c.id ?? c.codigo ?? 0, c.nome);
        }
        const custoAdicionalPorFabricacao = new Map();
        for (const c of custosAdicionaisFab) {
            const list = custoAdicionalPorFabricacao.get(c.fabricacao_id) || [];
            list.push({
                custo_adicional_tipo_id: c.custo_adicional_tipo_id,
                tipo_nome: custoAdicionalTipoMap.get(c.custo_adicional_tipo_id) || 'Desconhecido',
                valor: c.valor,
            });
            custoAdicionalPorFabricacao.set(c.fabricacao_id, list);
        }
        let filtered = fabricacoes;
        if (ultimo === 'true') {
            const latestByProduct = new Map();
            for (const f of filtered) {
                const existing = latestByProduct.get(f.produto_fabricado_id);
                if (!existing || new Date(f.data_fabricacao) > new Date(existing.data_fabricacao)) {
                    latestByProduct.set(f.produto_fabricado_id, f);
                }
            }
            filtered = Array.from(latestByProduct.values());
        }
        else {
            if (dataInicio) {
                const inicio = new Date(dataInicio);
                filtered = filtered.filter((f) => new Date(f.data_fabricacao) >= inicio);
            }
            if (dataFim) {
                const fim = new Date(dataFim + 'T23:59:59');
                filtered = filtered.filter((f) => new Date(f.data_fabricacao) <= fim);
            }
        }
        const result = filtered.map((f) => {
            const id = f.id ?? f.codigo ?? 0;
            const receita = receitaPorProduto.get(f.produto_fabricado_id) || [];
            const custosInsumos = receita.map((r) => {
                const ins = insumoMap.get(r.insumo_id);
                const valorGasto = (ins?.custo_medio || 0) * r.quantidade * f.quantidade_produzida;
                return {
                    insumo_id: r.insumo_id,
                    insumo_nome: ins?.nome || 'Desconhecido',
                    quantidade_por_produto: r.quantidade,
                    custo_medio: ins?.custo_medio || 0,
                    valor_gasto: valorGasto,
                };
            });
            const custosAdicionais = custoAdicionalPorFabricacao.get(id) || [];
            return {
                id,
                produto_fabricado_id: f.produto_fabricado_id,
                produto_nome: f.produto_nome || '',
                quantidade_produzida: f.quantidade_produzida,
                data_fabricacao: f.data_fabricacao,
                custo_insumos: f.custo_insumos ?? 0,
                custo_adicional_total: f.custo_adicional_total ?? 0,
                custo_total: f.custo_total ?? 0,
                custo_unitario: f.custo_unitario ?? 0,
                estoque_atual: estoqueMap.get(f.produto_fabricado_id) || 0,
                custos_insumos_detalhe: custosInsumos,
                custos_adicionais_detalhe: custosAdicionais,
            };
        });
        res.json(result);
    }
    catch (error) {
        console.error('[relatorios-producao/fabricacoes] Erro:', error);
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Erro interno';
        res.status(status).json({ error: message });
    }
});
router.get('/vendas-produto', auth_1.authMiddleware, async (_req, res) => {
    try {
        const [vendas, produtos, clientes] = await Promise.all([
            horseApi_1.horseApi.listarVendasProduto(),
            horseApi_1.horseApi.listarProdutosFabricados(),
            horseApi_1.horseApi.listarClientes(),
        ]);
        const produtoMap = new Map();
        for (const p of produtos) {
            produtoMap.set(p.id ?? p.codigo ?? 0, p.nome);
        }
        const clienteMap = new Map();
        for (const c of clientes) {
            clienteMap.set(c.id ?? c.codigo ?? 0, c.nome);
        }
        const result = vendas.map((v) => ({
            id: v.id ?? v.codigo ?? 0,
            data_venda: v.data_venda,
            produto_id: v.produto_fabricado_id,
            produto_nome: v.produto_nome || produtoMap.get(v.produto_fabricado_id) || 'Desconhecido',
            cliente_id: v.cliente_id,
            cliente_nome: v.cliente_nome || clienteMap.get(v.cliente_id) || 'Desconhecido',
            quantidade: v.quantidade,
            valor_unitario: v.valor_unitario,
            valor_total: v.valor_total,
        }));
        res.json(result);
    }
    catch (error) {
        const status = error instanceof Error && 'status' in error ? error.status : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=relatorios-producao.js.map