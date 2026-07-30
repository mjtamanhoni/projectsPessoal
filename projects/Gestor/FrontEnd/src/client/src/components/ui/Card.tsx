import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ title, children, className = '', onClick }: CardProps) {
  return (
    <div className={`card p-6 hover:border-accent-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
      {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
      {children}
    </div>
  );
}
