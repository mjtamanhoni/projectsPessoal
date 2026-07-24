import { Layout } from '@/components/ui/Layout';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

export function Relatorios() {
  const navigate = useNavigate();

  return (
    <Layout>
      <PageHeader title="Relatorios" subtitle="Selecione o tipo de relatorio desejado" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
        <button
          onClick={() => navigate('/relatorios/financeiro')}
          className="p-8 bg-white rounded-2xl border-2 border-border-subtle hover:border-accent-primary hover:shadow-lg transition-all text-center group"
        >
          <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-primary/10 transition-colors">
            <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Financeiro</h3>
          <p className="text-sm text-text-muted mt-2">
            Resumo financeiro, relação de contas a receber e a pagar
          </p>
        </button>

        <button
          onClick={() => navigate('/relatorios/cadastros/clientes')}
          className="p-8 bg-white rounded-2xl border-2 border-border-subtle hover:border-accent-primary hover:shadow-lg transition-all text-center group"
        >
          <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-primary/10 transition-colors">
            <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Cadastros</h3>
          <p className="text-sm text-text-muted mt-2">
            Relação de clientes, fornecedores, categorias, usuários e formulários
          </p>
        </button>
      </div>
    </Layout>
  );
}
