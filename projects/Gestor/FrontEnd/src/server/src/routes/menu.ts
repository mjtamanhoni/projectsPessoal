import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { EmpresaModulo, Modulo, Formulario, ModuloFormulario } from '../types';

const router = Router();

const formOrdem: Record<string, string[]> = {
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

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId;
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }

    let empresaModulos: EmpresaModulo[] = [];
    let moduloFormularios: ModuloFormulario[] = [];
    let modulos: Modulo[] = [];
    let formularios: Formulario[] = [];

    try { empresaModulos = (await horseApi.listarEmpresaModulos({ empresa_id: empresaId } as Record<string, unknown>)) || []; } catch {}
    try { moduloFormularios = (await horseApi.listarModuloFormularios()) || []; } catch {}
    try { modulos = (await horseApi.listarModulos()) || []; } catch {}
    try { formularios = (await horseApi.listarFormularios()) || []; } catch {}

    const formMap = new Map<number, string>();
    for (const f of formularios as Array<{ id?: number; codigo?: number; nome: string }>) {
      formMap.set(f.id ?? f.codigo ?? 0, f.nome);
    }

    const moduloMap = new Map<number, { nome: string; descricao?: string }>();
    for (const m of modulos as Array<{ id?: number; codigo?: number; nome: string; descricao?: string }>) {
      moduloMap.set(m.id ?? m.codigo ?? 0, m);
    }

    const formPorModulo = new Map<number, Array<{ id: number; nome: string; abertura: number }>>();
    for (const mf of moduloFormularios as Array<{ modulo_id: number; formulario_id: number; formulario_nome?: string; abertura?: number }>) {
      const mid = mf.modulo_id;
      if (!formPorModulo.has(mid)) formPorModulo.set(mid, []);
      const formId = mf.formulario_id;
      const formNome = mf.formulario_nome || formMap.get(formId) || 'Desconhecido';
      formPorModulo.get(mid)!.push({ id: formId, nome: formNome, abertura: mf.abertura ?? 0 });
    }

    const result = [];
    for (const em of empresaModulos as Array<{ modulo_id: number }>) {
      const modulo = moduloMap.get(em.modulo_id);
      if (!modulo) continue;
      let forms = formPorModulo.get(em.modulo_id) || [];
      const ordem = formOrdem[modulo.nome];
      if (ordem) {
        const ordemMap = new Map<string, number>(ordem.map((n, i) => [n, i]));
        forms = forms.sort((a, b) => {
          const oa = ordemMap.get(a.nome);
          const ob = ordemMap.get(b.nome);
          if (oa !== undefined && ob !== undefined) return oa - ob;
          if (oa !== undefined) return -1;
          if (ob !== undefined) return 1;
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
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
