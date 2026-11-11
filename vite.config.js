import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const REPO_NAME = 'bananice-mobileNetV2-lakatan-grader'

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app' // "npm run build:app" (Android APK build)
  const base = mode === 'production' ? `/${REPO_NAME}/` : '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: isApp,
        registerType: 'autoUpdate',
        injectRegister: 'script',
        manifest: {
          name: 'GradCAM Classifier',
          short_name: 'GradCAM',
          description: 'Offline image classifier that shows Grad-CAM heatmaps',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,json,onnx,wasm}'],
          maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }
})