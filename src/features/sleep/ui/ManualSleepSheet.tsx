import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { db } from '@/data/db';
import type { SleepKind } from '@/domain/sleep/sessions';
import { Sheet } from '@/ui/primitives/Sheet';
import { Field } from '@/ui/primitives/Field';
import { Segmented } from '@/ui/primitives/Segmented';
import { Button } from '@/ui/primitives/Button';
import { addManualSleep } from '../service';
import { sleepErrorText } from './errors';

const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function ManualSleepSheet({ open, onClose, childId }: { open: boolean; onClose: () => void; childId: string }) {
  const [kind, setKind] = useState<SleepKind>('nap');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setStart(local(new Date(now.getTime() - 90 * 60000)));
    setEnd(local(now));
    setError(null);
  }, [open]);

  async function save() {
    try {
      await addManualSleep(db(), childId, kind, new Date(start), new Date(end));
      onClose();
    } catch (e) { setError(sleepErrorText(e)); }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Додати сон">
      <div className="flex flex-col gap-4">
        <Segmented label="Тип сну" value={kind} onChange={setKind} options={[{ value: 'nap', label: 'Денний' }, { value: 'night', label: 'Нічний' }]} />
        <Field id="manual-start" label="Заснула(-в)" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <Field id="manual-end" label="Прокинулася(-вся)" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        {error && <p role="alert" className="text-subhead text-danger">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Скасувати</Button>
          <Button className="flex-1" onClick={save}>Зберегти</Button>
        </div>
      </div>
    </Sheet>
  );
}
