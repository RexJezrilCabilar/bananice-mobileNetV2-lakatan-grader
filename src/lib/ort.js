import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'

// Serve the WebAssembly runtime from our own build so it also works offline
ort.env.wasm.wasmPaths = { wasm: wasmUrl }
// GitHub Pages cannot send the headers that multi-threading needs
ort.env.wasm.numThreads = 1

const BASE = import.meta.env.BASE_URL

async function fetchOrThrow(path) {
  const response = await fetch(`${BASE}${path}`)
  if (!response.ok) {
    throw new Error(`${path} could not be loaded (HTTP ${response.status})`)
  }
  return response
}

async function loadModelOnce() {
  const config = await (await fetchOrThrow('model/model_config.json')).json()
  const bytes = new Uint8Array(await (await fetchOrThrow('model/model.onnx')).arrayBuffer())
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  return { session, config }
}

let modelPromise = null

export function loadModel() {
  if (!modelPromise) {
    modelPromise = loadModelOnce().catch((error) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

export async function predict(session, config, inputData) {
  const size = config.input_size
  const input = new ort.Tensor('float32', inputData, [1, 3, size, size])
  const outputs = await session.run({ [session.inputNames[0]]: input })
  const logitsTensor = outputs[config.logits_name] ?? outputs[session.outputNames[0]]
  const camsTensor = outputs[config.cams_name] ?? outputs[session.outputNames[1]]
  if (!logitsTensor || !camsTensor) {
    throw new Error('The model did not return both "logits" and "cams"')
  }
  return {
    logits: Float32Array.from(logitsTensor.data),
    cams: Float32Array.from(camsTensor.data),
    camDims: Array.from(camsTensor.dims),
  }
}