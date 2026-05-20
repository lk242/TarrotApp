import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiProvider = env.VITE_AI_PROVIDER || 'functions'

  if (command === 'build' && aiProvider !== 'functions' && env.ALLOW_BROWSER_AI_BUILD !== 'true') {
    throw new Error(
      '正式 build 必須使用 VITE_AI_PROVIDER=functions，避免 API key 進入前端且繞過扣點。',
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
