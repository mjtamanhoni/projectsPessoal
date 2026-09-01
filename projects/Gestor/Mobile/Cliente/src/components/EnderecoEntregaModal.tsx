import { useState } from 'react';
import type { Cliente, EnderecoEntrega } from '../api';
import { buscarCep } from '../format';

interface Props {
  cliente: Cliente;
  enderecoAtual?: EnderecoEntrega;
  onConfirmar: (endereco: EnderecoEntrega) => void;
  onFechar: () => void;
}

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid #d6ddd0',
  fontSize: 14,
  color: '#1b1f1c',
  background: '#ffffff',
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b706c',
  marginBottom: 4,
};

export default function EnderecoEntregaModal({ cliente, enderecoAtual, onConfirmar, onFechar }: Props) {
  const inicial = enderecoAtual ?? {
    cep: cliente.cep ?? '',
    endereco: cliente.endereco ?? '',
    nr: cliente.nr ?? '',
    complemento: cliente.complemento ?? '',
    bairro: cliente.bairro ?? '',
    cidade: cliente.cidade ?? '',
    uf: cliente.uf ?? '',
  };

  const [retira, setRetira] = useState((enderecoAtual?.retira_estabelecimento ?? 0) === 1);
  const [cep, setCep] = useState(inicial.cep ?? '');
  const [endereco, setEndereco] = useState(inicial.endereco ?? '');
  const [nr, setNr] = useState(inicial.nr ?? '');
  const [complemento, setComplemento] = useState(inicial.complemento ?? '');
  const [bairro, setBairro] = useState(inicial.bairro ?? '');
  const [cidade, setCidade] = useState(inicial.cidade ?? '');
  const [uf, setUf] = useState(inicial.uf ?? '');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [erro, setErro] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(enderecoAtual?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(enderecoAtual?.longitude);
  const [placeId] = useState<string | undefined>(enderecoAtual?.place_id);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [localizacaoMsg, setLocalizacaoMsg] = useState('');

  const buscarEnderecoPorCep = async () => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setBuscandoCep(true);
    setErroCep('');
    try {
      const data = await buscarCep(cep);
      if (!data) {
        setErroCep('CEP não encontrado');
        return;
      }
      setEndereco(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setUf(data.uf || '');
    } catch {
      setErroCep('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const usarMinhaLocalizacao = async () => {
    if (!navigator.geolocation) {
      setLocalizacaoMsg('Geolocalização não suportada neste dispositivo');
      return;
    }
    setBuscandoLocal(true);
    setLocalizacaoMsg('');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      setLocalizacaoMsg('Coordenadas capturadas! Buscando endereço...');

      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR&countrycodes=br`,
      );
      const data = await resp.json();
      if (data && data.address) {
        const a = data.address;
        const rua = a.road || a.residential || a.quarter || '';
        const num = a.house_number || '';
        const bair = a.suburb || a.neighbourhood || a.city_district || '';
        const cid = a.city || a.town || a.village || '';
        const est = a.state || '';
        const cepVal = a.postcode || '';

        if (rua) setEndereco(rua);
        if (num) setNr(num);
        if (bair) setBairro(bair);
        if (cid) setCidade(cid);
        if (est) setUf(est.substring(0, 2).toUpperCase());
        if (cepVal) setCep(cepVal.replace('-', ''));
        setLocalizacaoMsg('Endereço preenchido via GPS');
      } else {
        setLocalizacaoMsg('Coordenadas obtidas, mas endereço não encontrado. Preencha manualmente.');
      }
    } catch (err: unknown) {
      let msg = 'Erro ao obter localização';
      if (err instanceof GeolocationPositionError) {
        if (err.code === 1) msg = 'Permissão de localização negada. Ative nas configurações do celular.';
        else if (err.code === 2) msg = 'Localização indisponível. Verifique o GPS.';
        else if (err.code === 3) msg = 'Tempo esgotado. Tente novamente.';
      }
      setLocalizacaoMsg(msg);
    } finally {
      setBuscandoLocal(false);
    }
  };

  const confirmar = () => {
    if (!retira) {
      if (!endereco.trim()) {
        setErro('Informe o endereço');
        return;
      }
      if (!cidade.trim()) {
        setErro('Informe a cidade');
        return;
      }
      if (!uf.trim()) {
        setErro('Informe o estado (UF)');
        return;
      }
    }
    setErro('');
    onConfirmar({
      cep: retira ? undefined : (cep.replace(/\D/g, '') || undefined),
      endereco: retira ? undefined : (endereco.trim() || undefined),
      nr: retira ? undefined : (nr.trim() || undefined),
      complemento: retira ? undefined : (complemento.trim() || undefined),
      bairro: retira ? undefined : (bairro.trim() || undefined),
      cidade: retira ? undefined : (cidade.trim() || undefined),
      uf: retira ? undefined : (uf.trim().toUpperCase() || undefined),
      retira_estabelecimento: retira ? 1 : 0,
      latitude: retira ? undefined : latitude,
      longitude: retira ? undefined : longitude,
      place_id: retira ? undefined : placeId,
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-card" style={{ maxHeight: '92vh', overflow: 'hidden' }}>
        <div className="modal-head" style={{ height: 'auto', minHeight: 56 }}>
          <div
            className="modal-title"
            style={{
              position: 'static',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              maxWidth: 'calc(100% - 60px)',
              padding: '14px 16px 12px 20px',
              display: 'block',
            }}
          >
            Endereço de Entrega
          </div>
          <button className="modal-close" onClick={onFechar}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 120px)' }}>
          <div style={{ padding: '4px 20px 16px' }}>
            <div style={{ fontSize: 11, color: '#6b706c', marginBottom: 12 }}>
              Confirme ou altere o endereço para entrega
            </div>

            {/* Toggle Retirar no estabelecimento */}
            <div
              onClick={() => setRetira(!retira)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #d6ddd0',
                background: retira ? '#f0f7f1' : '#ffffff',
                cursor: 'pointer',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: retira ? '#2d5e3a' : '#d6ddd0',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: 2,
                    left: retira ? 20 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1b1f1c' }}>
                  Retirar no estabelecimento
                </div>
                <div style={{ fontSize: 10, color: '#6b706c' }}>
                  Vou buscar pessoalmente
                </div>
              </div>
            </div>

            {!retira && (<>
            {/* Botão usar minha localização */}
            <div style={{ marginBottom: 12 }}>
              <button
                className="confirm-btn save"
                style={{
                  width: '100%',
                  height: 38,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: (latitude && longitude && localizacaoMsg === 'Endereço preenchido via GPS') ? '#2d5e3a' : '#ffffff',
                  color: (latitude && longitude && localizacaoMsg === 'Endereço preenchido via GPS') ? '#ffffff' : '#2d5e3a',
                  border: '1.5px solid #2d5e3a',
                }}
                onClick={usarMinhaLocalizacao}
                disabled={buscandoLocal}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {buscandoLocal ? 'Obtendo localização...' : 'Usar minha localização atual'}
              </button>
              {localizacaoMsg && (
                <div style={{
                  fontSize: 10,
                  color: localizacaoMsg.includes('Erro') || localizacaoMsg.includes('negada') || localizacaoMsg.includes('indisponível') || localizacaoMsg.includes('Tempo') ? '#dc2626' : '#2d5e3a',
                  marginTop: 4,
                  textAlign: 'center',
                }}>
                  {localizacaoMsg}
                </div>
              )}
            </div>

            {/* CEP */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>CEP (opcional)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={buscarEnderecoPorCep}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <button
                  className="confirm-btn save"
                  style={{ flexShrink: 0, width: 'auto', padding: '0 14px', height: 38 }}
                  onClick={buscarEnderecoPorCep}
                  disabled={buscandoCep || cep.replace(/\D/g, '').length !== 8}
                >
                  {buscandoCep ? '...' : 'Buscar'}
                </button>
              </div>
              {erroCep && (
                <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>{erroCep}</div>
              )}
            </div>

            {/* Endereço */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Endereço *</div>
              <input
                style={inputStyle}
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            {/* Número */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Número</div>
              <input
                style={inputStyle}
                value={nr}
                onChange={(e) => setNr(e.target.value)}
                placeholder="Nº"
              />
            </div>

            {/* Complemento */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Complemento</div>
              <textarea
                style={{
                  ...inputStyle,
                  height: 64,
                  resize: 'none',
                  lineHeight: 1.3,
                }}
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Apto, Bloco, Casa, etc."
                maxLength={500}
              />
            </div>

            {/* Bairro */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Bairro</div>
              <input
                style={inputStyle}
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
              />
            </div>

            {/* Cidade + UF */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Cidade *</div>
                <input
                  style={inputStyle}
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div style={{ flex: '0 0 80px' }}>
                <div style={labelStyle}>UF *</div>
                <select
                  style={{
                    ...inputStyle,
                    appearance: 'none' as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b706c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: 28,
                  }}
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                >
                  <option value="">UF</option>
                  {UF_LIST.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            </>)}

            {/* Erro */}
            {erro && (
              <div className="modal-erro" style={{ position: 'static', margin: '0 0 8px', textAlign: 'center' }}>
                {erro}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
              <button className="confirm-btn cancel" onClick={onFechar}>
                Cancelar
              </button>
              <button className="confirm-btn save" onClick={confirmar}>
                Confirmar Endereço
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
