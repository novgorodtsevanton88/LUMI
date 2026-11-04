import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncTransport } from './transport';

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
  };
}
