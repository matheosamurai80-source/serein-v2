export function ProgressBar({ value }: { value: number }) {
  return (<div className="fixed top-0 left-0 right-0 z-[200] h-[3px] bg-white/6">
    <div className="h-full bg-[#82A884] transition-[width] duration-500" style={{ width: `${value}%` }} />
  </div>)
}
