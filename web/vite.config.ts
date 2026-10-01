import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Em desenvolvimento a API roda em outro processo (npm run dev:server); o Vite repassa /api para ela.
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:3000'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `vite build --mode demo`: versão estática só no navegador (sem API, banco nem service worker), para hospedar em qualquer página.
  const demo = mode === 'demo'
  return {
    base: demo ? './' : '/',
    build: demo ? { outDir: 'dist-demo' } : {},
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: demo,
        // "prompt": a versão nova espera o usuário tocar em "Atualizar" (não recarrega no meio de um formulário).
        registerType: 'prompt',
        injectRegister: false, // o registro é feito pelo componente <PwaManager />
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Ritmo — Hábitos, Metas e Rotinas',
          short_name: 'Ritmo',
          description: 'Organize seus hábitos, metas e rotinas em um só lugar, no celular ou no computador.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#0d0818',
          background_color: '#07040f',
          categories: ['productivity', 'lifestyle', 'health'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Novo hábito', short_name: 'Hábito', url: '/habitos?novo=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
            { name: 'Nova meta', short_name: 'Meta', url: '/metas?novo=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
            { name: 'Nova rotina', short_name: 'Rotina', url: '/rotinas?novo=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          ],
        },
        workbox: {
          // Navegações caem no index.html (SPA), exceto chamadas da API: o offline dos DADOS é do app (cache local + fila).
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // Pré-cache do app inteiro; das fontes, só os subconjuntos latinos (o resto é cirílico/vietnamita).
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'assets/*latin*.woff2'],
          // Ícones grandes só são baixados na hora de instalar; não precisam ocupar o pré-cache.
          globIgnores: ['icons/icon-512.png', 'icons/maskable-512.png'],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    define: { __APP_VERSION__: JSON.stringify(version) },
    server: {
      host: true, // permite abrir pelo celular na mesma rede durante o desenvolvimento
      port: 5173,
      proxy: { '/api': { target: apiTarget } },
    },
    preview: {
      port: 4173,
      proxy: { '/api': { target: apiTarget } },
    },
  }
})
