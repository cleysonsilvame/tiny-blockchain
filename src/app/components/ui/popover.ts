import { Component, Directive, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Directive({
  selector: '[appPopoverTrigger]',
  standalone: true
})
export class PopoverTrigger {}

@Directive({
  selector: '[appPopoverContent]',
  standalone: true
})
export class PopoverContent {}

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block" (click)="$event.stopPropagation()">
      <div (click)="toggle()">
        <ng-content select="[appPopoverTrigger]"></ng-content>
      </div>
      @if (isOpen()) {
        <ng-content select="[appPopoverContent]"></ng-content>
      }
    </div>
  `
})
export class Popover {
  isOpen = signal(false);

  toggle() {
    this.isOpen.update(v => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  open() {
    this.isOpen.set(true);
  }
}
