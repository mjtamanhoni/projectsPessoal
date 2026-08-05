interface Props {
  onShare: () => void;
  busy?: boolean;
  disabled?: boolean;
}

export default function ShareButton({ onShare, busy, disabled }: Props) {
  return (
    <button
      className="green-button"
      style={{ top: 742, opacity: disabled || busy ? 0.6 : 1 }}
      onClick={onShare}
      disabled={disabled || busy}
    >
      {busy ? 'Gerando PDF...' : '📄 Compartilhar PDF'}
    </button>
  );
}