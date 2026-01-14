import { Component } from '@angular/core';
import { BlockchainDisplay } from './components/blockchain-display/blockchain-display';
import { MempoolSidebar } from './components/mempool-sidebar/mempool-sidebar';
import { MiningBlock } from './components/mining-block/mining-block';
import { StatsDashboard } from './components/stats-dashboard/stats-dashboard';
import { WalletExplorer } from './components/wallet-explorer/wallet-explorer';

@Component({
  selector: 'app-blockchain-tab',
  standalone: true,
  imports: [BlockchainDisplay],
  template: `<div class="w-full h-full overflow-auto"><app-blockchain-display></app-blockchain-display></div>`,
})
export class BlockchainTab { }

@Component({
  selector: 'app-mempool-tab',
  standalone: true,
  imports: [MempoolSidebar],
  template: `<app-mempool-sidebar class="w-full h-full overflow-auto"></app-mempool-sidebar>`,
})
export class MempoolTab { }

@Component({
  selector: 'app-mining-tab',
  standalone: true,
  imports: [MiningBlock],
  template: `
    <div class="w-full h-full overflow-auto">
      <app-mining-block></app-mining-block>
    </div>
  `,
})
export class MiningTab {}

@Component({
  selector: 'app-stats-tab',
  standalone: true,
  imports: [StatsDashboard],
  template: `<div class="w-full h-full overflow-auto"><app-stats-dashboard></app-stats-dashboard></div>`,
})
export class StatsTab {}

@Component({
  selector: 'app-wallet-tab',
  standalone: true,
  imports: [WalletExplorer],
  template: `<div class="w-full h-full overflow-auto"><app-wallet-explorer></app-wallet-explorer></div>`,
})
export class WalletTab {}

