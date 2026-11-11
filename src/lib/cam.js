export function softmax(logits) {
  let max = -Infinity
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i]
  }
  const out = new Float32Array(logits.length)
  let sum = 0
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max)
    sum += out[i]
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum
  return out
}

export function topK(probs, labels, k) {
  return Array.from(probs, (prob, index) => ({
    index,
    prob,
    label: labels[index] ?? `class ${index}`,
  }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, k)
}

export function averageProbs(probsList) {
  const length = probsList[0].length
  const out = new Float32Array(length)
  for (const probs of probsList) {
    for (let i = 0; i < length; i++) out[i] += probs[i]
  }
  for (let i = 0; i < length; i++) out[i] /= probsList.length
  return out
}

// camDims = [1, numClasses, h, w]. Returns a ReLU'd, 0..1 normalised map for one class.
export function extractCam(cams, camDims, classIndex) {
  const h = camDims[2]
  const w = camDims[3]
  const plane = h * w
  const start = classIndex * plane
  const map = new Float32Array(plane)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < plane; i++) {
    const value = Math.max(cams[start + i], 0)
    map[i] = value
    if (value < min) min = value
    if (value > max) max = value
  }
  const range = max - min + 1e-7
  for (let i = 0; i < plane; i++) map[i] = (map[i] - min) / range
  return { map, w, h }
}

export function bilinearResize(src, sw, sh, dw, dh) {
  const dst = new Float32Array(dw * dh)
  const xScale = sw / dw
  const yScale = sh / dh
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(Math.max((y + 0.5) * yScale - 0.5, 0), sh - 1)
    const y0 = Math.floor(fy)
    const y1 = Math.min(y0 + 1, sh - 1)
    const wy = fy - y0
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(Math.max((x + 0.5) * xScale - 0.5, 0), sw - 1)
      const x0 = Math.floor(fx)
      const x1 = Math.min(x0 + 1, sw - 1)
      const wx = fx - x0
      const top = src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx
      const bottom = src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx
      dst[y * dw + x] = top * (1 - wy) + bottom * wy
    }
  }
  return dst
}

// 256-entry "jet" colour table
const LUT = (() => {
  const table = new Uint8ClampedArray(256 * 3)
  const clamp01 = (v) => Math.min(1, Math.max(0, v))
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    table[i * 3] = Math.round(255 * clamp01(1.5 - Math.abs(4 * t - 3)))
    table[i * 3 + 1] = Math.round(255 * clamp01(1.5 - Math.abs(4 * t - 2)))
    table[i * 3 + 2] = Math.round(255 * clamp01(1.5 - Math.abs(4 * t - 1)))
  }
  return table
})()

export function heatToImageData(values, width, height) {
  const imageData = new ImageData(width, height)
  const pixels = imageData.data
  for (let i = 0; i < values.length; i++) {
    const level = Math.min(255, Math.max(0, Math.round(values[i] * 255)))
    const p = i * 4
    pixels[p] = LUT[level * 3]
    pixels[p + 1] = LUT[level * 3 + 1]
    pixels[p + 2] = LUT[level * 3 + 2]
    pixels[p + 3] = 255
  }
  return imageData
}