import { useState, type FormEvent } from 'react';
import { validateChild, type ChildError, type NewChild } from '../service';
import { Button } from '@/ui/primitives/Button';
import { Field } from '@/ui/primitives/Field';
import { Segmented } from '@/ui/primitives/Segmented';

export const childErrorText: Record<ChildError, string> = {
  name_required: "Вкажіть ім'я дитини.",
  name_too_long: "Ім'я — до 60 символів.",
  birth_in_future: 'Дата й час народження не можуть бути в майбутньому.',
  birth_too_old: 'LUMI розрахований на дітей до 5 років. Перевірте рік народження.',
  weeks_range: 'Термін при народженні — від 22 до 44 тижнів.',
  time_invalid: 'Вкажіть час у форматі ГГ:ХХ.',
};

export const emptyChild: NewChild = { name: '', birthDate: '', birthTime: null, sex: 'female', gestationalWeeks: null };

interface Props {
  initial?: NewChild;
  submitLabel: string;
  onSubmit: (c: NewChild) => Promise<void>;
  onCancel?: () => void;
}

export function ChildForm({ initial = emptyChild, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<NewChild>(initial);
  const [preterm, setPreterm] = useState(initial.gestationalWeeks != null && initial.gestationalWeeks < 37);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateChild(form);
    if (err) return setError(childErrorText[err]);
    setBusy(true);
    try { await onSubmit(form); } catch (x) {
      const code = (x as Error).message as ChildError;
      setError(childErrorText[code] ?? 'Не вдалося зберегти. Спробуйте ще раз.');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field id="child-name" label="Ім'я" value={form.name} maxLength={60} autoComplete="off"
        onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Наприклад, Марта" />
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field id="child-birth" label="Дата народження" type="date" max={today} value={form.birthDate}
          onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        <Field id="child-birth-time" label="Час (якщо знаєте)" type="time" value={form.birthTime ?? ''}
          onChange={(e) => setForm({ ...form, birthTime: e.target.value || null })} />
      </div>
      <div>
        <span className="mb-1.5 block text-subhead text-text-secondary">Стать (для графіків ВООЗ)</span>
        <Segmented label="Стать" value={form.sex} onChange={(sex) => setForm({ ...form, sex })}
          options={[{ value: 'female', label: 'Дівчинка' }, { value: 'male', label: 'Хлопчик' }]} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input id="child-preterm" type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={preterm}
          onChange={(e) => { setPreterm(e.target.checked); setForm({ ...form, gestationalWeeks: e.target.checked ? form.gestationalWeeks ?? 34 : null }); }} />
        Народилася(-вся) раніше 37 тижнів
      </label>
      {preterm && (
        <Field id="child-weeks" label="Термін при народженні, тижнів" type="number" min={22} max={36} inputMode="numeric"
          value={form.gestationalWeeks ?? ''} hint="Покажемо також скоригований вік — до 2 років."
          onChange={(e) => setForm({ ...form, gestationalWeeks: e.target.value ? Number(e.target.value) : null })} />
      )}
      {error && <p role="alert" className="text-subhead text-danger">{error}</p>}
      <div className="mt-2 flex gap-3">
        {onCancel && <Button type="button" variant="secondary" className="min-h-14 flex-1" onClick={onCancel}>Скасувати</Button>}
        <Button type="submit" disabled={busy} className="min-h-14 flex-1">{submitLabel}</Button>
      </div>
    </form>
  );
}
