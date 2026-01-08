import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Quan trọng: Nâng target lên es2020 để hỗ trợ import.meta.env không bị lỗi warning
    target: 'es2020', 
    outDir: 'dist',
  },
  server: {
    port: 5173,
    open: true, // Tự động mở trình duyệt khi chạy npm run dev
  }
})
