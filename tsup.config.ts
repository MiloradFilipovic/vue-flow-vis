import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['vue'],
  banner: {
    js: '/* vue-flow-vis - (c) 2025 Milorad Filipović - MIT License */'
  }
})
