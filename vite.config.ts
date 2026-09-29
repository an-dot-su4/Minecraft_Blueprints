import { defineConfig } from 'vite';

export default defineConfig({
  // three.js を含むため 1 ファイルが大きくなるが、今の規模では分けずにおく
  build: { chunkSizeWarningLimit: 900 },
  server: {
    // `npm run dev` のときは wrangler pages dev（ポート 8788）の API を使う
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
});
