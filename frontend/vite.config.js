import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/chat": "http://127.0.0.1:8000",
      "/chat-text": "http://127.0.0.1:8000",
      "/chat-text-stream": "http://127.0.0.1:8000",
      "/analyze-image": "http://127.0.0.1:8000",
      "/analyze-audio": "http://127.0.0.1:8000",
      "/analyze-video": "http://127.0.0.1:8000",
      "/audio": "http://127.0.0.1:8000",
      "/reset": "http://127.0.0.1:8000",
      "/sessions": "http://127.0.0.1:8000",
      "/all-sessions": "http://127.0.0.1:8000",
      "/new-chat": "http://127.0.0.1:8000",
      "/delete-all-history": "http://127.0.0.1:8000",
    },
  },
  build: {
    target: "esnext",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});