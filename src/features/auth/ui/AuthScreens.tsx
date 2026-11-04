import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MIN_PASSWORD, requestPasswordReset, signIn, signUp, updatePassword } from '@/platform/auth';
import { Button } from '@/ui/primitives/Button';
import { Field } from '@/ui/primitives/Field';
import { AuthLayout } from './AuthLayout';
import { authErrorText, isEmail } from './messages';

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError(null);
    try { setError(await fn()); } catch { setError(authErrorText.unknown); } finally { setBusy(false); }
  };
  return { busy, error, setError, run };
}

const ErrorText = ({ text }: { text: string | null }) => (text ? <p role="alert" className="text-subhead text-danger">{text}</p> : null);
const linkCls = 'min-h-11 inline-flex items-center text-accent underline-offset-4 hover:underline';

export function SignIn() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const s = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void s.run(async () => {
      if (!isEmail(email)) return 'Вкажіть пошту у форматі name@example.com.';
      const err = await signIn(email.trim(), password);
      if (err) return authErrorText[err];
      nav(params.get('next') ?? '/', { replace: true });
      return null;
    });
  };
  return (
    <AuthLayout title="Вхід" subtitle="Записи синхронізуються між вашими пристроями і з іншим з батьків."
      footer={<><Link className={linkCls} to="/auth/reset">Забули пароль?</Link><span className="text-text-secondary">Немає акаунта? <Link className={linkCls} to="/auth/sign-up">Створити</Link></span></>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="signin-email" label="Пошта" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="signin-password" label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText text={s.error} />
        <Button type="submit" disabled={s.busy} className="min-h-14">{s.busy ? 'Входимо…' : 'Увійти'}</Button>
      </form>
    </AuthLayout>
  );
}

export function SignUp() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const s = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void s.run(async () => {
      if (!isEmail(email)) return 'Вкажіть пошту у форматі name@example.com.';
      if (password.length < MIN_PASSWORD) return `Пароль — щонайменше ${MIN_PASSWORD} символів.`;
      const r = await signUp(email.trim(), password, name.trim());
      if (r.error) return authErrorText[r.error];
      if (r.needsConfirm) setSent(true); else nav('/', { replace: true });
      return null;
    });
  };
  if (sent) {
    return <AuthLayout title="Перевірте пошту" subtitle={`Ми надіслали посилання на ${email}. Відкрийте його на цьому пристрої, щоб завершити реєстрацію.`}
      footer={<Link className={linkCls} to="/auth/sign-in">До входу</Link>}><p className="text-subhead text-text-secondary">Лист не прийшов за 5 хвилин? Перевірте «Спам».</p></AuthLayout>;
  }
  return (
    <AuthLayout title="Новий акаунт" subtitle="Безкоштовно, без реклами. Дані дитини бачите лише ви та ті, кого ви запросите."
      footer={<span className="text-text-secondary">Вже є акаунт? <Link className={linkCls} to="/auth/sign-in">Увійти</Link></span>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="signup-name" label="Ваше ім'я" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} hint="Його побачить інший з батьків у сімейному доступі." />
        <Field id="signup-email" label="Пошта" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="signup-password" label="Пароль" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={`Щонайменше ${MIN_PASSWORD} символів.`} />
        <ErrorText text={s.error} />
        <Button type="submit" disabled={s.busy} className="min-h-14">{s.busy ? 'Створюємо…' : 'Створити акаунт'}</Button>
      </form>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const s = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void s.run(async () => {
      if (!isEmail(email)) return 'Вкажіть пошту у форматі name@example.com.';
      const err = await requestPasswordReset(email.trim());
      if (err && err !== 'invalid_credentials') return authErrorText[err];
      setSent(true);
      return null;
    });
  };
  return (
    <AuthLayout title="Відновлення пароля" subtitle={sent ? 'Якщо акаунт із цією поштою існує, ми надіслали лист із посиланням.' : 'Надішлемо посилання для нового пароля.'}
      footer={<Link className={linkCls} to="/auth/sign-in">До входу</Link>}>
      {sent ? <p className="text-subhead text-text-secondary">Посилання діє 1 годину.</p> : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field id="reset-email" label="Пошта" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorText text={s.error} />
          <Button type="submit" disabled={s.busy} className="min-h-14">Надіслати посилання</Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function UpdatePassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const s = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void s.run(async () => {
      if (password.length < MIN_PASSWORD) return `Пароль — щонайменше ${MIN_PASSWORD} символів.`;
      const err = await updatePassword(password);
      if (err) return authErrorText[err];
      nav('/', { replace: true });
      return null;
    });
  };
  return (
    <AuthLayout title="Новий пароль">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="new-password" label="Новий пароль" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText text={s.error} />
        <Button type="submit" disabled={s.busy} className="min-h-14">Зберегти пароль</Button>
      </form>
    </AuthLayout>
  );
}

/** Зберігає токен запрошення до входу. Прийняття — разом із сімейним доступом (Edge Function accept-invitation). */
export function InviteLanding() {
  const { token } = useParams();
  try { if (token) localStorage.setItem('lumi.invite', token); } catch { /* без сховища токен доведеться відкрити ще раз після входу */ }
  return (
    <AuthLayout title="Запрошення до LUMI" subtitle="Вас запросили вести записи дитини разом. Увійдіть або створіть акаунт з тією поштою, на яку прийшов лист."
      footer={<Link className={linkCls} to="/auth/sign-up">Створити акаунт</Link>}>
      <Link to="/auth/sign-in" className="flex min-h-14 items-center justify-center rounded-control bg-accent text-headline text-on-accent">Увійти</Link>
    </AuthLayout>
  );
}
