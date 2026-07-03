interface ProgressBarProps { value: number }

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[3px] bg-ink/8">
      <div
        className="h-full bg-gradient-to-r from-moss to-sage transition-[width] duration-500 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
