import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ChildRow } from '@/data/db';
import { useUi } from '@/app/store';

/** undefined — ще завантажується; 'error' — IndexedDB недоступна. */
export function useChildren(): ChildRow[] | undefined | 'error' {
  return useLiveQuery(
    () => db().children.toArray().then((r) => r.filter((c) => !c.deleted_at).sort((a, b) => a.id.localeCompare(b.id))).catch(() => 'error' as const),
    [],
  );
}

export function useActiveChild(children: ChildRow[]): ChildRow | undefined {
  const id = useUi((s) => s.activeChildId);
  return children.find((c) => c.id === id) ?? children[0];
}
