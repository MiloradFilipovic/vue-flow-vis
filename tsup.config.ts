import { defineConfig } from 'tsup'
import { version, name, author } from './package.json'

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
 * ${name} v${version}
 * (c) ${new Date().getFullYear()} ${author}
 * @license MIT
 */`
  },
  onSuccess: 'npm run size'
})
