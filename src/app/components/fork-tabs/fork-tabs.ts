import { Component, signal, computed, inject } from '@angular/core';

import { Blockchain } from '../../services/blockchain.service';
import { MiningService } from '../../services/mining.service';

@Component({
  selector: 'app-fork-tabs',
  standalone: true,
  imports: [],
  templateUrl: './fork-tabs.html',
  styleUrl: './fork-tabs.css',
})
export class ForkTabs {
  private blockchain = inject(Blockchain);
  private miningService = inject(MiningService);

  chains = () => this.blockchain.chains();
  activeChainId = () => this.blockchain.activeChainId();
  mainChainData = computed(() => this.blockchain.mainChain());
  showTooltip = signal<boolean>(false);
  isDisabled = computed(() => this.miningService.isMining() || this.miningService.isRacing());

  selectFork(chainId: string): void {
    this.blockchain.setActiveChain(chainId);
  }

  deleteFork(chainId: string, event: Event): void {
    event.stopPropagation();
    if (chainId !== 'main') {
      this.blockchain.removeChain(chainId);
    }
  }

  createFork(): void {
    const mainChain = this.mainChainData();
    if (!mainChain || mainChain.chain.length === 0) {
      alert('Mine alguns blocos primeiro!');
      return;
    }

    const forkPoint = Math.max(0, mainChain.chain.length - 1);
    const forkName = `Fork ${this.chains().length}`;

    try {
      const newChainId = this.blockchain.createChain(forkPoint, forkName);
      this.blockchain.setActiveChain(newChainId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao criar o fork';
      alert(msg);
    }
  }
}
