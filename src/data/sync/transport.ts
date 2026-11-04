import type { RowByTable, SyncTable } from '../db';

/** Мережа для синхронізатора. Реалізації: Supabase (platform) і in-memory (тести). */
export interface SyncTransport {
  /** Надсилає рядки; застарілі оновлення відкидає тригер БД, це не помилка. */
  upsert<T extends SyncTable>(table: T, rows: RowByTable[T][]): Promise<void>;
  /** Рядки з server_seq > since, за зростанням server_seq. */
  pull<T extends SyncTable>(table: T, since: number, limit: number): Promise<RowByTable[T][]>;
  /** Приватний бакет child-media. */
  media: {
    upload(path: string, blob: Blob, mime: string): Promise<void>;
    remove(path: string): Promise<void>;
    download(path: string): Promise<Blob>;
  };
}
