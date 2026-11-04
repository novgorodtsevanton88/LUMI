import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus, UserRound } from 'lucide-react';
import type { ChildRow } from '@/data/db';
import { useUi } from '@/app/store';
import { Sheet } from '@/ui/primitives/Sheet';
import { useChildren } from '../hooks';
import { ChildAvatar } from './ChildAvatar';

/** Ім'я дитини в заголовку Головної: перемикання, профіль, додавання. */
export function ChildSwitcher({ child }: { child: ChildRow }) {
  const [open, setOpen] = useState(false);
  const list = useChildren();
  const children = Array.isArray(list) ? list : [child];
  const set = useUi((s) => s.set);
  const nav = useNavigate();
  const go = (to: string) => { setOpen(false); nav(to); };

  return (
    <>
      <button onClick={() => setOpen(true)} className="-ml-1 flex min-h-11 items-center gap-3 rounded-control px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-haspopup="dialog">
        <ChildAvatar child={child} size={48} />
        <span className="flex items-center gap-1 text-large-title">{child.name}<ChevronDown size={22} className="mt-1 text-text-secondary" aria-hidden /></span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Діти">
        <ul className="flex flex-col gap-1">
          {children.map((c) => (
            <li key={c.id}>
              <button onClick={() => { set({ activeChildId: c.id }); setOpen(false); }} aria-pressed={c.id === child.id}
                className="flex min-h-14 w-full items-center gap-3 rounded-control px-2 text-left text-headline hover:bg-surface-border">
                <ChildAvatar child={c} size={40} /><span className="flex-1 truncate">{c.name}</span>
                {c.id === child.id && <Check size={20} className="text-accent" aria-label="Активна" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col border-t border-surface-border pt-3">
          <button onClick={() => go(`/children/${child.id}`)} className="flex min-h-12 items-center gap-3 px-2 text-headline text-accent"><UserRound size={20} aria-hidden />Профіль дитини</button>
          <button onClick={() => go('/children/new')} className="flex min-h-12 items-center gap-3 px-2 text-headline text-accent"><Plus size={20} aria-hidden />Додати дитину</button>
        </div>
      </Sheet>
    </>
  );
}
