import { Component, computed, signal, HostListener, inject } from '@angular/core';
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

  // Resize state for right sidebar
  rightPanelWidth = signal(384); // w-96 = 24rem = 384px

  // Resize state for left sidebar (mempool)
  mempoolWidth = signal(384); // w-96 = 24rem = 384px

  // Resize state for mining-block height
  miningBlockHeight = signal(80); // initial percentage (40% of container)

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

  // No constructor needed; using inject() for DI

  get difficulty() {
    return this.blockchainService.getDifficulty();
  }

  onResizerMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.clientX);
    this.resizeStartWidth.set(this.rightPanelWidth());
    this.activeResizer.set('right');
  }

  onLeftResizerMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX.set(event.clientX);
    this.resizeStartWidth.set(this.mempoolWidth());
    this.activeResizer.set('left');
  }

  onVerticalResizerMouseDown(event: MouseEvent) {
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

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing()) return;

    const resizer = this.activeResizer();

    if (resizer === 'right') {
      const delta = event.clientX - this.resizeStartX();
      const newWidth = Math.max(300, Math.min(600, this.resizeStartWidth() - delta));
      this.rightPanelWidth.set(newWidth);
    } else if (resizer === 'left') {
      const delta = event.clientX - this.resizeStartX();
      const newWidth = Math.max(250, Math.min(500, this.resizeStartWidth() + delta));
      this.mempoolWidth.set(newWidth);
    } else if (resizer === 'vertical') {
      const deltaY = event.clientY - this.resizeStartY();
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
  onMouseUp() {
    this.isResizing.set(false);
    this.activeResizer.set(null);
  }
}
