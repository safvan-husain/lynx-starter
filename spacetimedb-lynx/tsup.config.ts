// tsup.config.ts
import { defineConfig, type Options } from 'tsup';

function commonEsbuildTweaks(): NonNullable<Options['esbuildOptions']> {
  return options => {
    // Prefer "exports"."development" when deps provide it; harmless otherwise.
    options.conditions = ['development', 'import', 'default'];
    options.mainFields = ['browser', 'module', 'main'];
  };
}

const outExtension = (ctx: { format: string }) => ({
  js: ctx.format === 'cjs' ? '.cjs' : ctx.format === 'esm' ? '.mjs' : '.js',
});

export default defineConfig([
  // Root wrapper (SSR-friendly): dist/index.{mjs,cjs}
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    target: 'es2022',
    outDir: 'dist',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'neutral',
    treeshake: 'smallest',
    external: ['undici'],
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

  // Browser-flavored root wrapper: dist/index.browser.mjs
  {
    entry: { 'index.browser': 'src/index.ts' },
    format: ['esm'],
    target: 'es2022',
    outDir: 'dist',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'browser',
    treeshake: 'smallest',
    external: ['undici'],
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

  // React subpath (SSR-friendly): dist/react/index.{mjs,cjs}
  {
    entry: { index: 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    target: 'es2022',
    outDir: 'dist/react',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'neutral',
    treeshake: 'smallest',
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

  // React subpath (browser ESM): dist/browser/react/index.mjs
  {
    entry: { index: 'src/react/index.ts' },
    format: ['esm'],
    target: 'es2022',
    outDir: 'dist/browser/react',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'browser',
    treeshake: 'smallest',
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

  // SDK subpath (SSR-friendly): dist/sdk/index.{mjs,cjs}
  {
    entry: { index: 'src/sdk/index.ts' },
    format: ['esm', 'cjs'],
    target: 'es2022',
    outDir: 'dist/sdk',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'neutral',
    treeshake: 'smallest',
    external: ['undici'],
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

  // SDK browser ESM: dist/sdk/index.browser.mjs
  {
    entry: { 'index.browser': 'src/sdk/index.ts' },
    format: ['esm'],
    target: 'es2022',
    outDir: 'dist/sdk',
    dts: false,
    sourcemap: true,
    clean: true,
    platform: 'browser',
    treeshake: 'smallest',
    external: ['undici'],
    outExtension,
    esbuildOptions: commonEsbuildTweaks(),
  },

]) satisfies
  | Options
  | Options[]
  | ((
      overrideOptions: Options
    ) => Options | Options[] | Promise<Options | Options[]>);
