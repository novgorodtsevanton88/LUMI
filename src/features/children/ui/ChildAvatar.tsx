import type { ChildRow } from '@/data/db';
import { useChildPhoto } from '../hooks';

export function ChildAvatar({ child, size = 44 }: { child: ChildRow; size?: number }) {
  const url = useChildPhoto(child);
  const initial = child.name.trim().charAt(0).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-sleep/20 font-semibold text-sleep"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}
