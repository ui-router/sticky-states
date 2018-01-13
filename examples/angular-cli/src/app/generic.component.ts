import { Input, Component } from '@angular/core';

@Component({
  selector: 'generic-cmp',
  template: `
    <h1>{{ $state$.name }} state loaded</h1>
    <textarea [(ngModel)]="text"></textarea>
  `,
})
export class GenericComponent {
    @Input() $state$;
    text = "Text entered here is not lost";
}
