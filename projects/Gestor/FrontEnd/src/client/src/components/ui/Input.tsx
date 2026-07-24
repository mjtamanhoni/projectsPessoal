import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="label-field">{label}</label>}
      <input ref={ref} className={`input-field ${error ? 'ring-2 ring-accent-red/30 border-accent-red' : ''} ${className}`} {...props} />
      {error && <p className="text-sm text-accent-red mt-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
