import { Component, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForkService } from '../../services/fork.service';
import { Blockchain } from '../../services/blockchain';

@Component({
  selector: 'app-fork-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fork-tabs.html',
  styleUrl: './fork-tabs.css'
})
export class ForkTabs {
  forks = () => this.forkService.forks();
  activeForkId = () => this.forkService.activeForkId();
  blockchainData = computed(() => this.blockchain.blockchain());
  showTooltip = signal<boolean>(false);

  constructor(
    public forkService: ForkService,
    private blockchain: Blockchain
  ) {
    // Auto-switch to mining fork when mining completes
    effect(() => {
      const miningForkId = this.forkService.miningForkId();
      if (miningForkId) {
        this.forkService.activeForkId.set(miningForkId);
        // Reset miningForkId after switching
        setTimeout(() => {
          this.forkService.miningForkId.set(null);
        }, 100);
      }
    });
  }

  selectFork(forkId: string): void {
    this.forkService.activeForkId.set(forkId);
  }

  deleteFork(forkId: string, event: Event): void {
    event.stopPropagation();
    if (forkId !== 'main') {
      this.forkService.removeFork(forkId);
      // Switch to main chain if deleted fork was active
      if (this.forkService.activeForkId() === forkId) {
        this.forkService.activeForkId.set('main');
      }
    }
  }

  createFork(): void {
    const chain = this.blockchainData();
    if (chain.length === 0) {
      alert('Mine alguns blocos primeiro!');
      return;
    }

    const forkPoint = Math.max(0, chain.length - 1);
    const forkName = `Fork ${this.forks().length}`;

    try {
      const newForkId = this.forkService.createFork(forkPoint, forkName);
      // Auto-switch to new fork
      this.forkService.activeForkId.set(newForkId);
    } catch (error: any) {
      alert(error.message);
    }
  }
}
