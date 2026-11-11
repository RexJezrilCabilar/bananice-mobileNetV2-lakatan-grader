export function drawModelView(canvas, bitmap, size, mode, cropPct) {
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const width = bitmap.width
  const height = bitmap.height
  if (mode === 'center_crop') {
    const side = Math.min(width, height) * cropPct
    ctx.drawImage(bitmap, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size)
  } else {
    ctx.drawImage(bitmap, 0, 0, width, height, 0, 0, size, size)
  }
  return ctx
}

export function canvasToTensorData(ctx, size, mean, std) {
  const { data } = ctx.getImageData(0, 0, size, size)
  const plane = size * size
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    const p = i * 4
    out[i] = (data[p] / 255 - mean[0]) / std[0]
    out[plane + i] = (data[p + 1] / 255 - mean[1]) / std[1]
    out[2 * plane + i] = (data[p + 2] / 255 - mean[2]) / std[2]
  }
  return out
}