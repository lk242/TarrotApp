import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiProvider = env.VITE_AI_PROVIDER || 'functions'

  if (command === 'build' && aiProvider !== 'functions' && env.ALLOW_BROWSER_AI_BUILD !== 'true') {
    throw new Error(
      '正式 build 必須使用 VITE_AI_PROVIDER=functions，避免 API key 進入前端且繞過扣點。',
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // 預快取 build 產出的 JS/CSS
          globPatterns: ['**/*.{js,css,html,ico,svg}'],
          // 執行期快取：牌面圖片與主題素材
          runtimeCaching: [
            {
              // 主題素材（經常更新，背景刷新）
              urlPattern: /\/images\/theme\/.*\.(webp|png|jpg|jpeg)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'theme-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
                },
              },
            },
            {
              // 78 張塔羅牌圖（幾乎不變，長期快取）
              urlPattern: /\/images\/(?!theme\/).*\.(webp|png|jpg|jpeg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tarot-card-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
                },
              },
            },
            {
              // Google Fonts（如有使用）
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
          ],
        },
        manifest: false, // 使用 public/manifest.json
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/firebase/app') || id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
              return 'firebase-core'
            }
            if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/firebase/functions') || id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/@firebase/functions')) {
              return 'firebase-data'
            }
            if (id.includes('node_modules/framer-motion')) {
              return 'framer'
            }
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'react-vendor'
            }
          },
        },
      },
    },
  }
})
