import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cấu hình Build để hỗ trợ các trình duyệt hiện đại và import.meta.env
  build: {
    target: 'es2020', 
    outDir: 'dist',
  },
  // Cấu hình tối ưu hóa dependency để tránh lỗi khi dev
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    port: 5173,
    open: true, // Tự động mở trình duyệt khi chạy npm run dev
  }
})
