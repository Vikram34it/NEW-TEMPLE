import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rolldownOptions: {
      input: [
        fileURLToPath(new URL('./index.html', import.meta.url)),
        fileURLToPath(new URL('./collector/index.html', import.meta.url)),
      ],
    },
  },
})
