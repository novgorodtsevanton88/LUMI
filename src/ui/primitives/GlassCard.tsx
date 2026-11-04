import type { HTMLAttributes } from 'react';

export function GlassCard({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass rounded-card p-5 shadow-card ${className}`} {...rest} />;
}
