import { useEffect, useState } from 'react';
import { Camera, Check, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { CameraCapture } from './CameraCapture';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getUploadsUrl } from '@/lib/empresaLogo';
import { fileToAvatarDataUrl, resizeImageDataUrl, urlToAvatarDataUrl } from '@/lib/image';
import api, { getErrorMsg } from '@/lib/api';
import type { User } from '@/types';

interface PerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Perfil {
  id: number;
  empresa_id: number;
  empresa_nome: string;
  nome: string;
  email: string;
  avatar: string;
  is_superadmin: boolean;
  tem_senha: boolean;
  tem_pin: boolean;
}

const AVATAR_ESTILOS = [
  { id: 'adventurer', rotulo: 'Aventureiro' },
  { id: 'avataaars', rotulo: 'Cartoon' },
  { id: 'bottts', rotulo: 'Robô' },
  { id: 'fun-emoji', rotulo: 'Emoji' },
  { id: 'notionists', rotulo: 'Traço' },
  { id: 'micah', rotulo: 'Ilustrado' },
];

const AVATAR_SEEDS = [
  'Aurora',
  'Boreal',
  'Cedro',
  'Duna',
  'Estrela',
  'Fenix',
  'Gaia',
  'Horizonte',
  'Iris',
  'Jade',
  'Kai',
  'Lumi',
];

function avatarOnlineUrl(estilo: string, seed: string): string {
  const params = new URLSearchParams({
    seed,
    size: '512',
    backgroundColor: 'c0aede,b6e3f4,ffd5dc,ffdfbf,d1d4f9',
  });
  return `https://api.dicebear.com/9.x/${estilo}/png?${params.toString()}`;
}

