import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/psx-converter/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'PSX Texture Converter',
        short_name: 'PSX Converter',
        description:
          'Convert any image into PSX-style pixel art textures — dithering, palette quantization, CRT effects. 100% client-side, no uploads.',
        theme_color: '#1a1525',
        background_color: '#0f0a18',
        display: 'standalone',
        start_url: process.env.GITHUB_ACTIONS ? '/psx-converter/' : '/',
        scope: process.env.GITHUB_ACTIONS ? '/psx-converter/' : '/',
        lang: 'en',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'maskable-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cap precache to keep SW lean. Examples are loaded on demand.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['examples/**', '**/*.png', '**/*.jpg'],
        navigateFallback: process.env.GITHUB_ACTIONS ? '/psx-converter/index.html' : '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
