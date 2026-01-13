import { Component, computed, HostListener, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SplitDirection = 'horizontal' | 'vertical';

@Component({
  selector: 'app-resizable-split',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resizable-split.html',
  styleUrl: './resizable-split.css',
})
export class ResizableSplit implements OnInit {
  // Configuration
  direction = input<SplitDirection>('horizontal');
  initialRatio = input<number>(50);
  minRatio = input<number>(0);
  maxRatio = input<number>(100);

  // State
  size = signal(this.initialRatio());
  isResizing = signal(false);
  resizeStartPos = signal(0);
  resizeStartSize = signal(0);
  resizeContainerSize = signal(0);

  // Computed styles
  resizerClasses = computed(() => {
    const dir = this.direction();
    return {
      'h-full w-1 cursor-col-resize': dir === 'horizontal',
      'h-1 w-full cursor-row-resize': dir === 'vertical',
      'bg-slate-700 hover:bg-slate-600 transition-colors shrink-0': true,
      'bg-blue-500': this.isResizing(),
      'cursor-grabbing': this.isResizing(),
    };
  });

  panelStyle = computed(() => {
    const dir = this.direction();
    const size = this.size();

    if (dir === 'horizontal') {
      return { flexBasis: `${size}%` };
    } else {
      return { flexBasis: `${size}%` };
    }
  });

  secondPanelStyle = computed(() => {
    const size = this.size();
    return { flexBasis: `${100 - size}%` };
  });

  ngOnInit(): void {
    this.size.set(this.initialRatio());

    console.log(this)
  }

  onResizerMouseDown(event: MouseEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }
    const dir = this.direction();
    const target = event.target as HTMLElement;

    this.isResizing.set(true);
    this.resizeStartPos.set(dir === 'horizontal' ? event.clientX : event.clientY);
    this.resizeStartSize.set(this.size());

    const container = target.parentElement;
    if (container) {
      this.resizeContainerSize.set(dir === 'horizontal' ? container.clientWidth : container.clientHeight);
    }
  }

  onResizerTouchStart(event: TouchEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }
    const dir = this.direction();
    const target = event.target as HTMLElement;
    const touch = event.touches[0];

    if (!touch) return;

    this.isResizing.set(true);
    this.resizeStartPos.set(dir === 'horizontal' ? touch.clientX : touch.clientY);
    this.resizeStartSize.set(this.size());

    const container = target.parentElement;
    if (container) {
      this.resizeContainerSize.set(dir === 'horizontal' ? container.clientWidth : container.clientHeight);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMove(event: MouseEvent | TouchEvent) {
    if (!this.isResizing()) return;

    const dir = this.direction();
    const pos =
      event instanceof MouseEvent
        ? dir === 'horizontal'
          ? event.clientX
          : event.clientY
        : dir === 'horizontal'
          ? event.touches[0]?.clientX
          : event.touches[0]?.clientY || 0;

    const delta = pos - this.resizeStartPos();
    const containerSize = this.resizeContainerSize();

    if (containerSize > 0) {
      const deltaPercentage = (delta / containerSize) * 100;
      const newPercentage = Math.max(
        this.minRatio(),
        Math.min(this.maxRatio(), this.resizeStartSize() + deltaPercentage),
      );
      this.size.set(newPercentage);
    }
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onEnd() {
    this.isResizing.set(false);
  }
}
