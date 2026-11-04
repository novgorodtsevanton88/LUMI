import type { ReactNode } from 'react';
import { Moon } from 'lucide-react';
import { GlassCard } from '@/ui/primitives/GlassCard';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <div className="mb-8">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-card bg-sleep/20 text-sleep"><Moon size={28} aria-hidden /></div>
        <h1 className="text-large-title">{title}</h1>
        {subtitle && <p className="mt-2 text-body text-text-secondary">{subtitle}</p>}
      </div>
      <GlassCard>{children}</GlassCard>
      {footer && <div className="mt-6 flex flex-col items-center gap-2 text-subhead">{footer}</div>}
    </div>
  );
}
