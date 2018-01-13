import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { UIRouterModule } from '@uirouter/angular';
import { UIRouter } from '@uirouter/core';
import { StickyStatesPlugin } from '@uirouter/sticky-states';
import { Visualizer } from '@uirouter/visualizer';

import { AppComponent } from './app.component';
import { GenericComponent } from './generic.component';

export const states = [
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
  }
];

export function configFn(router: UIRouter) {
  router.urlService.rules.initial({ state: 'home' });
  router.plugin(StickyStatesPlugin);
  router.plugin(Visualizer);
}

@NgModule({
  declarations: [
    AppComponent, GenericComponent, 
  ],
  imports: [
    BrowserModule,
    FormsModule,
    UIRouterModule.forRoot({
      states: states,
      config: configFn,
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
