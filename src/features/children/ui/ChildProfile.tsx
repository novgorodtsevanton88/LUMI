import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Camera } from 'lucide-react';
import { db } from '@/data/db';
import { useUi } from '@/app/store';
import { compressImage } from '@/platform/image';
import { ageAt, correctedAgeAt, formatAge } from '@/domain/age/age';
import { GlassCard } from '@/ui/primitives/GlassCard';
import { Button } from '@/ui/primitives/Button';
import { useChildren } from '../hooks';
import { childToForm, createChild, deleteChild, setChildPhoto, updateChild } from '../service';
import { ChildAvatar } from './ChildAvatar';
import { ChildForm } from './ChildForm';

function BackHeader({ title }: { title: string }) {
  const nav = useNavigate();
  return (
    <header className="mb-4 flex items-center gap-1">
      <button onClick={() => nav(-1)} aria-label="Назад" className="-ml-3 grid h-11 w-11 place-items-center rounded-control text-accent"><ChevronLeft size={28} aria-hidden /></button>
      <h1 className="text-title-1">{title}</h1>
    </header>
  );
}

export function NewChildRoute() {
  const nav = useNavigate();
  const set = useUi((s) => s.set);
  return (
    <div>
      <BackHeader title="Нова дитина" />
      <GlassCard>
        <ChildForm submitLabel="Додати" onCancel={() => nav(-1)}
          onSubmit={async (c) => { const row = await createChild(db(), c); set({ activeChildId: row.id }); nav('/', { replace: true }); }} />
      </GlassCard>
    </div>
  );
}

export function ChildProfileRoute() {
  const { id } = useParams();
  const nav = useNavigate();
  const set = useUi((s) => s.set);
  const list = useChildren();
  const child = Array.isArray(list) ? list.find((c) => c.id === id) : undefined;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!Array.isArray(list)) return null;
  if (!child) return <p className="text-body">Профіль не знайдено. Можливо, його видалили на іншому пристрої.</p>;

  const now = new Date();
  const birth = new Date(`${child.birth_date}T00:00:00`);
  const corrected = correctedAgeAt(birth, child.gestational_age_weeks, now);

  async function pickPhoto(file: File | undefined) {
    if (!file || !child) return;
    if (file.size > 30 * 1024 * 1024) return setPhotoMsg('Файл завеликий. Оберіть фото до 30 МБ.');
    setPhotoMsg('Обробляємо фото…');
    try {
      await setChildPhoto(db(), child.id, await compressImage(file));
      setPhotoMsg(null);
    } catch {
      setPhotoMsg('Не вдалося відкрити це фото. Спробуйте JPEG або PNG.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <BackHeader title="Профіль" />
      <GlassCard className="flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()} className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Змінити фото">
          <ChildAvatar child={child} size={80} />
          <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-accent text-on-accent"><Camera size={15} aria-hidden /></span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-2">{child.name}</p>
          <p className="text-subhead text-text-secondary">{formatAge(ageAt(birth, now))}{corrected && ` · скоригований ${formatAge(corrected)}`}</p>
          {child.photo_path && (
            <button className="mt-1 min-h-11 text-subhead text-danger" onClick={() => void setChildPhoto(db(), child.id, null)}>Прибрати фото</button>
          )}
        </div>
        <input ref={fileRef} id="child-photo" type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
      </GlassCard>
      {photoMsg && <p role="status" className="px-1 text-subhead text-text-secondary">{photoMsg}</p>}
      <p className="px-1 text-footnote text-text-secondary">Фото зменшується на пристрої і зберігається приватно: його бачать лише члени сім'ї дитини.</p>

      <GlassCard>
        <ChildForm key={child.client_updated_at} initial={childToForm(child)} submitLabel={saved ? 'Збережено' : 'Зберегти зміни'}
          onSubmit={async (c) => { await updateChild(db(), child.id, c); setSaved(true); setTimeout(() => setSaved(false), 1500); }} />
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        {confirmDelete ? (
          <>
            <p className="text-subhead">Видалити профіль «{child.name}» разом з усіма записами? Інші члени сім'ї теж втратять доступ.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>Скасувати</Button>
              <Button variant="danger" className="flex-1" onClick={async () => {
                await deleteChild(db(), child.id);
                const next = list.find((c) => c.id !== child.id);
                set({ activeChildId: next?.id ?? null });
                nav('/', { replace: true });
              }}>Видалити</Button>
            </div>
          </>
        ) : <Button variant="secondary" className="text-danger" onClick={() => setConfirmDelete(true)}>Видалити профіль</Button>}
      </GlassCard>
    </div>
  );
}
