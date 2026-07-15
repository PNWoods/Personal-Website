'use client'

interface StepperProps {
  label: string
  value: number
  step: number
  min?: number
  onChange: (value: number) => void
}

export default function Stepper({
  label,
  value,
  step,
  min = 0,
  onChange,
}: StepperProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-16 w-16 rounded-xl border border-white/20 bg-white/5 text-3xl font-bold active:bg-white/20"
        >
          −
        </button>
        <span className="w-24 text-center text-4xl font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="h-16 w-16 rounded-xl border border-white/20 bg-white/5 text-3xl font-bold active:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  )
}
