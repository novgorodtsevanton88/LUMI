import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncTransport } from './transport';

const BUCKET = 'child-media';

/** server_seq призначає сервер, тому при upsert його не надсилаємо. */
export function supabaseTransport(sb: SupabaseClient): SyncTransport {
  return {
    async upsert(table, rows) {
      const body = rows.map(({ server_seq: _s, ...r }) => r);
      const { error } = await sb.from(table).upsert(body as never, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    },
    async pull(table, since, limit) {
      const { data, error } = await sb.from(table).select('*').gt('server_seq', since).order('server_seq').limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as never;
    },
    media: {
      async upload(path, blob, mime) {
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: true });
        if (error) throw new Error(error.message);
      },
      async remove(path) {
        const { error } = await sb.storage.from(BUCKET).remove([path]);
        if (error) throw new Error(error.message);
      },
      async download(path) {
        // приватний бакет: лише signed URL на 1 годину (розділ 3 плану)
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (error || !data) throw new Error(error?.message ?? 'signed_url');
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`download ${res.status}`);
        return res.blob();
      },
    },
  };
}
