import type { AuthErrorCode } from '@/platform/auth';

export const authErrorText: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Неправильна пошта або пароль.',
  email_not_confirmed: 'Підтвердьте пошту: відкрийте посилання з листа від LUMI.',
  user_exists: 'Акаунт із цією поштою вже існує. Увійдіть або відновіть пароль.',
  weak_password: 'Пароль занадто простий. Використайте щонайменше 8 символів, літери й цифри.',
  rate_limited: 'Забагато спроб. Зачекайте хвилину і спробуйте ще раз.',
  offline: 'Немає з\'єднання з інтернетом. Вхід потребує мережі, а записи можна вести й офлайн після входу.',
  unknown: 'Не вдалося виконати дію. Спробуйте ще раз.',
};

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
