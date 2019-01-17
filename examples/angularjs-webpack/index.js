import angular from 'angular';
import UIROUTER from '@uirouter/angularjs';
import { StickyStatesPlugin } from '@uirouter/sticky-states';
import { Visualizer } from '@uirouter/visualizer';

// Create the module where our functionality can attach to
export const APP_MODULE = angular.module('app', ['ui.router']);

APP_MODULE.config([
  '$uiRouterProvider',
  function($uiRouterProvider) {
    $uiRouterProvider.plugin(StickyStatesPlugin);
    $uiRouterProvider.plugin(Visualizer);

    // Add states
    const stateRegistry = $uiRouterProvider.stateRegistry;

    stateRegistry.register({
      name: 'home',
      url: '/home',
      sticky: true,
      views: {
        home: 'generic',
      },
    });

    stateRegistry.register({
      name: 'about',
      url: '/about',
      sticky: true,
      views: {
        about: 'generic',
      },
    });

    // Set initial state
    const urlService = $uiRouterProvider.urlService;
    urlService.rules.initial({ state: 'home' });
  },
]);

// Generic component
APP_MODULE.component('generic', {
  template: `
    <h1>{{ $ctrl.$state$.name }} state loaded</h1>
    <textarea ng-model="$ctrl.text"></textarea>
  `,
  controller: [
    function() {
      this.text = 'Text entered here is not lost';
    },
  ],
  bindings: { $state$: '<' },
});

APP_MODULE.run([
  '$state',
  '$rootScope',
  function($state, $rootScope) {
    $rootScope.$state = $state;
  },
]);
