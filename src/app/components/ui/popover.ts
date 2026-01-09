import { Component, Directive, signal } from '@angular/core';

@Directive({
  selector: '[appPopoverTrigger]',
  standalone: true,
})
export class PopoverTrigger {}

@Directive({
  selector: '[appPopoverContent]',
  standalone: true,
})
export class PopoverContent {}

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [],
  template: `
    <div
      class="relative inline-block"
      tabindex="-1"
      role="presentation"
      (click)="$event.stopPropagation()"
      (keydown.enter)="$event.stopPropagation()"
      (keydown.space)="$event.stopPropagation()"
    >
      <button
        type="button"
        class="contents"
        (click)="toggle()"
        (keydown.enter)="toggle()"
        (keydown.space)="toggle()"
      >
        <ng-content select="[appPopoverTrigger]"></ng-content>
      </button>
      @if (isOpen()) {
        <ng-content select="[appPopoverContent]"></ng-content>
      }
    </div>
  `,
})
export class Popover {
  isOpen = signal(false);

  toggle() {
    this.isOpen.update((v) => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  open() {
    this.isOpen.set(true);
  }
}
