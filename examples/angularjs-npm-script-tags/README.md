# npm + script tags

Example showing sticky states installed via npm packages.
Scripts are added using script tags in index.html.

## Running

```
npm install
npm start
```

## Info

This example has separate script tags for `ui-router-core.js` from the `@uirouter/core` package and `ui-router-angularjs.js` from `@uirouter/angularjs` package.

```
    <script src="node_modules/angular/angular.js"></script>
    <script src="node_modules/@uirouter/core/_bundles/ui-router-core.js"></script>
    <script src="node_modules/@uirouter/angularjs/release/ui-router-angularjs.js"></script>
    <script src="node_modules/@uirouter/sticky-states/_bundles/ui-router-sticky-states.js"></script>
    <script src="node_modules/@uirouter/visualizer/_bundles/ui-router-visualizer.js"></script>
    <script src="index.js"></script>
```
