import { defineConfig } from 'tsdown';

// Builds the browser half only. The host half (src/index.js) is plain ESM and
// is loaded by the Host loader straight from source - no bundling needed.
//
// The banner/footer turn the IIFE into a module-table entry: the factory's
// return value IS the plugin object ({ name, inject, apply }), which is what
// window.__ModuleLoader__.load() expects.
// Stamped into every build. The client probe reloads the page once when this
// changes, so iterating never needs a manual restart or a hand-bumped constant.
const BUILD_ID = String(Date.now());

export default defineConfig({
  entry: { client: 'src/client/index.js' },
  format: ['iife'],
  platform: 'browser',
  target: 'es2020',
  deps: { neverBundle: ['react', 'react/jsx-runtime'] },
  clean: true,
  suppressWarnings: [/MISSING_NAME_OPTION_FOR_IIFE_EXPORT/],
  dts: false,
  sourcemap: false,
  splitting: false,
  minify: false,
  outDir: 'lib',
  outExtensions() {
    return { js: '.js' };
  },
  // tsdown 0.23 renamed rollupOptions -> outputOptions; the loader serves
  // lib/client.js, so the emitted name is pinned here.
  outputOptions: {
    entryFileNames: 'client.js',
  },
  banner: {
    js: `window.__DSH_FAIRY_BUILD__ = '${BUILD_ID}';\nwindow.__ModuleLoader__.load({\n  id: 'dsh-fairy-visual',\n  factory: (require) => {\n    const module = { exports: {} };\n    return void 0, `,
  },
  footer: {
    js: `  },\n});`,
  },
});
