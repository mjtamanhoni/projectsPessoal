import { VERSAO_APP } from '../../data';
import { CheckIcon, ReceiptIcon } from '../../components/Icons';

export function SobreTab() {
  return (
    <>
      <section className="settings-card">
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
          Acompanhe os títulos em aberto, registre pagamentos parciais e mantenha o saldo devedor
          sempre atualizado. Funciona sem internet.
        </p>
      </section>

      <section className="settings-card">
        <div className="section-heading">
          <span className="section-icon">
            <CheckIcon size={20} />
          </span>
          <div>
            <h3>Privacidade</h3>
            <p>Seus dados permanecem no aparelho.</p>
          </div>
        </div>
        <p className="about-text">
          Títulos, pagamentos e configurações ficam armazenados localmente. O app só acessa a
          internet quando você solicita ou verifica a licença.
        </p>
      </section>
    </>
  );
}
