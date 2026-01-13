import { Component, OnInit, input, signal } from '@angular/core';
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

  splitPercent = signal(this.initialRatio());
  isDragging = signal(false);
  dragStartAxisPx = signal(0);
  dragStartPercent = signal(0);
  containerAxisPx = signal(0);
  activePointerId: number | null = null;

  ngOnInit(): void {
    this.splitPercent.set(this.initialRatio());
  }

  // PointerEvent-based handlers
  onGutterPointerDown(event: PointerEvent) {
    if (event.cancelable) event.preventDefault();
    if (!event.isPrimary) return;

    const resizerEl = event.currentTarget as HTMLElement | null;
    const container = (event.target as HTMLElement | null)?.parentElement ?? null;

    this.isDragging.set(true);
    this.activePointerId = event.pointerId;
    this.dragStartAxisPx.set(this.getAxisPointerPosition(event));
    this.dragStartPercent.set(this.splitPercent());

    if (container) {
      this.containerAxisPx.set(this.getContainerAxisSize(container));
    }

    if (resizerEl && this.activePointerId !== null) {
      resizerEl.setPointerCapture(this.activePointerId);
    }
  }

  onGutterPointerMove(event: PointerEvent) {
    // Only process moves for the active pointer during a drag capture
    if (this.activePointerId === null || event.pointerId !== this.activePointerId) return;

    const currentPx = this.getAxisPointerPosition(event);
    const next = this.computeNextPercent(currentPx);
    if (next !== null) {
      this.splitPercent.set(next);
    }
  }

  onGutterPointerUp(event: PointerEvent) {
    if (this.activePointerId !== null && event.pointerId === this.activePointerId) {
      const resizerEl = event.currentTarget as HTMLElement | null;
      if (resizerEl) {
        resizerEl.releasePointerCapture(this.activePointerId);
      }
      this.activePointerId = null;
    }
    this.isDragging.set(false);
  }

  // Helpers
  private getAxisPointerPosition(event: PointerEvent): number {
    return this.direction() === 'horizontal' ? event.clientX : event.clientY;
  }

  private getContainerAxisSize(el: HTMLElement): number {
    return this.direction() === 'horizontal' ? el.clientWidth : el.clientHeight;
  }

  private computeNextPercent(currentPx: number): number | null {
    const containerPx = this.containerAxisPx();
    if (containerPx <= 0) return null;
    const pointerOffsetPx = currentPx - this.dragStartAxisPx();
    const offsetPercent = (pointerOffsetPx / containerPx) * 100;
    const nextPercent = this.dragStartPercent() + offsetPercent;
    return Math.max(this.minRatio(), Math.min(this.maxRatio(), nextPercent));
  }
}
