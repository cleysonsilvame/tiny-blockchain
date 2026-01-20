import { Component, computed, inject, signal } from '@angular/core';

import { Blockchain } from '../../services/blockchain.service';

@Component({
  selector: 'app-fork-visualizer',
  imports: [],
  templateUrl: './fork-visualizer.html',
  styleUrl: './fork-visualizer.css',
})
export class ForkVisualizer {
  blockchain = inject(Blockchain);

  chains = computed(() => this.blockchain.chains());
  showForkView = signal<boolean>(false);
  mainChainData = computed(() => this.blockchain.mainChain());

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

  toggleForkView(): void {
    this.showForkView.update(v => !v);
  }

  removeChain(chainId: string): void {
    this.blockchain.removeChain(chainId);
  }

  getChainLength(chainId: string): number {
    const chain = this.blockchain.getChain(chainId);
    return chain ? chain.chain.length : 0;
  }
}
