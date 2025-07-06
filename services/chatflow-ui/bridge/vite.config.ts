import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({ 
      open: false, // Disable auto-opening to avoid PowerShell issues in Docker
      gzipSize: true, 
      brotliSize: true,
      filename: 'stats.html'
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@mui')) {
              return 'vendor_mui';
            }
            return 'vendor'; // all other package goes here
          }
        },
      },
    },
  },
})
