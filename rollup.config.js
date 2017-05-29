import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import progress from 'rollup-plugin-progress';
import sourcemaps from 'rollup-plugin-sourcemaps';

var MINIFY = process.env.MINIFY;

var pkg = require('./package.json');
var banner =
`/**
 * ${pkg.description}
 * @version v${pkg.version}
 * @link ${pkg.homepage}
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */`;

var uglifyOpts = { output: {} };
// retain multiline comment with @license
uglifyOpts.output.comments = (node, comment) =>
comment.type === 'comment2' && /@license/i.test(comment.value);

var plugins = [
  nodeResolve({jsnext: true}),
  progress(),
  sourcemaps(),
];

if (MINIFY) plugins.push(uglify(uglifyOpts));

var extension = MINIFY ? ".min.js" : ".js";

const CONFIG = {
  moduleName: pkg.name,
  entry: 'lib-esm/stickyStates.js',
  dest: '_bundles/ui-router-sticky-states' + extension,
  external: '@uirouter/core',
  globals: { '@uirouter/core': '@uirouter/core' },
  

  sourceMap: true,
  format: 'umd',
  exports: 'named',
  plugins: plugins,
  banner: banner,
};

export default CONFIG;
