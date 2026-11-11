export default function ImagePicker({ disabled, onPick }) {
  function handleChange(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (file) onPick(file)
  }

  const buttonClass = disabled
    ? 'cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-400'
    : 'cursor-pointer rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400'

  return (
    <div className="flex flex-wrap gap-3">
      <label className={buttonClass}>
        Choose photo
        <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={handleChange} />
      </label>
      <label className={buttonClass}>
        Take photo
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={disabled} onChange={handleChange} />
      </label>
    </div>
  )
}