import { useEffect, useMemo, useRef } from 'react'
import { bilinearResize, heatToImageData } from '../lib/cam.js'

export default function Heatmap({ viewCanvas, cam, size, opacity, showHeat }) {
  const canvasRef = useRef(null)

  const heatCanvas = useMemo(() => {
    const values = bilinearResize(cam.map, cam.w, cam.h, size, size)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d').putImageData(heatToImageData(values, size, size), 0, 0)
    return canvas
  }, [cam, size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(viewCanvas, 0, 0)
    if (showHeat) {
      ctx.globalAlpha = opacity
      ctx.drawImage(heatCanvas, 0, 0)
      ctx.globalAlpha = 1
    }
  }, [viewCanvas, heatCanvas, size, opacity, showHeat])

  return <canvas ref={canvasRef} className="w-full max-w-md rounded-xl border border-slate-700" />
}