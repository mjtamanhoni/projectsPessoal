import { useRef, useState } from 'react';
import {
  exportarBackup,
  extrairErro,
  importarBackupTexto,
  lerArquivoTexto,
  limparDados,
  removerPin,
  resumoBackup,
} from '../../data';
import { useConfig } from '../../security/ConfigProvider';
import { useLicense } from '../../security/LicenseProvider';
import { useLock } from '../../security/LockProvider';
import { Modal } from '../../components/Modal';
import { HistoryIcon, TrashIcon } from '../../components/Icons';
import { FeedbackBar, useFeedback } from './comum';

export function BackupTab() {
  const { recarregar } = useConfig();
  const { recarregar: recarregarLicenca } = useLicense();
  const { atualizarEstado } = useLock();
  const { feedback, setFeedback } = useFeedback();

  const [backupOcupado, setBackupOcupado] = useState(false);
  const [importacao, setImportacao] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [apagarAberto, setApagarAberto] = useState(false);
  const [apagando, setApagando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const exportar = async () => {
    setBackupOcupado(true);
    try {
      const { nome } = await exportarBackup();
      setFeedback({ tone: 'ok', msg: `Backup gerado: ${nome}` });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setBackupOcupado(false);
    }
  };

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const texto = await lerArquivoTexto(arquivo);
      setImportacao(texto);
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  };

  const confirmarImportacao = async () => {
    if (!importacao) return;
    setImportando(true);
    try {
      const resultado = await importarBackupTexto(importacao);
      await recarregar();
      await recarregarLicenca();
      setImportacao(null);
      setFeedback({ tone: 'ok', msg: resumoBackup(resultado) });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setImportando(false);
    }
  };

  const apagarTudo = async () => {
    setApagando(true);
    try {
      await limparDados();
      await removerPin();
      await atualizarEstado();
      await recarregar();
      await recarregarLicenca();
      setApagarAberto(false);
      setFeedback({ tone: 'ok', msg: 'Todos os dados foram apagados.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setApagando(false);
    }
  };

  return (
    <>
      <section className="settings-card">
        <div className="section-heading">
          <span className="section-icon">
            <HistoryIcon size={20} />
          </span>
          <div>
            <h3>Backup</h3>
            <p>Seus dados ficam só neste aparelho. Exporte uma cópia de vez em quando.</p>
          </div>
        </div>

        <FeedbackBar feedback={feedback} />

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => void exportar()}
            disabled={backupOcupado}
          >
            {backupOcupado ? 'Gerando backup...' : 'Exportar backup'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => inputArquivo.current?.click()}
            disabled={backupOcupado}
          >
            Importar backup
          </button>

          <input
            ref={inputArquivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void escolherArquivo(event.target.files?.[0])}
          />
        </div>

        <p className="settings-hint">
          O arquivo gerado pode ser salvo no Google Drive, enviado por e-mail ou guardado em
          outro lugar. Ao importar, os dados atuais são substituídos.
        </p>
      </section>

      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => setApagarAberto(true)}
      >
        <TrashIcon size={18} /> Apagar todos os dados
      </button>

      {importacao && (
        <Modal
          title="Restaurar backup"
          subtitle="Isso substitui os dados atuais"
          onClose={() => {
            if (!importando) setImportacao(null);
          }}
        >
          <p className="confirm-text">
            Os títulos e pagamentos atuais serão substituídos pelos dados do arquivo. Um backup
            de segurança do estado atual é guardado automaticamente no aparelho.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setImportacao(null)}
              disabled={importando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void confirmarImportacao()}
              disabled={importando}
            >
              {importando ? 'Restaurando...' : 'Restaurar'}
            </button>
          </div>
        </Modal>
      )}

      {apagarAberto && (
        <Modal
          title="Apagar todos os dados"
          subtitle="Ação irreversível"
          onClose={() => {
            if (!apagando) setApagarAberto(false);
          }}
        >
          <p className="confirm-text">
            Todos os títulos, pagamentos e o PIN serão apagados deste aparelho. Se você ainda não
            exportou um backup, os dados serão perdidos.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setApagarAberto(false)}
              disabled={apagando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void apagarTudo()}
              disabled={apagando}
            >
              {apagando ? 'Apagando...' : 'Apagar tudo'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
