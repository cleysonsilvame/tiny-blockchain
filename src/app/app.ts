import { Component, computed, signal, HostListener, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MempoolSidebar } from './components/mempool-sidebar/mempool-sidebar';
import { MiningBlock } from './components/mining-block/mining-block';
import { BlockchainDisplay } from './components/blockchain-display/blockchain-display';
import { WalletExplorer } from './components/wallet-explorer/wallet-explorer';
import { StatsDashboard } from './components/stats-dashboard/stats-dashboard';
import { Blockchain } from './services/blockchain';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    MempoolSidebar,
    MiningBlock,
    BlockchainDisplay,
    WalletExplorer,
    StatsDashboard,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  blockchainService = inject(Blockchain);

  mempool = computed(() => this.blockchainService.mempool());
  blockchain = computed(() => this.blockchainService.blockchain());
  currentBlockNumber = computed(() => this.blockchainService.currentBlockNumber());
  previousHash = computed(() => this.blockchainService.previousHash());

  // Responsive layout detection
  viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1280);
  isMobile = computed(() => this.viewportWidth() < 1024); // < lg breakpoint
  isTablet = computed(() => this.viewportWidth() >= 1024 && this.viewportWidth() < 1280); // lg to xl
  isDesktop = computed(() => this.viewportWidth() >= 1280); // >= xl

  // Mobile tab state
  activeMobileTab = signal<'mempool' | 'mining' | 'blockchain' | 'stats' | 'wallet'>('mining');

  // Resize state for right sidebar
  rightPanelWidth = signal(384); // w-96 = 24rem = 384px

  // Resize state for left sidebar (mempool)
  mempoolWidth = signal(384); // w-96 = 24rem = 384px

  // Resize state for mining-block height
  miningBlockHeight = signal(80); // initial percentage (80% of container)

  isResizing = signal(false);
  resizeStartX = signal(0);
  resizeStartY = signal(0);
  resizeStartWidth = signal(0);
  resizeStartHeight = signal(0);
  resizeStartPercentage = signal(0);
  resizeContainerHeight = signal(0);
  activeResizer = signal<'left' | 'right' | 'vertical' | null>(null);

  rightPanelStyle = computed(() => ({
    width: `${this.rightPanelWidth()}px`,
  }));

  mempoolStyle = computed(() => ({
    width: `${this.mempoolWidth()}px`,
  }));

  miningBlockStyle = computed(() => ({
    flexBasis: `${this.miningBlockHeight()}%`,
  }));

  blockchainDisplayStyle = computed(() => ({
    flexBasis: `${100 - this.miningBlockHeight()}%`,
  }));

  constructor() {
    // Track window resize and update viewport width
    if (typeof window !== 'undefined') {
      effect(() => {
        // This effect will re-run whenever the window resize event fires
        this.viewportWidth();
      });
    }
  }

  get difficulty() {
    return this.blockchainService.getDifficulty();
  }

  // Mobile tab navigation
  setActiveMobileTab(tab: 'mempool' | 'mining' | 'blockchain' | 'stats' | 'wallet') {
    this.activeMobileTab.set(tab);
  }

  onResizerMouseDown(event: MouseEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.clientX);
    this.resizeStartWidth.set(this.rightPanelWidth());
    this.activeResizer.set('right');
  }

  onLeftResizerMouseDown(event: MouseEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.clientX);
    this.resizeStartWidth.set(this.mempoolWidth());
    this.activeResizer.set('left');
  }

  onVerticalResizerMouseDown(event: MouseEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    const target = event.target as HTMLElement;
    const container = target.parentElement;
    if (container) {
      this.resizeContainerHeight.set(container.clientHeight);
    }
    this.isResizing.set(true);
    this.resizeStartY.set(event.clientY);
    this.resizeStartPercentage.set(this.miningBlockHeight());
    this.activeResizer.set('vertical');
  }

  onResizerTouchStart(event: TouchEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.touches[0]?.clientX || 0);
    this.resizeStartWidth.set(this.rightPanelWidth());
    this.activeResizer.set('right');
  }

  onLeftResizerTouchStart(event: TouchEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.touches[0]?.clientX || 0);
    this.resizeStartWidth.set(this.mempoolWidth());
    this.activeResizer.set('left');
  }

  onVerticalResizerTouchStart(event: TouchEvent) {
    // Disable resizing on mobile/tablet
    if (this.viewportWidth() < 1280) return;

    event.preventDefault();
    const target = event.target as HTMLElement;
    const container = target.parentElement;
    if (container) {
      this.resizeContainerHeight.set(container.clientHeight);
    }
    this.isResizing.set(true);
    this.resizeStartY.set(event.touches[0]?.clientY || 0);
    this.resizeStartPercentage.set(this.miningBlockHeight());
    this.activeResizer.set('vertical');
  }

  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onWindowResize(_event: Event) {
    if (typeof window !== 'undefined') {
      this.viewportWidth.set(window.innerWidth);
      // Cancel any ongoing resize when window is resized
      if (this.isResizing()) {
        this.isResizing.set(false);
        this.activeResizer.set(null);
      }
    }
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMouseMove(event: MouseEvent | TouchEvent) {
    if (!this.isResizing()) return;

    const resizer = this.activeResizer();
    const clientX =
      event instanceof MouseEvent ? event.clientX : (event as TouchEvent).touches[0]?.clientX || 0;
    const clientY =
      event instanceof MouseEvent ? event.clientY : (event as TouchEvent).touches[0]?.clientY || 0;

    if (resizer === 'right') {
      const delta = clientX - this.resizeStartX();
      const newWidth = Math.max(300, Math.min(600, this.resizeStartWidth() - delta));
      this.rightPanelWidth.set(newWidth);
    } else if (resizer === 'left') {
      const delta = clientX - this.resizeStartX();
      const newWidth = Math.max(250, Math.min(500, this.resizeStartWidth() + delta));
      this.mempoolWidth.set(newWidth);
    } else if (resizer === 'vertical') {
      const deltaY = clientY - this.resizeStartY();
      const containerHeight = this.resizeContainerHeight();
      if (containerHeight > 0) {
        const deltaPercentage = (deltaY / containerHeight) * 100;
        const newPercentage = Math.max(
          20,
          Math.min(80, this.resizeStartPercentage() + deltaPercentage),
        );
        this.miningBlockHeight.set(newPercentage);
      }
    }
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onMouseUp() {
    this.isResizing.set(false);
    this.activeResizer.set(null);
  }
}
