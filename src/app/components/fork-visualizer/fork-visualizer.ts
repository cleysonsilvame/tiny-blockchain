import { Component, computed, inject } from '@angular/core';

import { ForkService } from '../../services/fork.service';
import { Blockchain } from '../../services/blockchain';

@Component({
  selector: 'app-fork-visualizer',
  imports: [],
  templateUrl: './fork-visualizer.html',
  styleUrl: './fork-visualizer.css',
})
export class ForkVisualizer {
  forkService = inject(ForkService);
  private blockchain = inject(Blockchain);

  forks = computed(() => this.forkService.forks());
  showForkView = computed(() => this.forkService.showForkView());
  blockchainData = computed(() => this.blockchain.blockchain());

  // No constructor needed; using inject() for DI

  createFork(): void {
    const chain = this.blockchainData();
    if (chain.length === 0) {
      alert('Mine alguns blocos primeiro!');
      return;
    }

    const forkPoint = Math.max(0, chain.length - 1);
    const forkName = `Fork ${this.forks().length}`;

    try {
      this.forkService.createFork(forkPoint, forkName);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao criar o fork';
      alert(msg);
    }
  }

  toggleForkView(): void {
    this.forkService.toggleForkView();
  }

  getChainLength(forkId: string): number {
    const fork = this.forkService.getFork(forkId);
    return fork ? fork.chain.length : 0;
  }
}
