import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to ' ' to load all ENV variables from the .env file
  // regardless of the VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    define: {
      // Expose environment variables to the client
      // Vite automatically exposes VITE_ prefixed variables, but we ensure they're defined
      'import.meta.env.VITE_TESTING_MODE': JSON.stringify(env.VITE_TESTING_MODE || 'false'),
      'import.meta.env.VITE_ENABLE_FALLBACK': JSON.stringify(env.VITE_ENABLE_FALLBACK || 'true'),
      'import.meta.env.VITE_MAX_RETRIES': JSON.stringify(env.VITE_MAX_RETRIES || '3'),
      'import.meta.env.VITE_REQUEST_TIMEOUT': JSON.stringify(env.VITE_REQUEST_TIMEOUT || '30000'),
      'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(env.VITE_LOG_LEVEL || 'info'),
      'import.meta.env.VITE_LOG_PROVIDER_USAGE': JSON.stringify(env.VITE_LOG_PROVIDER_USAGE || 'true'),
    },
    server: {
      // Ensure environment variables are available during development
      watch: {
        usePolling: true,
      },
    },
  }
})
