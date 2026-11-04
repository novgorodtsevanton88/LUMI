import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ChildRow } from '@/data/db';
import { getMediaBlob } from '@/data/sync/media';
import { mediaTransport } from '@/data/sync/runner';
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

/** Object URL фото дитини: з локального кешу, інакше — з приватного Storage. */
export function useChildPhoto(child: ChildRow | undefined): string | null {
  const path = child?.photo_path ?? null;
  const cached = useLiveQuery(() => (path ? db().media.get(path) : undefined), [path]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    if (!path || !child) { setUrl(null); return; }
    const show = (b: Blob | null) => { if (b && !revoked) { objectUrl = URL.createObjectURL(b); setUrl(objectUrl); } };
    if (cached?.blob) show(cached.blob);
    else void getMediaBlob(db(), path, child.id, mediaTransport).then(show).catch(() => setUrl(null));
    return () => { revoked = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, cached?.blob, child]);
  return url;
}
