/**
 * Reusable inspector field components.
 *
 * Controlled components that call `onChange` on every edit. The parent
 * InspectorPanel wires these to the editor store's `updateNodeData`.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Field wrapper with a label. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wider text-[hsl(35,15%,55%)]">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-[hsl(35,15%,45%)]">{hint}</span>}
    </label>
  );
}

/** Single-line text input. */
export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-1.5 text-sm text-[hsl(40,30%,92%)] outline-none transition-colors focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
    />
  );
}

/** Multi-line textarea. */
export function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value ?? ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-1.5 text-sm text-[hsl(40,30%,92%)] outline-none transition-colors focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
    />
  );
}

/** URL input (accepts dropped asset URLs via dataTransfer). */
export function UrlField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      onDrop={(e) => {
        const url = e.dataTransfer.getData('application/zorron-asset-url');
        if (url) {
          e.preventDefault();
          onChange(url);
        }
      }}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('application/zorron-asset-url')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      className="flex items-center gap-2"
    >
      <input
        type="url"
        value={value ?? ''}
        placeholder={placeholder ?? 'https://...'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-1.5 text-sm text-[hsl(40,30%,92%)] outline-none transition-colors focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
      />
      {value && (
        <span className="flex-shrink-0 text-[10px] text-[hsl(38,92%,66%)]">已设置</span>
      )}
    </div>
  );
}

/** Number input. */
export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-1.5 text-sm text-[hsl(40,30%,92%)] outline-none transition-colors focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
    />
  );
}

/** Select dropdown. */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-1.5 text-sm text-[hsl(40,30%,92%)] outline-none transition-colors focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Toggle switch. */
export function SwitchField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-3 py-2 text-sm text-[hsl(40,30%,85%)]"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-[hsl(38,92%,56%)]' : 'bg-[hsl(28,14%,28%)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
