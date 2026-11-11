import { useEffect, useMemo, useState } from 'react'
import Heatmap from './components/Heatmap.jsx'
import ImagePicker from './components/ImagePicker.jsx'
import Predictions from './components/Predictions.jsx'
import StatusBadge from './components/StatusBadge.jsx'
import { extractCam, softmax, topK } from './lib/cam.js'
import { canvasToTensorData, drawModelView } from './lib/imageUtils.js'
import { loadModel, predict } from './lib/ort.js'
import { isNativeApp } from './lib/platform.js'

const DISPLAY_SIZE = 448
const GITHUB_USER = 'RexJezrilCabilar'
const GITHUB_REPO = 'bananice-mobileNetV2-lakatan-grader'
const APK_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest/download/app.apk`

export default function App() {
  const [model, setModel] = useState(null)
  const [modelState, setModelState] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedClass, setSelectedClass] = useState(0)
  const [showHeat, setShowHeat] = useState(true)
  const [opacity, setOpacity] = useState(0.5)
  const native = isNativeApp()

  useEffect(() => {
    let cancelled = false
    loadModel()
      .then((loaded) => {
        if (cancelled) return
        setModel(loaded)
        setModelState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(`Could not load the model: ${err.message}`)
        setModelState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cam = useMemo(
    () => (result ? extractCam(result.cams, result.camDims, selectedClass) : null),
    [result, selectedClass],
  )

  async function handlePick(file) {
    if (!model) return
    setBusy(true)
    setError('')
    try {
      const { session, config } = model
      const bitmap = await createImageBitmap(file)

      const inferCanvas = document.createElement('canvas')
      const inferCtx = drawModelView(inferCanvas, bitmap, config.input_size, config.resize_mode, config.crop_pct)
      const tensorData = canvasToTensorData(inferCtx, config.input_size, config.mean, config.std)

      const viewCanvas = document.createElement('canvas')
      drawModelView(viewCanvas, bitmap, DISPLAY_SIZE, config.resize_mode, config.crop_pct)
      bitmap.close()

      const { logits, cams, camDims } = await predict(session, config, tensorData)
      const predictions = topK(softmax(logits), config.labels, 3)

      setResult({ predictions, cams, camDims, viewCanvas })
      setSelectedClass(predictions[0].index)
    } catch (err) {
      setError(`Could not analyse this image: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Bananice: Lakatan Quality Classifier</h1>
          <p className="text-sm text-slate-400">
            Pick a photo. The model runs on your device and highlights the regions that drove its answer.
          </p>
          <StatusBadge modelState={modelState} />
        </header>

        <ImagePicker disabled={modelState !== 'ready' || busy} onPick={handlePick} />

        {busy && <p className="text-sm text-sky-300">Analysing…</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {result && cam && (
          <section className="space-y-4">
            <Heatmap viewCanvas={result.viewCanvas} cam={cam} size={DISPLAY_SIZE} opacity={opacity} showHeat={showHeat} />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
                Show heatmap
              </label>
              <label className="flex items-center gap-2">
                Opacity
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                />
              </label>
            </div>
            <Predictions items={result.predictions} selectedIndex={selectedClass} onSelect={setSelectedClass} />
            <p className="text-xs text-slate-500">
              Tap a result to see its heatmap. Model version: {model?.config?.model_version}
            </p>
          </section>
        )}

        {!native && (
          <footer className="border-t border-slate-800 pt-4 text-sm text-slate-400">
            <p>
              Android user?{' '}
              <a className="text-sky-400 underline" href={APK_URL}>
                Download the app (APK)
              </a>
              . Open the file after downloading and allow installs from your browser when Android asks.
            </p>
          </footer>
        )}
      </main>
    </div>
  )
}