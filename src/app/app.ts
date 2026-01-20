import { Component, computed, signal, inject, afterNextRender, DestroyRef } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MempoolSidebar } from './components/mempool-sidebar/mempool-sidebar';
import { MiningBlock } from './components/mining-block/mining-block';
import { BlockchainDisplay } from './components/blockchain-display/blockchain-display';
import { WalletExplorer } from './components/wallet-explorer/wallet-explorer';
import { StatsDashboard } from './components/stats-dashboard/stats-dashboard';
import { HeaderComponent } from './components/header/header';
import { ResizableSplit } from './components/ui/resizable-split/resizable-split';
import { TabButton } from './components/ui/tab-button';
import { Blockchain } from './services/blockchain.service';
import { BlockchainTab, MempoolTab, MiningTab, StatsTab, WalletTab } from './tabs';

type TabId = 'mempool' | 'mining' | 'blockchain' | 'stats' | 'wallet';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NgComponentOutlet,
    MempoolSidebar,
    MiningBlock,
    BlockchainDisplay,
    WalletExplorer,
    StatsDashboard,
    HeaderComponent,
    ResizableSplit,
    TabButton,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private destroyRef = inject(DestroyRef);
  blockchainService = inject(Blockchain);

  viewportWidth = signal(1280);
  isMobile = computed(() => this.viewportWidth() < 1024);
  isTablet = computed(() => this.viewportWidth() >= 1024 && this.viewportWidth() < 1280);
  isDesktop = computed(() => this.viewportWidth() >= 1280);

  activeMobileTab = signal<TabId>('mining');

  readonly tabComponents = {
    mempool: MempoolTab,
    mining: MiningTab,
    blockchain: BlockchainTab,
    stats: StatsTab,
    wallet: WalletTab,
  } as const;

  activeTabComponent = computed(() => this.tabComponents[this.activeMobileTab()]);

  constructor() {
    afterNextRender(() => {
      this.viewportWidth.set(window.innerWidth);

      fromEvent(window, 'resize')
        .pipe(
          debounceTime(150),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.viewportWidth.set(window.innerWidth);
        });
    });
  }

  setActiveMobileTab(tab: TabId) {
    this.activeMobileTab.set(tab);
  }

  isTabActive(tab: TabId): boolean {
    return this.activeMobileTab() === tab;
  }
}
