// require all source files ending in "Spec" from the
// current directory and all subdirectories

require('core-js');
require('ui-router-core');
require('../src/stickyStates');

var testsContext = require.context(".", true, /Spec$/);
testsContext.keys().forEach(testsContext);
