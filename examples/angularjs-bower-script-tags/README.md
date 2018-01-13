# bower + script tags

Example showing sticky states installed via hybrid npm and bower packages.
Scripts are added using script tags in index.html.

## Running

```
npm install
npm start
```

## Info

This example uses `angular` and `angular-ui-router` from bower.
Because sticky states and visualizer are not published to bower, they are added to the `package.json` instead.

Sticky states requires a reference to ui-router core.
We're using the monolithic `angular-ui-router.js` bundle (which also bundles ui-router core).
To expose ui-router core, we add a shim via a script tag:

```
    <script src="bower_components/angular/angular.js"></script>
    <script src="bower_components/angular-ui-router/release/angular-ui-router.js"></script>
    <script>
      // Shim @uirouter/core from the angular-ui-router.js mega-bundle
      window['@uirouter/core'] = window['@uirouter/angularjs'];
    </script>
    <script src="node_modules/@uirouter/sticky-states/_bundles/ui-router-sticky-states.js"></script>
    <script src="node_modules/@uirouter/visualizer/_bundles/ui-router-visualizer.js"></script>
    <script src="index.js"></script>
```
