import { Component } from '@angular/core';
import { StateService } from '@uirouter/core';

@Component({
  selector: 'app-root',
  template: `
    <a uiSref="home" uiSrefActive="active">home</a>
    <a uiSref="about" uiSrefActive="active">about</a>

    <ui-view name="home" [hidden]="!isActive('home')"></ui-view>
    <ui-view name="about" [hidden]="!isActive('about')"></ui-view>
  `,
  styles: [`
    .active { font-weight: bold }
  `]
})
export class AppComponent {
  constructor(public $state: StateService) {

  }
  isActive(stateName: string) {
    return this.$state.includes(stateName)
  }
}
