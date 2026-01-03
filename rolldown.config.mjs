import { defineConfig } from 'rolldown';
import pkg from './package.json' with { type: 'json' };

const banner = `/**
 * ${pkg.description}
 * @version v${pkg.version}
 * @link ${pkg.homepage}
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */`;

export default defineConfig({
  input: 'lib-esm/stickyStates.js',
  output: {
    name: pkg.name,
    file: '_bundles/ui-router-sticky-states.js',
    format: 'umd',
    banner: banner,
    exports: 'named',
    sourcemap: true,
    globals: {
      '@uirouter/core': '@uirouter/core',
    },
  },
  external: ['@uirouter/core'],
});

