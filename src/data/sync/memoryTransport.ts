import type { RowByTable, SyncTable } from '../db';
import type { SyncTransport } from './transport';

/** Модель сервера для тестів: server_seq і відкидання застарілих оновлень, як тригер у 0001_lumi_schema.sql. */
export class MemoryServer {
  seq = 0;
  tables: { [K in SyncTable]: Map<string, RowByTable[K]> } = { children: new Map(), sleep_sessions: new Map() };
  failNext = false;
  files = new Map<string, Blob>();

  transport(): SyncTransport {
    return {
      upsert: async (table, rows) => {
        if (this.failNext) { this.failNext = false; throw new Error('network down'); }
        const map = this.tables[table] as Map<string, RowByTable[typeof table]>;
        for (const r of rows) {
          const cur = map.get(r.id);
          if (cur && cur.client_updated_at >= r.client_updated_at) continue;
          map.set(r.id, { ...r, server_seq: ++this.seq });
        }
      },
      pull: async (table, since, limit) =>
        [...(this.tables[table] as Map<string, RowByTable[typeof table]>).values()]
          .filter((r) => r.server_seq > since)
          .sort((a, b) => a.server_seq - b.server_seq)
          .slice(0, limit),
      media: {
        upload: async (path, blob) => {
          if (this.failNext) { this.failNext = false; throw new Error('network down'); }
          this.files.set(path, blob);
        },
        remove: async (path) => { this.files.delete(path); },
        download: async (path) => {
          const f = this.files.get(path);
          if (!f) throw new Error('not found');
          return f;
        },
      },
    };
  }
}
