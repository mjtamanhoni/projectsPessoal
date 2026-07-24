interface SpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function Spinner({ fullPage = false, size = 'md' }: SpinnerProps) {
  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-accent-primary ${sizeMap[size]}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center py-8">
      {spinner}
    </div>
  );
}
