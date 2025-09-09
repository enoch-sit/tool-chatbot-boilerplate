import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  const proxyTarget = env.VITE_FLOWISE_PROXY_API_URL || 'http://localhost:8000'
  
  console.log(`🔧 Vite Config - Mode: ${mode}`)
  console.log(`🔧 Proxy Target: ${proxyTarget}`)
  
  // Base configuration
  const baseConfig = {
    plugins: [
      react(),
      visualizer({ 
        open: false, // Disable auto-opening to avoid PowerShell issues in Docker
        gzipSize: true, 
        brotliSize: true,
        filename: 'stats.html'
      }),
    ],
    // Define environment variables that will be available in the app
    define: {
      // Make the API URL available to the app at build time
      __API_BASE_URL__: JSON.stringify(proxyTarget),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
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
  };

  // Add proxy configuration only for development
  if (mode === 'development') {
    console.log(`📡 Setting up proxy for development mode: /api → ${proxyTarget}`);
    return {
      ...baseConfig,
      server: {
        proxy: {
          // Proxy API requests to backend using env variable
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
            ws: true, // Enable WebSocket proxying
          }
        }
      }
    };
  } else {
    console.log(`🏗️  Production mode: API calls will go directly to ${proxyTarget}`);
    console.log(`💡 Make sure your production server serves the API at the same domain or configure CORS properly`);
    return baseConfig;
  }
})
