import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StateObject } from '@uirouter/core';

@Component({
  selector: 'generic-cmp',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>{{ $state$.name }} state loaded</h1>
    <textarea [(ngModel)]="text"></textarea>
  `,
})
export class GenericComponent {
  @Input() $state$!: StateObject;
  text = 'Text entered here is not lost';
}
