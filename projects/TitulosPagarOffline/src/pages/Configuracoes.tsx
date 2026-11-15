import { useEffect, useState, type ComponentType } from 'react';
import { BottomNav } from '../components/BottomNav';
import { useConfig } from '../security/ConfigProvider';
import {
  BuildingIcon,
  CheckIcon,
  HistoryIcon,
  ReceiptIcon,
  ServerIcon,
  SettingsIcon,
  UserIcon,
  WalletIcon,
} from '../components/Icons';
import { DadosTab } from './config/DadosTab';
import { SegurancaTab } from './config/SegurancaTab';
import { LicencaTab } from './config/LicencaTab';
import { ConexaoTab } from './config/ConexaoTab';
import { BackupTab } from './config/BackupTab';
import { SobreTab } from './config/SobreTab';

type Aba = 'dados' | 'seguranca' | 'licenca' | 'conexao' | 'backup' | 'sobre';

const ABAS: { id: Aba; rotulo: string; Icone: ComponentType<{ size?: number }> }[] = [
  { id: 'dados', rotulo: 'Dados', Icone: UserIcon },
  { id: 'seguranca', rotulo: 'Segurança', Icone: CheckIcon },
  { id: 'licenca', rotulo: 'Licença', Icone: WalletIcon },
  { id: 'conexao', rotulo: 'Conexão', Icone: ServerIcon },
  { id: 'backup', rotulo: 'Backup', Icone: HistoryIcon },
  { id: 'sobre', rotulo: 'Sobre', Icone: ReceiptIcon },
];

export const CHAVE_ABA_CONFIG = 'config:aba';

function lerAbaInicial(): Aba {
  try {
    const salva = window.localStorage.getItem(CHAVE_ABA_CONFIG);
    if (salva && ABAS.some((item) => item.id === salva)) return salva as Aba;
  } catch {}
  return 'dados';
}

export function Configuracoes() {
  const { config } = useConfig();
  const [aba, setAba] = useState<Aba>(lerAbaInicial);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_ABA_CONFIG, aba);
    } catch {}
  }, [aba]);

  const inicial = (config?.nome || 'T').trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">
            <SettingsIcon size={24} />
          </span>
          <div>
            <h1>Configurações</h1>
            <p>Perfil, licença e backup</p>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="account-card">
          <div className="avatar">{inicial}</div>
          <div className="account-info">
            <h2>{config?.nome || 'Meu aplicativo'}</h2>
            <p>{config?.empresa || 'Contas pessoais'}</p>
            {config?.cnpj && (
              <span className="account-company">
                <BuildingIcon size={14} />
                {config.cnpj}
              </span>
            )}
          </div>
        </section>

        <nav className="config-tabs" role="tablist" aria-label="Seções de configuração">
          {ABAS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              className={aba === id ? 'config-tab is-active' : 'config-tab'}
              onClick={() => setAba(id)}
            >
              <Icone size={16} />
              <span>{rotulo}</span>
            </button>
          ))}
        </nav>

        {aba === 'dados' && <DadosTab />}
        {aba === 'seguranca' && <SegurancaTab />}
        {aba === 'licenca' && <LicencaTab onIrParaConexao={() => setAba('conexao')} />}
        {aba === 'conexao' && <ConexaoTab />}
        {aba === 'backup' && <BackupTab />}
        {aba === 'sobre' && <SobreTab />}

        <div className="settings-footer">
          <UserIcon size={15} />
          <span>Dados armazenados localmente, sem sincronização.</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
