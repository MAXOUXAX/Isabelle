import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  minify: true,
  sourcemap: true,
  format: 'esm',
  outExtensions: () => ({ js: '.mjs' }),
  tsconfig: 'tsconfig.json',
  copy: 'public',
  clean: true,
  dts: false,
  target: false,
  deps: {
    skipNodeModulesBundle: true,
  },
});
