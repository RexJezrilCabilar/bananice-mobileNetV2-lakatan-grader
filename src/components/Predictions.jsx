export default function Predictions({ items, selectedIndex, onSelect }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const percent = (item.prob * 100).toFixed(1)
        const active = item.index === selectedIndex
        const rowClass = active
          ? 'w-full rounded-lg border border-sky-400 bg-slate-800 px-3 py-2 text-left'
          : 'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left hover:bg-slate-800'
        return (
          <li key={item.index}>
            <button type="button" className={rowClass} onClick={() => onSelect(item.index)}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="tabular-nums">{percent}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-700">
                <div className="h-full bg-sky-400" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>Front {(item.front * 100).toFixed(1)}%</span>
                <span>Back {(item.back * 100).toFixed(1)}%</span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}