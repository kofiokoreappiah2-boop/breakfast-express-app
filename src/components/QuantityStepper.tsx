import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  label: string;
};

export function QuantityStepper({ value, onChange, min = 1, label }: Props) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-background">
      <button
        type="button"
        aria-label={`Decrease quantity of ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-11 w-11 place-items-center rounded-l-xl text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="w-10 text-center text-base font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity of ${label}`}
        onClick={() => onChange(Math.min(100, value + 1))}
        className="grid h-11 w-11 place-items-center rounded-r-xl text-foreground transition-colors hover:bg-secondary"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
