import { computed, inject, Injectable, signal } from '@angular/core';
import { Transaction } from '../models/blockchain.model';
import { Miner, MiningProgress, MiningResult } from '../models/miner.model';
import { Blockchain } from './blockchain';

@Injectable({
  providedIn: 'root',
})
export class MiningService {
  private blockchain = inject(Blockchain);

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
  miningMode = signal<'single' | 'race'>('single');

  // Single mining state (shared across all component instances)
  isMining = signal<boolean>(false);
  nonce = signal<number>(0);
  data = signal<string>('');
  isValid = signal<boolean>(false);
  selectedTransactions = signal<Transaction[]>([]);

  // Computed hash that updates reactively based on blockchain state
  currentHash = computed(() => {
    const blockNumber = this.blockchain.currentBlockNumber();
    const previousHash = this.blockchain.previousHash();
    const difficulty = this.blockchain.getDifficulty();
    const nonce = this.nonce();
    const data = this.data();

    const txs = this.blockchain.mempool().slice(0, difficulty);

    const hash = this.blockchain.calculateHash(
      blockNumber,
      nonce,
      data,
      previousHash,
      txs,
    );

    return hash;
  });

  // Computed validity based on current hash and difficulty
  isValidHash = computed(() => {
    const difficulty = this.blockchain.getDifficulty();
    return this.currentHash().startsWith('0'.repeat(difficulty));
  });

  private stopMining = false;

  // No constructor needed; using inject() for DI

  toggleMiner(minerId: string): void {
    this.miners.update((miners) =>
      miners.map((m) => (m.id === minerId ? { ...m, isActive: !m.isActive } : m)),
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
    transactions: Transaction[],
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
              transactions,
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
                  m.id === miner.id ? { ...m, totalBlocksMined: m.totalBlocksMined + 1 } : m,
                ),
              );

              this.lastWinner.set(winner);
              this.stopMining = true;
              this.isRacing.set(false);

              resolve(winner);
              setTimeout(() => this.resetMiningState(), 500);
              return;
            }

            nonce++;
          }

          if (!winner && !this.stopMining) {
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

  toggleMiningMode(): void {
    this.miningMode.update((mode) => (mode === 'single' ? 'race' : 'single'));
  }

  resetMiningState(): void {
    this.selectedTransactions.set([]);
    this.data.set('');
    this.nonce.set(0);
    this.isMining.set(false);
  }

  async mineSingle(
    blockNumber: number,
    previousHash: string,
    difficulty: number,
    transactions: Transaction[],
    data: string,
  ): Promise<MiningResult> {
    this.isMining.set(true);
    this.selectedTransactions.set(transactions);

    let currentNonce = 0;
    let hash = '';
    const targetPrefix = '0'.repeat(difficulty);

    return new Promise<MiningResult>((resolve) => {
      const mineInBatches = () => {
        const batchSize = 10000;

        for (let i = 0; i < batchSize; i++) {
          hash = this.blockchain.calculateHash(
            blockNumber,
            currentNonce,
            data,
            previousHash,
            transactions,
          );

          // Update shared state for UI
          this.nonce.set(currentNonce);
          // currentHash and isValidHash are computed reactively

          if (hash.startsWith(targetPrefix)) {
            const defaultMiner = this.miners()[0];
            const result: MiningResult = {
              winner: defaultMiner,
              nonce: currentNonce,
              hash,
              attempts: currentNonce,
              timestamp: Date.now(),
            };

            // Add delay before resolving to show final result
            setTimeout(() => {
              resolve(result);
              // Reset after resolving so component can still access selectedTransactions
              setTimeout(() => this.resetMiningState(), 100);
            }, 500);
            return;
          }
          currentNonce++;
        }

        setTimeout(mineInBatches, 10);
      };

      mineInBatches();
    });
  }
}
