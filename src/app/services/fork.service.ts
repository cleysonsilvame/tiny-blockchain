import { Injectable, signal, inject } from '@angular/core';
import { BlockchainFork } from '../models/fork.model';
import { Block } from '../models/blockchain.model';
import { Blockchain } from './blockchain';

@Injectable({
  providedIn: 'root',
})
export class ForkService { // TODO: transformar o main chain em uma lista de chains?
  private blockchain = inject(Blockchain);

  forks = signal<BlockchainFork[]>([]);
  activeForkId = signal<string | null>(null);
  showForkView = signal<boolean>(false);

  constructor() {
    // Initialize with main chain as default fork
    this.initializeMainChain();
    // Sync main chain with blockchain whenever it changes
    this.syncMainChain();
  }

  private initializeMainChain(): void {
    const mainChain: BlockchainFork = {
      id: 'main',
      name: 'Main Chain',
      chain: this.blockchain.blockchain(), // Initialize with current blockchain
      color: '#10b981', // green
      isMainChain: true,
      forkPoint: 0,
    };
    this.forks.set([mainChain]);
    this.activeForkId.set('main');
  }

  // Sync main chain with blockchain
  private syncMainChain(): void {
    // Update main chain whenever blockchain changes
    setInterval(() => {
      this.forks.update((forks) => {
        return forks.map((fork) => {
          if (fork.id === 'main') {
            return { ...fork, chain: this.blockchain.blockchain() };
          }
          return fork;
        });
      });
    }, 100);
  }

  // Cria um fork a partir de um bloco específico
  createFork(forkPoint: number, forkName: string): string {
    const mainChain = this.blockchain.blockchain();

    if (forkPoint < 0 || forkPoint >= mainChain.length) {
      throw new Error('Invalid fork point');
    }

    // Copy blocks up to fork point
    const forkChain = mainChain.slice(0, forkPoint + 1);

    const forkId = `fork-${Date.now()}`;
    const newFork: BlockchainFork = {
      id: forkId,
      name: forkName,
      chain: forkChain,
      color: this.generateRandomColor(),
      isMainChain: false,
      forkPoint,
    };

    this.forks.update((forks) => [...forks, newFork]);
    this.showForkView.set(true);

    return forkId;
  }

  // Adiciona bloco a um fork específico
  addBlockToFork(forkId: string, block: Block): void {
    this.forks.update((forks) => {
      return forks.map((fork) => {
        if (fork.id === forkId) {
          return { ...fork, chain: [...fork.chain, block] };
        }
        return fork;
      });
    });

    // Check if this fork became the longest chain
    this.resolveConflict();
  }

  // Implementa consenso: cadeia mais longa vence
  resolveConflict(): void {
    const allForks = this.forks();
    if (allForks.length <= 1) return;

    let longestFork = allForks[0];

    allForks.forEach((fork) => {
      if (fork.chain.length > longestFork.chain.length) {
        longestFork = fork;
      }
    });

    // Update main chain flag
    this.forks.update((forks) => {
      return forks.map((fork) => ({
        ...fork,
        isMainChain: fork.id === longestFork.id,
      }));
    });

    // Update blockchain service with longest chain
    if (longestFork.id !== 'main') {
      this.blockchain.blockchain.set(longestFork.chain);
      if (longestFork.chain.length > 0) {
        const lastBlock = longestFork.chain[longestFork.chain.length - 1];
        this.blockchain.previousHash.set(lastBlock.hash);
        this.blockchain.currentBlockNumber.set(lastBlock.number + 1);
      }
    }
  }

  getFork(forkId: string): BlockchainFork | undefined {
    return this.forks().find((f) => f.id === forkId);
  }

  getMainChain(): BlockchainFork | undefined {
    return this.forks().find((f) => f.isMainChain);
  }

  removeFork(forkId: string): void {
    if (forkId === 'main') {
      throw new Error('Cannot remove main chain');
    }

    this.forks.update((forks) => forks.filter((f) => f.id !== forkId));
  }

  toggleForkView(): void {
    this.showForkView.update((show) => !show);
  }

  private generateRandomColor(): string {
    const colors = [
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#f59e0b', // orange
      '#ef4444', // red
      '#06b6d4', // cyan
      '#ec4899', // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Simula dois mineradores encontrando blocos ao mesmo tempo
  simulateSimultaneousBlocks(block1: Block, block2: Block): void {
    const mainChain = this.blockchain.blockchain();
    const currentLength = mainChain.length;

    // Create fork from current state
    const forkId = this.createFork(currentLength - 1, `Fork at #${currentLength}`);

    // Add block1 to main chain
    this.blockchain.addBlockToChain(block1);

    // Add block2 to fork
    this.addBlockToFork(forkId, block2);
  }
}
