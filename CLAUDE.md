# LUMI — контекст для Claude Code

Безкоштовний PWA-помічник для батьків дітей 0–5 років: сон, здоров'я, фізичний розвиток, медичний календар, розвивальні ігри, сімейна синхронізація. Інтерфейс і спілкування з власником проєкту — українською.

- Повне ТЗ: `docs/TZ.md` (джерело вимог; розділ 23 — правила роботи).
- Погоджений технічний план Фази 0: `docs/phase-0.md` (архітектура, файли, БД, синхронізація, дизайн-система, компоненти, алгоритм сну, джерела, ризики, тести). Живий оригінал: https://claude.ai/artifact/Kf4mWoDBGaUvhxgmSJdhLj

## Статус

- Фаза 0 — завершена і погоджена власником.
- Фаза 1 — у роботі. Готово: каркас + токени; `domain/age`, `domain/sleep/sessions`, `nightMode` з тестами; Dexie + outbox + sync push/pull (Supabase-транспорт, Realtime лише як сигнал, in-memory сервер для тестів); Auth (вхід, реєстрація, відновлення і зміна пароля, вихід з дочищенням локальних даних), захищені маршрути (react-router), `/invite/:token` зберігає токен; онбординг, Головна з таймером сну, нічний режим, налаштування; PWA (injectManifest `src/app/sw.ts`, маніфест, іконки й iOS splash — `node scripts/generate-icons.cjs`, плашка оновлення). Без `VITE_SUPABASE_*` застосунок працює в локальному режимі без входу. Прев'ю: `npm run build:artifact` → `dist-preview/artifact.html`. Далі: перевірка з реальним Supabase, профіль дитини (редагування, фото, точний час народження), e2e Playwright, звіт про фазу.
- `supabase/migrations/0001_lumi_schema.sql` — повна схема (24 таблиці, RLS, тригери синхронізації, storage-бакет). Перевірена на PostgreSQL 16 із заглушками Supabase.
- `supabase/tests/rls_scenarios.sql` — 26 сценаріїв доступу та синхронізації; `local_supabase_stubs.sql` — заглушки `auth`/`storage` для локального прогону. Перед Фазою 3 перенести в pgTAP (`supabase test db`).

Перевірка схеми локально (без Supabase):

```bash
createdb lumi && psql -d lumi -f supabase/tests/local_supabase_stubs.sql \
  -f supabase/migrations/0001_lumi_schema.sql \
  -c "grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;" \
  -f supabase/tests/rls_scenarios.sql
```

## Ключові рішення (не змінювати без обговорення)

- Стек: React + TypeScript (strict) + Vite + Tailwind + Framer Motion + Lucide + Recharts + Supabase + Dexie + vite-plugin-pwa + date-fns; додатково zod, react-router, zustand, uuidv7, jspdf, vitest, playwright.
- Offline-first: UI читає лише з IndexedDB; мережа — тільки у синхронізаторі (outbox push + pull за `server_seq`). Realtime — лише сигнал, без даних.
- UUIDv7 генерує клієнт. Застарілі оновлення відкидає тригер БД (`client_updated_at`). Soft delete через `deleted_at`.
- RLS: `child_id in (select private.my_child_ids())`. `service_role` — лише в Edge Functions, ніколи у фронтенді.
- Шари: `src/domain` (чисті функції, без React/Dexie/Supabase) → `src/data` → `src/platform`; фічі в `src/features/<назва>`.
- Без AI API, платних сервісів і реклами. Прогноз сну — локальний алгоритм `sleep-predict@1` (розділ 9 плану).
- Медичні дані: лише офіційні джерела з версією та датою; жодних діагнозів і розрахунків доз.
- Артефакт-прев'ю для швидкого перегляду — лише локальне сховище, функції без бекенду позначені «Доступно в повній версії», не імітуються.

## Відкриті питання

- [ ] Звірити календар щеплень 2026 з офіційним текстом наказу МОЗ (№ 396 чи № 1722; 4-та доза Hib — 12 чи 18 міс; доба БЦЖ). Див. розділ 10 плану.
- [ ] Перевірити актуальні ліміти Supabase Free (supabase.com/pricing).
- [ ] Показати педіатру вікові орієнтири вікон неспання (розділ 9).
- [ ] Потрібні від власника: Supabase Project URL + anon key (регіон Frankfurt).

## Наступний крок — Фаза 1

Порядок: каркас Vite/TS/Tailwind + токени → `domain/age` і `domain/sleep/sessions` з тестами → Dexie + outbox + sync → Auth, захищені маршрути, onboarding, профілі дітей → Головна зі швидкими діями і таймером сну, теми, нічний режим → PWA → артефакт-прев'ю → звіт про фазу (реалізовано / перевірено автоматично / перевірено на пристрої / залишилось).
