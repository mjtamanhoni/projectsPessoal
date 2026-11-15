import { useEffect, useState } from 'react';
import { extrairErro, salvarConfig } from '../../data';
import { mascaraCpfCnpj } from '../../format';
import { useConfig } from '../../security/ConfigProvider';
import { UserIcon } from '../../components/Icons';
import { FeedbackBar, useFeedback } from './comum';

export function DadosTab() {
  const { config, recarregar } = useConfig();
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { feedback, setFeedback } = useFeedback();

  useEffect(() => {
    if (!config) return;
    setNome(config.nome);
    setEmpresa(config.empresa);
    setCnpj(config.cnpj);
  }, [config]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfig({ nome, empresa, cnpj });
      await recarregar();
      setFeedback({ tone: 'ok', msg: 'Dados salvos.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="settings-card">
      <div className="section-heading">
        <span className="section-icon">
          <UserIcon size={20} />
        </span>
        <div>
          <h3>Meus dados</h3>
          <p>Aparecem no cabeçalho e nos relatórios.</p>
        </div>
      </div>

      <FeedbackBar feedback={feedback} />

      <label className="field">
        <span>Seu nome</span>
        <input
          className="input"
          placeholder="Ex: Maria Silva"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Nome do negócio (opcional)</span>
        <input
          className="input"
          placeholder="Ex: Mercado Bom Preço"
          value={empresa}
          onChange={(event) => setEmpresa(event.target.value)}
        />
      </label>

      <label className="field">
        <span>CNPJ/CPF (opcional)</span>
        <input
          className="input"
          placeholder="000.000.000-00"
          value={cnpj}
          onChange={(event) => setCnpj(mascaraCpfCnpj(event.target.value))}
        />
      </label>

      <p className="settings-hint">
        A chave PIX de recebimento é definida em cada título, no momento do cadastro.
      </p>

      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => void salvar()}
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar dados'}
        </button>
      </div>
    </section>
  );
}
