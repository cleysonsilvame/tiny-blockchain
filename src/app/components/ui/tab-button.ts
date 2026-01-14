import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tab-button',
  standalone: true,
  template: `
    <button
      (click)="tabSelected.emit()"
      [attr.data-active]="isActive"
      class="
        px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors
        data-[active=true]:bg-blue-600 data-[active=true]:text-white
        data-[active=true]:border-blue-500
        data-[active=false]:bg-slate-800 data-[active=false]:text-gray-400
        data-[active=false]:border-transparent
      "
    >
      {{ label }}
    </button>
  `,
})
export class TabButton {
  @Input() label!: string;
  @Input() isActive = false;
  @Output() tabSelected = new EventEmitter<void>();
}
