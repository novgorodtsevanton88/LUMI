import { GlassCard } from '@/ui/primitives/GlassCard';

export function App() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="text-large-title">LUMI</h1>
      <GlassCard className="mt-6">
        <p className="text-body text-text-secondary">Каркас Фази 1. Екрани з'являться в наступних кроках.</p>
      </GlassCard>
    </main>
  );
}
