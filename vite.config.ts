import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    cors: true,
    // 允许所有主机访问（用于内网穿透）
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', 'localhost', '.sealosbja.site'],
    hmr: {
      host: 'localhost',
      port: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          formily: ['@formily/core', '@formily/react', '@formily/json-schema'],
          chart: ['recharts'],
          workflow: ['bpmn-js'],
          state: ['xstate', '@xstate/react'],
          query: ['@tanstack/react-query']
        }
      }
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 启用缓存
    cacheDir: './node_modules/.vite_cache',
    // 生成源映射
    sourcemap: false,
    // 优化静态资源
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    // 启用CSS代码分割
    cssCodeSplit: true
  }
})