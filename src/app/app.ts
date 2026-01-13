import { Component, computed, signal, HostListener, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MempoolSidebar } from './components/mempool-sidebar/mempool-sidebar';
import { MiningBlock } from './components/mining-block/mining-block';
import { BlockchainDisplay } from './components/blockchain-display/blockchain-display';
import { WalletExplorer } from './components/wallet-explorer/wallet-explorer';
import { StatsDashboard } from './components/stats-dashboard/stats-dashboard';
import { HeaderComponent } from './components/header/header';
import { ResizableSplit } from './components/ui/resizable-split/resizable-split';
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
    HeaderComponent,
    ResizableSplit,
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

  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onWindowResize(_event: Event) {
    if (typeof window !== 'undefined') {
      this.viewportWidth.set(window.innerWidth);
    }
  }
}
