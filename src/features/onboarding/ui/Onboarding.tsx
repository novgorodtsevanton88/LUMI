import { useState, type FormEvent } from 'react';
import { Moon } from 'lucide-react';
import { db } from '@/data/db';
import { createChild, validateChild, type ChildError, type NewChild } from '@/features/children/service';
import { useUi } from '@/app/store';
import { Button } from '@/ui/primitives/Button';
import { Field } from '@/ui/primitives/Field';
import { Segmented } from '@/ui/primitives/Segmented';
import { GlassCard } from '@/ui/primitives/GlassCard';

const errors: Record<ChildError, string> = {
  name_required: "Вкажіть ім'я дитини.",
  name_too_long: "Ім'я — до 60 символів.",
  birth_in_future: 'Дата народження не може бути в майбутньому.',
  birth_too_old: 'LUMI розрахований на дітей до 5 років. Перевірте рік народження.',
  weeks_range: 'Термін при народженні — від 22 до 44 тижнів.',
};

export function Onboarding({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const set = useUi((s) => s.set);
  const [form, setForm] = useState<NewChild>({ name: '', birthDate: '', sex: 'female', gestationalWeeks: null });
  const [preterm, setPreterm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateChild(form);
    if (err) return setError(errors[err]);
    const row = await createChild(db(), form);
    set({ activeChildId: row.id });
    onDone?.();
  }

  return (
    <div className={compact ? '' : 'mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10'}>
      {!compact && (
        <div className="mb-8">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-card bg-sleep/20 text-sleep"><Moon size={28} aria-hidden /></div>
          <h1 className="text-large-title">Вітаємо в LUMI</h1>
          <p className="mt-2 text-body text-text-secondary">Розкажіть про дитину. Вік і поради рахуються від дати народження. Усе зберігається на цьому пристрої.</p>
        </div>
      )}
      <GlassCard>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field id="child-name" label="Ім'я" value={form.name} maxLength={60} autoComplete="off"
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Наприклад, Марта" />
          <Field id="child-birth" label="Дата народження" type="date" max={today} value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <div>
            <span className="mb-1.5 block text-subhead text-text-secondary">Стать (для графіків ВООЗ)</span>
            <Segmented label="Стать" value={form.sex} onChange={(sex) => setForm({ ...form, sex })}
              options={[{ value: 'female', label: 'Дівчинка' }, { value: 'male', label: 'Хлопчик' }]} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-body">
            <input id="child-preterm" type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={preterm}
              onChange={(e) => { setPreterm(e.target.checked); setForm({ ...form, gestationalWeeks: e.target.checked ? 34 : null }); }} />
            Народилася(-вся) раніше 37 тижнів
          </label>
          {preterm && (
            <Field id="child-weeks" label="Термін при народженні, тижнів" type="number" min={22} max={36} inputMode="numeric"
              value={form.gestationalWeeks ?? ''} hint="Покажемо також скоригований вік — до 2 років."
              onChange={(e) => setForm({ ...form, gestationalWeeks: e.target.value ? Number(e.target.value) : null })} />
          )}
          {error && <p role="alert" className="text-subhead text-danger">{error}</p>}
          <Button type="submit" className="mt-2 min-h-14">Зберегти</Button>
        </form>
      </GlassCard>
    </div>
  );
}
