interface Props<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }

export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-control bg-surface-border p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 flex-1 rounded-[12px] px-3 text-subhead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${value === o.value ? 'bg-bg font-semibold text-text-primary shadow-card' : 'text-text-secondary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
