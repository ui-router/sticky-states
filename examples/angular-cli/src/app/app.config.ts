import { ApplicationConfig } from '@angular/core';
import { UIRouter } from '@uirouter/core';
import { provideUIRouter, Ng2StateDeclaration } from '@uirouter/angular';
import { StickyStatesPlugin } from '@uirouter/sticky-states';
import { Visualizer } from '@uirouter/visualizer';

import { GenericComponent } from './generic.component';

export const states: Ng2StateDeclaration[] = [
  {
    name: 'home',
    url: '/home',
    sticky: true,
    views: {
      home: { component: GenericComponent },
    },
  },
  {
    name: 'about',
    url: '/about',
    sticky: true,
    views: {
      about: { component: GenericComponent },
    },
  },
];

export function configFn(router: UIRouter) {
  router.urlService.rules.initial({ state: 'home' });
  router.plugin(StickyStatesPlugin);
  router.plugin(Visualizer);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideUIRouter({
      states: states,
      config: configFn,
    }),
  ],
};
