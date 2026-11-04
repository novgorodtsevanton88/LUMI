/** Позначка для функцій, які не імітуються в прев'ю / ще не реалізовані. */
export function SoonBadge({ children }: { children: string }) {
  return <span className="rounded-chip bg-surface-border px-2 py-0.5 text-caption text-text-secondary">{children}</span>;
}
