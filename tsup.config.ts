import { defineConfig } from 'tsup'
import { version } from './package.json'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  minify: true,
  clean: true,
  external: ['vue'],
  define: {
    __VERSION__: JSON.stringify(version),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  },
  banner: {
    js: `/**
 * vue-flow-vis v${version}
 * (c) ${new Date().getFullYear()} Milorad Filipović
 * @license MIT
 */`
  },
  onSuccess: 'npm run size'
})
