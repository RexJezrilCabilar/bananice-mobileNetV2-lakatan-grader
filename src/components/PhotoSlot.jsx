import { useEffect, useRef } from 'react'
import ImagePicker from './ImagePicker.jsx'

export default function PhotoSlot({ title, photo, disabled, onPick, onError }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photo) return
    canvas.width = 224
    canvas.height = 224
    canvas.getContext('2d').drawImage(photo.viewCanvas, 0, 0, 224, 224)
  }, [photo])

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={photo ? 'text-xs text-emerald-300' : 'text-xs text-slate-500'}>
          {photo ? 'Saved' : 'Not taken yet'}
        </span>
      </div>
      {photo ? (
        <canvas ref={canvasRef} className="w-full max-w-xs rounded-lg border border-slate-700" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
          No photo yet
        </div>
      )}
      <ImagePicker disabled={disabled} onPick={onPick} onError={onError} />
    </div>
  )
}