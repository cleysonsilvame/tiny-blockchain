import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForkService } from '../../services/fork.service';
import { Blockchain } from '../../services/blockchain';

@Component({
  selector: 'app-fork-visualizer',
  imports: [CommonModule],
  templateUrl: './fork-visualizer.html',
  styleUrl: './fork-visualizer.css',
})
export class ForkVisualizer {
  forks = computed(() => this.forkService.forks());
  showForkView = computed(() => this.forkService.showForkView());
  blockchainData = computed(() => this.blockchain.blockchain());

  constructor(
    public forkService: ForkService,
    private blockchain: Blockchain
  ) {}

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
    } catch (error: any) {
      alert(error.message);
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
