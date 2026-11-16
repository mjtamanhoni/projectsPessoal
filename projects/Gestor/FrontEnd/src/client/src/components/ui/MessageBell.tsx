import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Plus, Send, X } from 'lucide-react';
import api, { getErrorMsg } from '@/lib/api';

interface Mensagem {
  id: number;
  empresa_id: number;
  modulo: string;
  tipo: string;
  titulo: string;
  corpo: string;
  acao_rota: string;
  criado_em: string;
  lida: boolean;
}

interface RespostaMensagens {
  itens: Mensagem[];
  nao_lidas: number;
  por_modulo: Record<string, number>;
  apps: string[];
}

const ABAS = [
  { id: 'todos', rotulo: 'Todas' },
  { id: 'gestor', rotulo: 'Gestor' },
  { id: 'chego', rotulo: 'Chego' },
  { id: 'titulos_online', rotulo: 'Títulos On-line' },
  { id: 'titulos_offline', rotulo: 'Títulos Off-line' },
];

const TIPOS = [
  { id: 'info', rotulo: 'Informação' },
  { id: 'alerta', rotulo: 'Alerta' },
  { id: 'sucesso', rotulo: 'Sucesso' },
  { id: 'solicitacao', rotulo: 'Solicitação' },
  { id: 'sistema', rotulo: 'Sistema' },
];

const CORES_TIPO: Record<string, string> = {
  info: 'bg-blue-500',
  alerta: 'bg-red-500',
  sucesso: 'bg-emerald-500',
  solicitacao: 'bg-amber-500',
  sistema: 'bg-violet-500',
};

function formatarQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias} d`;
  return data.toLocaleDateString('pt-BR');
}

export function MessageBell() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<RespostaMensagens>({ itens: [], nao_lidas: 0, por_modulo: {}, apps: [] });
  const [aba, setAba] = useState('todos');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [composer, setComposer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ modulo: 'gestor', tipo: 'info', titulo: '', corpo: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<RespostaMensagens>('/mensagens', { params: { limite: 80 } });
      setDados({ ...data, apps: Array.isArray(data.apps) ? data.apps : [] });
      setErro('');
    } catch (err) {
      setErro(getErrorMsg(err, 'Erro ao carregar mensagens'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const timer = window.setInterval(() => void carregar(), 60000);
    const aoFocar = () => void carregar();
    window.addEventListener('focus', aoFocar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', aoFocar);
    };
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(''), 4000);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  const apps = dados.apps;
  const appsDisponiveis = ABAS.filter((item) => item.id !== 'todos' && apps.includes(item.id));
  const abasDisponiveis = ABAS.filter((item) => item.id === 'todos' || apps.includes(item.id));

  useEffect(() => {
    if (aba !== 'todos' && !apps.includes(aba)) {
      setAba('todos');
    }
    if (!form.modulo || !apps.includes(form.modulo)) {
      setForm((prev) => ({ ...prev, modulo: apps[0] ?? '' }));
    }
    if (apps.length === 0) {
      setComposer(false);
    }
  }, [aba, apps, form.modulo]);

  const abrir = () => {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo) {
      setErro('');
      void carregar();
    }
  };

  const marcarLida = async (mensagem: Mensagem) => {
    if (!mensagem.lida) {
      try {
        await api.post(`/mensagens/${mensagem.id}/lida`);
        setDados((prev) => ({
          ...prev,
          itens: prev.itens.map((item) =>
            item.id === mensagem.id ? { ...item, lida: true } : item
          ),
          nao_lidas: Math.max(0, prev.nao_lidas - 1),
          por_modulo: {
            ...prev.por_modulo,
            [mensagem.modulo]: Math.max(0, (prev.por_modulo[mensagem.modulo] ?? 0) - 1),
          },
        }));
      } catch {
        setErro('Não foi possível marcar a mensagem como lida.');
      }
    }
    if (mensagem.acao_rota) {
      setAberto(false);
      navigate(mensagem.acao_rota);
    }
  };

  const marcarTodas = async () => {
    try {
      await api.post('/mensagens/lidas');
      await carregar();
    } catch (err) {
      setErro(getErrorMsg(err, 'Erro ao marcar mensagens'));
    }
  };

  const enviar = async () => {
    if (!form.modulo) {
      setErro('Nenhum app de mensagens disponível para esta empresa.');
      return;
    }
    const titulo = form.titulo.trim();
    if (!titulo) {
      setErro('Informe o título da mensagem.');
      return;
    }
    setEnviando(true);
    try {
      await api.post('/mensagens', {
        modulo: form.modulo,
        tipo: form.tipo,
        titulo,
        corpo: form.corpo.trim(),
      });
      setForm({ modulo: form.modulo, tipo: 'info', titulo: '', corpo: '' });
      setComposer(false);
      setErro('');
      setAviso('Mensagem enviada.');
      await carregar();
    } catch (err) {
      setErro(getErrorMsg(err, 'Erro ao enviar mensagem'));
    } finally {
      setEnviando(false);
    }
  };

  const itens = aba === 'todos' ? dados.itens : dados.itens.filter((m) => m.modulo === aba);
  const contagem = (id: string) => (id === 'todos' ? dados.nao_lidas : dados.por_modulo[id] ?? 0);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={abrir}
        className="relative p-2 rounded-lg hover:bg-background-hover transition-colors"
        aria-label="Mensagens"
        aria-expanded={aberto}
      >
        <Bell size={19} className="text-text-secondary" />
        {dados.nao_lidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {dados.nao_lidas > 99 ? '99+' : dados.nao_lidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[390px] max-w-[calc(100vw-2rem)] rounded-xl border border-border-primary bg-bg-card shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
            <Bell size={16} className="text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary flex-1">Mensagens</h3>
            <button
              type="button"
              onClick={() => void marcarTodas()}
              className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
              title="Marcar todas como lidas"
            >
              <CheckCheck size={16} className="text-text-secondary" />
            </button>
            {appsDisponiveis.length > 0 && (
              <button
                type="button"
                onClick={() => setComposer((prev) => !prev)}
                className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                title={composer ? 'Fechar formulário' : 'Nova mensagem'}
              >
                {composer ? <X size={16} className="text-text-secondary" /> : <Plus size={16} className="text-text-secondary" />}
              </button>
            )}
          </div>

          {composer && appsDisponiveis.length > 0 && (
            <div className="p-4 border-b border-border-subtle space-y-2 bg-bg-secondary/40">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="w-full px-2 py-1.5 bg-background-input border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  value={form.modulo}
                  onChange={(e) => setForm((prev) => ({ ...prev, modulo: e.target.value }))}
                >
                  {appsDisponiveis.map((item) => (
                    <option key={item.id} value={item.id}>{item.rotulo}</option>
                  ))}
                </select>
                <select
                  className="w-full px-2 py-1.5 bg-background-input border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                >
                  {TIPOS.map((item) => (
                    <option key={item.id} value={item.id}>{item.rotulo}</option>
                  ))}
                </select>
              </div>
              <input
                className="w-full px-2 py-1.5 bg-background-input border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Título"
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              />
              <textarea
                className="w-full px-2 py-1.5 bg-background-input border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                rows={3}
                placeholder="Mensagem (opcional)"
                value={form.corpo}
                onChange={(e) => setForm((prev) => ({ ...prev, corpo: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposer(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-background-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void enviar()}
                  disabled={enviando}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar
                </button>
              </div>
            </div>
          )}

          {(erro || aviso) && (
            <div className={`px-4 py-2 text-xs ${erro ? 'text-red-500 bg-red-500/10' : 'text-emerald-600 bg-emerald-500/10'}`}>
              {erro || aviso}
            </div>
          )}

          <div className="flex gap-1 px-3 py-2 border-b border-border-subtle overflow-x-auto">
            {abasDisponiveis.map((item) => {
              const qtd = contagem(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] transition-colors ${aba === item.id ? 'bg-accent-primary/15 text-accent-primary font-medium' : 'text-text-secondary hover:bg-background-hover'}`}
                >
                  {item.rotulo}
                  {qtd > 0 && <span className="ml-1 text-[10px] opacity-80">{qtd}</span>}
                </button>
              );
            })}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted">
                <Loader2 size={15} className="animate-spin" />
                Carregando...
              </div>
            ) : itens.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                {apps.length === 0 ? 'Nenhum app de mensagens disponível para esta empresa.' : 'Nenhuma mensagem.'}
              </div>
            ) : (
              itens.map((mensagem) => (
                <button
                  key={mensagem.id}
                  type="button"
                  onClick={() => void marcarLida(mensagem)}
                  className={`w-full text-left px-4 py-3 border-b border-border-subtle/60 last:border-b-0 hover:bg-background-hover transition-colors ${mensagem.lida ? '' : 'bg-accent-primary/[0.04]'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${mensagem.lida ? 'bg-transparent' : CORES_TIPO[mensagem.tipo] ?? 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs truncate ${mensagem.lida ? 'text-text-secondary' : 'text-text-primary font-semibold'}`}>
                          {mensagem.titulo}
                        </p>
                        <span className="ml-auto text-[10px] text-text-muted shrink-0">
                          {formatarQuando(mensagem.criado_em)}
                        </span>
                      </div>
                      {mensagem.corpo && (
                        <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{mensagem.corpo}</p>
                      )}
                      <span className="inline-block mt-1 text-[10px] text-text-muted/80">
                        {ABAS.find((item) => item.id === mensagem.modulo)?.rotulo ?? mensagem.modulo}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
