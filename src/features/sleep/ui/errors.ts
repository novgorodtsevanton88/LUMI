import { SleepError } from '../service';

const text: Record<SleepError['code'], string> = {
  end_before_start: 'Кінець сну має бути пізніше за початок.',
  too_long: 'Сон довший за 20 годин. Перевірте дати.',
  in_future: 'Час не може бути в майбутньому.',
  overlap: 'Цей проміжок перетинається з іншим записом сну.',
  already_active: 'Сон уже триває.',
  not_found: 'Запис не знайдено. Можливо, його вже змінили на іншому пристрої.',
};
export const sleepErrorText = (e: unknown) => (e instanceof SleepError ? text[e.code] : 'Не вдалося зберегти. Спробуйте ще раз.');
