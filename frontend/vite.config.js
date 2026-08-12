import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/chat": "http://127.0.0.1:8000",
      "/chat-text": "http://127.0.0.1:8000",
      "/audio": "http://127.0.0.1:8000",
      "/reset": "http://127.0.0.1:8000",
      "/history": "http://127.0.0.1:8000",
    },
  },
});