export function PerfilModal({ isOpen, onClose }: PerfilModalProps) {
  const { updateUser } = useAuth();
  const { addToast } = useToast();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [novoPin, setNovoPin] = useState('');

  const [fotoNova, setFotoNova] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [avataresAbertos, setAvataresAbertos] = useState(false);
  const [estiloAvatar, setEstiloAvatar] = useState(AVATAR_ESTILOS[0].id);
  const [baixandoAvatar, setBaixandoAvatar] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;

    setCarregando(true);
    setErro('');
    setCameraAberta(false);
    setAvataresAbertos(false);
    setFotoNova(null);
    setRemoverFoto(false);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setNovoPin('');

    api
      .get<Perfil>('/perfil')
      .then(({ data }) => {
        if (cancelado) return;
        setPerfil(data);
        setNome(data.nome ?? '');
        setEmail(data.email ?? '');
      })
      .catch((err) => {
        if (!cancelado) setErro(getErrorMsg(err, 'Erro ao carregar perfil'));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen]);

  const avatarAtualUrl = getUploadsUrl(perfil?.avatar);
  const preview = fotoNova ?? (removerFoto ? null : avatarAtualUrl);
  const inicial = (nome || perfil?.nome || 'U').trim().charAt(0).toUpperCase();
  const temFoto = Boolean(fotoNova) || (!removerFoto && Boolean(avatarAtualUrl));

  const selecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      const reduzida = await fileToAvatarDataUrl(arquivo, { maxSize: 512, square: true });
      setFotoNova(reduzida);
      setRemoverFoto(false);
      setErro('');
    } catch (err) {
      addToast('error', getErrorMsg(err, 'Não foi possível usar essa imagem'));
    }
  };

  const capturarCamera = async (dataUrl: string) => {
    try {
      const reduzida = await resizeImageDataUrl(dataUrl, { maxSize: 512, square: true });
      setFotoNova(reduzida);
      setRemoverFoto(false);
      setCameraAberta(false);
      setErro('');
    } catch (err) {
      addToast('error', getErrorMsg(err, 'Não foi possível processar a foto'));
    }
  };

  const escolherAvatarOnline = async (seed: string) => {
    setBaixandoAvatar(true);
    try {
      const reduzida = await urlToAvatarDataUrl(avatarOnlineUrl(estiloAvatar, seed), {
        maxSize: 512,
        square: true,
      });
      setFotoNova(reduzida);
      setRemoverFoto(false);
      setErro('');
    } catch {
      addToast('error', 'Não foi possível baixar o avatar online. Verifique a conexão.');
    } finally {
      setBaixandoAvatar(false);
    }
  };

  const remover = () => {
    setFotoNova(null);
    setRemoverFoto(true);
    setErro('');
  };

  const salvar = async () => {
    if (!perfil) return;
    setErro('');

    if (novaSenha && novaSenha.length < 4) {
      setErro('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('A confirmação da nova senha não confere');
      return;
    }
    if (novoPin && !/^\d{4}$/.test(novoPin)) {
      setErro('O PIN deve ter exatamente 4 dígitos');
      return;
    }

    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim();
    const mudouNome = nomeNormalizado !== (perfil.nome ?? '');
    const mudouEmail = emailNormalizado !== (perfil.email ?? '');
    const mudouSenha = novaSenha !== '';
    const mudouPin = novoPin !== '';
    const mudouDados = mudouNome || mudouEmail || mudouSenha || mudouPin;
    const mudouFoto = fotoNova !== null || removerFoto;

    if (!mudouDados && !mudouFoto) {
      onClose();
      return;
    }

    if (mudouDados && !senhaAtual.trim()) {
      setErro(`Informe ${perfil.tem_senha ? 'sua senha atual' : 'seu PIN atual'} para confirmar as alterações`);
      return;
    }

    setSalvando(true);
    try {
      let respostaPerfil: Perfil | null = null;

      if (mudouDados) {
        const payload: Record<string, unknown> = { senhaAtual };
        if (mudouNome) payload.nome = nomeNormalizado;
        if (mudouEmail) payload.email = emailNormalizado;
        if (mudouSenha) payload.novaSenha = novaSenha;
        if (mudouPin) payload.novoPin = novoPin;
        const { data } = await api.put<Perfil>('/perfil', payload);
        respostaPerfil = data;
      }

      let avatar: string | null | undefined;
      if (fotoNova !== null) {
        const { data } = await api.post<{ avatar?: string }>('/perfil/avatar', { avatar: fotoNova });
        avatar = data?.avatar ?? '';
      } else if (removerFoto) {
        const { data } = await api.post<{ avatar?: string }>('/perfil/avatar', { avatar: '' });
        avatar = data?.avatar ?? '';
      }

      const patch: Partial<User> = {};
      if (respostaPerfil) {
        patch.nome = respostaPerfil.nome;
        patch.email = respostaPerfil.email;
      }
      if (avatar !== undefined) {
        patch.avatar = avatar || null;
      }
      if (Object.keys(patch).length > 0) {
        updateUser(patch);
      }

      addToast('success', 'Perfil atualizado com sucesso');
      onClose();
    } catch (err) {
      setErro(getErrorMsg(err, 'Erro ao salvar perfil'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Meu perfil" maxWidth="max-w-2xl">
      {carregando ? (
        <p className="text-sm text-text-muted">Carregando perfil...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-accent-primary/15 text-accent-primary flex items-center justify-center text-2xl font-semibold shrink-0 border border-border-subtle">
              {preview ? (
                <img src={preview} alt="Foto do usuário" className="w-full h-full object-cover" />
              ) : (
                inicial
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer text-sm">
                <Upload size={14} /> Enviar foto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={selecionarArquivo}
                />
              </label>
              <Button type="button" variant="secondary" className="text-sm" onClick={() => setCameraAberta((v) => !v)}>
                <Camera size={14} /> Câmera
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-sm"
                onClick={() => setAvataresAbertos((v) => !v)}
              >
                <Sparkles size={14} /> Avatares
              </Button>
              {temFoto && (
                <Button type="button" variant="danger" className="text-sm" onClick={remover}>
                  <Trash2 size={14} /> Remover
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-text-muted">
            A imagem é reduzida e recomprimida automaticamente (máx. 512×512 JPEG) antes de ser enviada.
          </p>

          {cameraAberta && <CameraCapture onCapture={capturarCamera} onClose={() => setCameraAberta(false)} />}

          {avataresAbertos && (
            <div className="rounded-xl border border-border-subtle bg-bg-muted/40 p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {AVATAR_ESTILOS.map((estilo) => (
                  <button
                    key={estilo.id}
                    type="button"
                    onClick={() => setEstiloAvatar(estilo.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      estiloAvatar === estilo.id
                        ? 'bg-accent-primary text-text-inverse border-accent-primary'
                        : 'bg-bg-card text-text-secondary border-border-subtle hover:bg-bg-muted'
                    }`}
                  >
                    {estilo.rotulo}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => escolherAvatarOnline(seed)}
                    disabled={baixandoAvatar}
                    className="aspect-square rounded-full overflow-hidden border border-border-subtle hover:ring-2 hover:ring-accent-primary transition-all disabled:opacity-50"
                    title={seed}
                  >
                    <img
                      src={avatarOnlineUrl(estiloAvatar, seed)}
                      alt={seed}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-text-muted">
                Avatares gerados por dicebear.com. Ao escolher, a imagem é copiada para o servidor da empresa.
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Nome / login"
              value={nome}
              maxLength={100}
              onChange={(e) => setNome(e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              maxLength={100}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="border-t border-border-subtle pt-4 space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <ShieldCheck size={16} className="text-accent-primary" /> Segurança
            </p>

            <Input
              label={perfil?.tem_senha ? 'Senha atual (para confirmar alterações)' : 'PIN atual (para confirmar alterações)'}
              type="password"
              value={senhaAtual}
              autoComplete="current-password"
              onChange={(e) => setSenhaAtual(e.target.value)}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nova senha (em branco para manter)"
                type="password"
                value={novaSenha}
                autoComplete="new-password"
                onChange={(e) => setNovaSenha(e.target.value)}
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmarSenha}
                autoComplete="new-password"
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>

            <Input
              label="Novo PIN de 4 dígitos (em branco para manter)"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={novoPin}
              onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          {erro && <p className="text-sm text-accent-red">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={salvando}>
              <Check size={16} /> {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
