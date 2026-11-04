import { Moon } from 'lucide-react';
import { db } from '@/data/db';
import { createChild } from '@/features/children/service';
import { ChildForm } from '@/features/children/ui/ChildForm';
import { useUi } from '@/app/store';
import { GlassCard } from '@/ui/primitives/GlassCard';

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const set = useUi((s) => s.set);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-card bg-sleep/20 text-sleep"><Moon size={28} aria-hidden /></div>
        <h1 className="text-large-title">Вітаємо в LUMI</h1>
        <p className="mt-2 text-body text-text-secondary">Розкажіть про дитину. Вік і поради рахуються від дати народження. Фото можна додати потім у профілі.</p>
      </div>
      <GlassCard>
        <ChildForm submitLabel="Зберегти" onSubmit={async (c) => { const row = await createChild(db(), c); set({ activeChildId: row.id }); onDone?.(); }} />
      </GlassCard>
    </div>
  );
}
