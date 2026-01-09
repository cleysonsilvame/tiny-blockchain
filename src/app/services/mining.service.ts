import { Injectable, signal, computed } from '@angular/core';
import { Miner, MiningProgress, MiningResult } from '../models/miner.model';
import { Transaction } from '../models/blockchain.model';
import { Blockchain } from './blockchain';

@Injectable({
  providedIn: 'root',
})
export class MiningService {
  // Predefined miners with different mining speeds and colors
  private readonly defaultMiners: Miner[] = [
    {
      id: 'miner-1',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      name: 'Alice',
      color: '#3b82f6', // blue
      hashRate: 15000,
      totalBlocksMined: 0,
      isActive: true,
    },
    {
      id: 'miner-2',
      address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      name: 'Bob',
      color: '#10b981', // green
      hashRate: 12000,
      totalBlocksMined: 0,
      isActive: true,
    },
    {
      id: 'miner-3',
      address: '1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp',
      name: 'Charlie',
      color: '#f59e0b', // orange
      hashRate: 10000,
      totalBlocksMined: 0,
      isActive: true,
    },
  ];

  miners = signal<Miner[]>([...this.defaultMiners]);
  activeMiners = computed(() => this.miners().filter((m) => m.isActive));
  miningProgress = signal<Map<string, MiningProgress>>(new Map());
  isRacing = signal<boolean>(false);
  lastWinner = signal<MiningResult | null>(null);

  private stopMining = false;

  constructor(private blockchain: Blockchain) {}

  toggleMiner(minerId: string): void {
    this.miners.update((miners) =>
      miners.map((m) => (m.id === minerId ? { ...m, isActive: !m.isActive } : m))
    );
  }

  resetMiners(): void {
    this.miners.set([...this.defaultMiners]);
    this.miningProgress.set(new Map());
    this.lastWinner.set(null);
  }

  async startMiningRace(
    blockNumber: number,
    previousHash: string,
    difficulty: number,
    transactions: Transaction[]
  ): Promise<MiningResult> {
    this.isRacing.set(true);
    this.stopMining = false;
    const activeMiners = this.activeMiners();

    // Initialize progress for all miners
    const progress = new Map<string, MiningProgress>();
    activeMiners.forEach((miner) => {
      progress.set(miner.id, {
        minerId: miner.id,
        nonce: 0,
        currentHash: '',
        attempts: 0,
      });
    });
    this.miningProgress.set(progress);

    return new Promise<MiningResult>((resolve) => {
      const targetPrefix = '0'.repeat(difficulty);
      let winner: MiningResult | null = null;

      const mineForMiner = async (miner: Miner) => {
        let nonce = Math.floor(Math.random() * 1000000); // Random starting nonce
        let attempts = 0;

        const mineBatch = () => {
          if (this.stopMining || winner) return;

          // Reduced batch size for racing mode to make it slower and more visual
          const batchSize = Math.floor(miner.hashRate / 100); // Much smaller batches

          for (let i = 0; i < batchSize && !winner; i++) {
            const hash = this.blockchain.calculateHash(
              blockNumber,
              nonce,
              '',
              previousHash,
              transactions
            );
            attempts++;

            // Update progress more frequently for better visual feedback
            const currentProgress = this.miningProgress();
            const minerProgress = currentProgress.get(miner.id);
            if (minerProgress) {
              minerProgress.nonce = nonce;
              minerProgress.currentHash = hash;
              minerProgress.attempts = attempts;
              this.miningProgress.set(new Map(currentProgress));
            }

            if (hash.startsWith(targetPrefix)) {
              winner = {
                winner: miner,
                nonce,
                hash,
                attempts,
                timestamp: Date.now(),
              };

              // Update miner stats
              this.miners.update((miners) =>
                miners.map((m) =>
                  m.id === miner.id ? { ...m, totalBlocksMined: m.totalBlocksMined + 1 } : m
                )
              );

              this.lastWinner.set(winner);
              this.stopMining = true;
              this.isRacing.set(false);
              resolve(winner);
              return;
            }

            nonce++;
          }

          if (!winner && !this.stopMining) {
            // Add delay between batches for better visualization (50ms)
            setTimeout(mineBatch, 50);
          }
        };

        mineBatch();
      };

      // Start all miners racing
      activeMiners.forEach((miner) => mineForMiner(miner));
    });
  }

  stopRace(): void {
    this.stopMining = true;
    this.isRacing.set(false);
  }

  getMinerById(id: string): Miner | undefined {
    return this.miners().find((m) => m.id === id);
  }

  getMinerProgress(minerId: string): MiningProgress | undefined {
    return this.miningProgress().get(minerId);
  }
}
