import { useEffect, useMemo, useState } from 'react'
import Heatmap from './components/Heatmap.jsx'
import PhotoSlot from './components/PhotoSlot.jsx'
import Predictions from './components/Predictions.jsx'
import StatusBadge from './components/StatusBadge.jsx'
import { analysePair, DISPLAY_SIZE, preparePhoto } from './lib/analysis.js'
import { extractCam } from './lib/cam.js'
import { loadModel } from './lib/ort.js'
import { isNativeApp } from './lib/platform.js'
import { clearSample, loadSample, savePhoto } from './lib/sampleStore.js'

const GITHUB_USER = 'RexJezrilCabilar'
const GITHUB_REPO = 'bananice-mobileNetV2-lakatan-grader'
const APK_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest/download/app.apk`

const EMPTY_PHOTOS = { front: null, back: null }
const STEP_TEXT = {
  1: 'Step 1 of 2 · Take or choose the FRONT photo.',
  2: 'Step 2 of 2 · Front photo saved. Now take or choose the BACK photo.',
  3: 'Both photos saved. The averaged result is below. Start a new sample when you are ready.',
}

export default function App() {
  const [model, setModel] = useState(null)
  const [modelState, setModelState] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photos, setPhotos] = useState(EMPTY_PHOTOS)
  const [result, setResult] = useState(null)
  const [selectedClass, setSelectedClass] = useState(0)
  const [showHeat, setShowHeat] = useState(true)
  const [opacity, setOpacity] = useState(0.5)
  const native = isNativeApp()

  useEffect(() => {
    let cancelled = false

    async function start() {
      let loaded
      try {
        loaded = await loadModel()
      } catch (err) {
        if (!cancelled) {
          setError(`Could not load the model: ${err.message}`)
          setModelState('error')
        }
        return
      }
      if (cancelled) return

      // Bring back a sample that was saved earlier (for example after the app restarted)
      let restored = EMPTY_PHOTOS
      let restoredResult = null
      try {
        const saved = await Promise.race([
          loadSample(),
          new Promise((resolve) => setTimeout(() => resolve(EMPTY_PHOTOS), 4000)),
        ])
        if (saved.front) {
          const front = await preparePhoto(saved.front, loaded.config)
          const back = saved.back ? await preparePhoto(saved.back, loaded.config) : null
          restored = { front, back }
          if (back) {
            restoredResult = await analysePair(loaded.session, loaded.config, front, back)
          }
        }
      } catch (err) {
        console.warn('Could not restore the saved photos:', err)
        restored = EMPTY_PHOTOS
        restoredResult = null
      }
      if (cancelled) return

      setModel(loaded)
      setPhotos(restored)
      setResult(restoredResult)
      if (restoredResult) setSelectedClass(restoredResult.ranking[0].index)
      setModelState('ready')
    }

    start()
    return () => {
      cancelled = true
    }
  }, [])

  const camFront = useMemo(
    () => (result ? extractCam(result.front.cams, result.front.camDims, selectedClass) : null),
    [result, selectedClass],
  )
  const camBack = useMemo(
    () => (result ? extractCam(result.back.cams, result.back.camDims, selectedClass) : null),
    [result, selectedClass],
  )

  async function handlePick(slot, file) {
    if (!model || busy) return
    if (slot === 'back' && !photos.front) return
    setBusy(true)
    setError('')
    try {
      const photo = await preparePhoto(file, model.config)

      if (slot === 'front') {
        // A new front photo always starts a new sample
        setPhotos({ front: photo, back: null })
        setResult(null)
        await clearSample()
        await savePhoto('front', file)
        return
      }

      const next = { front: photos.front, back: photo }
      setPhotos(next)
      setResult(null)
      await savePhoto('back', file)
      const output = await analysePair(model.session, model.config, next.front, next.back)
      setResult(output)
      setSelectedClass(output.ranking[0].index)
    } catch (err) {
      setError(`Something went wrong: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (busy) return
    setPhotos(EMPTY_PHOTOS)
    setResult(null)
    setError('')
    await clearSample()
  }

  const ready = modelState === 'ready'
  const step = !photos.front ? 1 : !photos.back ? 2 : 3
  const showResult = Boolean(result && camFront && camBack && photos.front && photos.back)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">GradCAM Classifier</h1>
          <p className="text-sm text-slate-400">
            Take a front photo and a back photo of the sample. The model checks both on your device and averages the
            results.
          </p>
          <StatusBadge modelState={modelState} />
        </header>

        <p className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          {STEP_TEXT[step]}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoSlot
            title="Front photo"
            photo={photos.front}
            disabled={!ready || busy}
            onPick={(file) => handlePick('front', file)}
            onError={setError}
          />
          <PhotoSlot
            title="Back photo"
            photo={photos.back}
            disabled={!ready || busy || !photos.front}
            onPick={(file) => handlePick('back', file)}
            onError={setError}
          />
        </div>

        {(photos.front || photos.back) && (
          <button
            type="button"
            disabled={busy}
            onClick={handleReset}
            className="self-start rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            New sample
          </button>
        )}

        {busy && <p className="text-sm text-sky-300">Working…</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {showResult && (
          <section className="space-y-4">
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-sky-300">Averaged result · front + back</p>
              <p className="text-xl font-bold">
                {result.ranking[0].label} · {(result.ranking[0].prob * 100).toFixed(1)}%
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <figure className="space-y-1">
                <Heatmap
                  viewCanvas={photos.front.viewCanvas}
                  cam={camFront}
                  size={DISPLAY_SIZE}
                  opacity={opacity}
                  showHeat={showHeat}
                />
                <figcaption className="text-xs text-slate-400">Front</figcaption>
              </figure>
              <figure className="space-y-1">
                <Heatmap
                  viewCanvas={photos.back.viewCanvas}
                  cam={camBack}
                  size={DISPLAY_SIZE}
                  opacity={opacity}
                  showHeat={showHeat}
                />
                <figcaption className="text-xs text-slate-400">Back</figcaption>
              </figure>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
                Show heatmaps
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

            <Predictions items={result.ranking} selectedIndex={selectedClass} onSelect={setSelectedClass} />

            <p className="text-xs text-slate-500">
              Each chance is the average of the front and back photo probabilities. Tap a class to see its heatmaps.
              Model version: {model?.config?.model_version}
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
