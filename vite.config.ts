import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages ではリポジトリ名の下に公開される（例: /Minecraft_Blueprints/）。Actions から BASE_PATH で渡す
  base: process.env.BASE_PATH ?? '/',
  // three.js を含むため 1 ファイルが大きくなるが、今の規模では分けずにおく
  build: { chunkSizeWarningLimit: 900 },
});
