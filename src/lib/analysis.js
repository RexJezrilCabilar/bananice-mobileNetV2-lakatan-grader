import { averageProbs, softmax, topK } from './cam.js'
import { canvasToTensorData, drawModelView } from './imageUtils.js'
import { predict } from './ort.js'

export const DISPLAY_SIZE = 448

// Turns one photo (File or Blob) into the model input numbers plus a picture to display
export async function preparePhoto(file, config) {
  const bitmap = await createImageBitmap(file)
  try {
    const inferCanvas = document.createElement('canvas')
    const inferCtx = drawModelView(inferCanvas, bitmap, config.input_size, config.resize_mode, config.crop_pct)
    const tensorData = canvasToTensorData(inferCtx, config.input_size, config.mean, config.std)

    const viewCanvas = document.createElement('canvas')
    drawModelView(viewCanvas, bitmap, DISPLAY_SIZE, config.resize_mode, config.crop_pct)

    return { tensorData, viewCanvas }
  } finally {
    bitmap.close()
  }
}

// Runs the model on both photos, averages the class probabilities and ranks the classes
export async function analysePair(session, config, front, back) {
  const frontOut = await predict(session, config, front.tensorData)
  const backOut = await predict(session, config, back.tensorData)

  const frontProbs = softmax(frontOut.logits)
  const backProbs = softmax(backOut.logits)
  const averaged = averageProbs([frontProbs, backProbs])

  const ranking = topK(averaged, config.labels, averaged.length).map((item) => ({
    ...item,
    front: frontProbs[item.index],
    back: backProbs[item.index],
  }))

  return {
    ranking,
    front: { cams: frontOut.cams, camDims: frontOut.camDims },
    back: { cams: backOut.cams, camDims: backOut.camDims },
  }
}