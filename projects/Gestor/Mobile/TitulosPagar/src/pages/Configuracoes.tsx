import { useNavigate } from 'react-router-dom';
import { VERSAO_APP } from '../api';
import { useAuth } from '../auth';
import { BottomNav } from '../components/BottomNav';
import { ServerConfigForm } from '../components/ServerConfigForm';
import {
  BuildingIcon,
  LogOutIcon,
  ReceiptIcon,
  SettingsIcon,
  UserIcon,
} from '../components/Icons';

export function Configuracoes() {
  const navigate = useNavigate();
  const { usuario, empresa, logout } = useAuth();

  const sair = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const inicial = (usuario?.nome || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">
            <SettingsIcon size={24} />
          </span>
          <div>
            <h1>Configurações</h1>
            <p>Conta, servidor e aplicativo</p>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="account-card">
          <div className="avatar">{inicial}</div>
          <div className="account-info">
            <h2>{usuario?.nome || 'Usuário'}</h2>
            <p>{usuario?.email || 'Sem e-mail cadastrado'}</p>
            <span className="account-company">
              <BuildingIcon size={14} />
              {empresa?.fantasia || empresa?.razao_social || 'Empresa'}
              {empresa?.cnpj_cpf ? ` · ${empresa.cnpj_cpf}` : ''}
            </span>
          </div>
        </section>

        <section className="settings-card">
          <ServerConfigForm />
        </section>

        <section className="settings-card about-card">
          <div className="section-heading">
            <span className="section-icon">
              <ReceiptIcon size={20} />
            </span>
            <div>
              <h3>Sobre o app</h3>
              <p>Títulos a Pagar · versão {VERSAO_APP}</p>
            </div>
          </div>
          <p className="about-text">
            Acompanhe os títulos em aberto, registre pagamentos parciais e mantenha o saldo
            devedor sempre atualizado.
          </p>
        </section>

        <button type="button" className="btn btn-danger btn-block" onClick={sair}>
          <LogOutIcon size={19} /> Sair da conta
        </button>

        <div className="settings-footer">
          <UserIcon size={15} />
          <span>Sessão de {usuario?.usuario || usuario?.nome || 'usuário'}</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
