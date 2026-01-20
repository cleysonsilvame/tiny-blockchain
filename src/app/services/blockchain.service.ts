import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Block, Transaction, Chain } from '../models/blockchain.model';
import * as CryptoJS from 'crypto-js';
import { MempoolService } from './mempool.service';

@Injectable({
  providedIn: 'root',
})
export class Blockchain {
  private readonly GENESIS_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000';
  private readonly DIFFICULTY = 4;
  private readonly BLOCK_REWARD = 6.25; // Recompensa base por bloco em BTC
  private readonly DEFAULT_MINER_ADDRESS = '1MinerDefaultAddress123456789ABC'; // Endereço padrão

  private mempoolService = inject(MempoolService);

  chains = signal<Chain[]>([]);
  activeChainId = signal<string>('main');

  activeChain = computed(() => {
    const chainId = this.activeChainId();
    return this.chains().find((c) => c.id === chainId);
  });

  mainChain = computed(() => {
    return this.chains().find((c) => c.isMainChain);
  });

  currentBlockNumber = computed(() => {
    const chain = this.activeChain();
    return chain ? chain.chain.length + 1 : 1;
  });

  previousHash = computed(() => {
    const chain = this.activeChain();
    if (chain && chain.chain.length > 0) {
      return chain.chain[chain.chain.length - 1].hash;
    }
    return this.GENESIS_HASH;
  });

  constructor() {
    this.initializeMainChain();
    this.mempoolService.initializeMockTransactions();
    this.trackLongestChain();
  }

  private trackLongestChain(): void {
    effect(() => {
      const allChains = this.chains();
      if (allChains.length === 0) return;

      const longestLength = Math.max(...allChains.map((c) => c.chain.length));
      const needsUpdate = !allChains.some(
        (c) => c.isMainChain && c.chain.length === longestLength,
      );

      if (needsUpdate) {
        this.chains.set(
          allChains.map((c) => ({
            ...c,
            isMainChain: c.chain.length === longestLength,
          })),
        );
      }
    });
  }

  private initializeMainChain(): void {
    const mainChain: Chain = {
      id: 'main',
      name: 'Main Chain',
      chain: [],
      color: '#10b981',
      isMainChain: true,
      forkPoint: 0,
    };
    this.chains.set([mainChain]);
  }

  calculateHash(
    blockNum: number,
    nonce: number,
    data: string,
    prevHash: string,
    transactions: Transaction[],
  ): string {
    const txData = transactions.map((tx) => `${tx.sender}${tx.receiver}${tx.amount}`).join('');
    return CryptoJS.SHA256(`${blockNum}${nonce}${data}${prevHash}${txData}`).toString();
  }

  addBlockToChain(block: Block, chainId?: string): void {
    const targetChainId = chainId || this.activeChainId();

    this.chains.update((chains) => {
      return chains.map((chain) => {
        if (chain.id === targetChainId) {
          return {
            ...chain,
            chain: [...chain.chain, block],
          };
        }
        return chain;
      });
    });

    // Remove transações mineradas do mempool
    const minedTxIds = block.transactions.map((tx) => tx.id);
    this.mempoolService.removeTransactions(minedTxIds);
  }

  getDifficulty(): number {
    return this.DIFFICULTY;
  }

  getBlockReward(): number {
    return this.BLOCK_REWARD;
  }

  getDefaultMinerAddress(): string {
    return this.DEFAULT_MINER_ADDRESS;
  }

  calculateTotalFees(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => sum + tx.fee, 0);
  }

  calculateBlockReward(transactions: Transaction[]): number {
    return this.BLOCK_REWARD + this.calculateTotalFees(transactions);
  }

  // Valida uma chain específica
  validateChain(chainId?: string): { isValid: boolean; invalidBlocks: number[] } {
    const targetChainId = chainId || this.activeChainId();
    const targetChain = this.chains().find((c) => c.id === targetChainId);

    if (!targetChain || targetChain.chain.length === 0) {
      return { isValid: true, invalidBlocks: [] };
    }

    const invalidBlockNumbers: number[] = [];
    const blocks = targetChain.chain;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      let isBlockValid = true;

      // 1. Verify block hash matches content
      const calculatedHash = this.calculateHash(
        block.number,
        block.nonce,
        block.data,
        block.previousHash,
        block.transactions,
      );

      if (calculatedHash !== block.hash) {
        isBlockValid = false;
      }

      // 2. Verify hash meets difficulty requirement
      const targetPrefix = '0'.repeat(this.DIFFICULTY);
      if (!block.hash.startsWith(targetPrefix)) {
        isBlockValid = false;
      }

      // 3. Verify previousHash chain (except for first block)
      if (i > 0) {
        const prevBlock = blocks[i - 1];
        if (block.previousHash !== prevBlock.hash) {
          isBlockValid = false;
        }
      } else {
        // First block should have genesis hash
        if (block.previousHash !== this.GENESIS_HASH) {
          isBlockValid = false;
        }
      }

      // 4. Verify block number sequence
      if (block.number !== i + 1) {
        isBlockValid = false;
      }

      if (!isBlockValid) {
        invalidBlockNumbers.push(block.number);
      }
    }

    return {
      isValid: invalidBlockNumbers.length === 0,
      invalidBlocks: invalidBlockNumbers,
    };
  }



  // Permite editar um bloco existente (para demonstrar quebra de integridade)
  tamperBlock(blockNumber: number, newData: string): void {
    const chainId = this.activeChainId();
    this.chains.update((chains) => {
      return chains.map((chain) => {
        if (chain.id === chainId) {
          const blockIndex = chain.chain.findIndex((b) => b.number === blockNumber);
          if (blockIndex !== -1) {
            const block = { ...chain.chain[blockIndex] };
            block.data = newData;
            const newChain = [...chain.chain];
            newChain[blockIndex] = block;
            return { ...chain, chain: newChain };
          }
        }
        return chain;
      });
    });
  }

  isBlockInvalid(blockNumber: number): boolean {
    const chain = this.activeChain();
    if (!chain) return false;

    const validation = this.validateChain(chain.id);
    return validation.invalidBlocks.includes(blockNumber);
  }

  // Chain management methods (migrated from ForkService)
  createChain(forkPoint: number, chainName: string): string {
    const mainChain = this.mainChain();
    if (!mainChain) throw new Error('No main chain found');

    if (forkPoint < 0 || forkPoint >= mainChain.chain.length) {
      throw new Error('Invalid fork point');
    }

    const forkChain = mainChain.chain.slice(0, forkPoint + 1);
    const chainId = `chain-${Date.now()}`;
    const newChain: Chain = {
      id: chainId,
      name: chainName,
      chain: forkChain,
      color: this.generateRandomColor(),
      isMainChain: false,
      forkPoint,
    };

    this.chains.update((chains) => [...chains, newChain]);
    return chainId;
  }

  removeChain(chainId: string): void {
    if (chainId === 'main') {
      throw new Error('Cannot remove main chain');
    }

    this.chains.update((chains) => chains.filter((c) => c.id !== chainId));

    // If active chain was removed, switch to main
    if (this.activeChainId() === chainId) {
      this.activeChainId.set('main');
    }
  }

  setActiveChain(chainId: string): void {
    const chain = this.chains().find((c) => c.id === chainId);
    if (chain) {
      this.activeChainId.set(chainId);
    }
  }

  getChain(chainId: string): Chain | undefined {
    return this.chains().find((c) => c.id === chainId);
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
}
