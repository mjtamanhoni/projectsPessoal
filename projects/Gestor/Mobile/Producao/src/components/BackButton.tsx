interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button className="menu-back" onClick={onClick} aria-label="Voltar">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
