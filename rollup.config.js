import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import sourcemaps from 'rollup-plugin-sourcemaps';

var MINIFY = process.env.MINIFY;

var pkg = require('./package.json');
var banner = `/**
 * ${pkg.description}
 * @version v${pkg.version}
 * @link ${pkg.homepage}
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */`;

var uglifyOpts = { output: {} };
// retain multiline comment with @license
uglifyOpts.output.comments = (node, comment) => comment.type === 'comment2' && /@license/i.test(comment.value);

var plugins = [nodeResolve({ jsnext: true }), sourcemaps()];

if (MINIFY) plugins.push(uglify(uglifyOpts));

var extension = MINIFY ? '.min.js' : '.js';

const CONFIG = {
  input: 'lib-esm/stickyStates.js',
  output: {
    name: pkg.name,
    file: '_bundles/ui-router-sticky-states' + extension,
    globals: { '@uirouter/core': '@uirouter/core' },
    sourcemap: true,
    format: 'umd',
    banner: banner,
    exports: 'named',
  },
  external: '@uirouter/core',
  plugins: plugins,
};

export default CONFIG;
