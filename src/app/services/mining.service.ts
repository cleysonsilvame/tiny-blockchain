import { computed, inject, Injectable, signal } from '@angular/core';
import { Transaction } from '../models/blockchain.model';
import { Miner, MiningProgress, MiningResult } from '../models/miner.model';
import { Blockchain } from './blockchain';

@Injectable({
  providedIn: 'root',
})
export class MiningService {
  private blockchain = inject(Blockchain);

  private readonly RANDOM_NONCE_MAX = 1000000;
  private readonly RACE_BATCH_DIVISOR = 100;
  private readonly RACE_BATCH_DELAY_MS = 50;
  private readonly SINGLE_BATCH_SIZE = 10000;
  private readonly SINGLE_BATCH_DELAY_MS = 10;
  private readonly RESULT_DISPLAY_DELAY_MS = 500;
  private readonly STATE_RESET_DELAY_MS = 100;

  private readonly defaultMiners: Miner[] = [
    {
      id: 'miner-1',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      name: 'Alice',
      color: '#3b82f6',
      hashRate: 15000,
      totalBlocksMined: 0,
      isActive: true,
    },
    {
      id: 'miner-2',
      address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      name: 'Bob',
      color: '#10b981',
      hashRate: 12000,
      totalBlocksMined: 0,
      isActive: true,
    },
    {
      id: 'miner-3',
      address: '1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp',
      name: 'Charlie',
      color: '#f59e0b',
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

  isMining = signal<boolean>(false);
  nonce = signal<number>(0);
  data = signal<string>('');
  selectedTransactions = signal<Transaction[]>([]);

  currentHash = computed(() => {
    const blockNumber = this.blockchain.currentBlockNumber();
    const previousHash = this.blockchain.previousHash();
    const difficulty = this.blockchain.getDifficulty();
    const nonce = this.nonce();
    const data = this.data();
    const txs = this.blockchain.mempool().slice(0, difficulty);

    return this.blockchain.calculateHash(
      blockNumber,
      nonce,
      data,
      previousHash,
      txs,
    );
  });

  isValidHash = computed(() => {
    const difficulty = this.blockchain.getDifficulty();
    return this.currentHash().startsWith('0'.repeat(difficulty));
  });

  private stopMining = false;

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

    this.initializeMinerProgress(activeMiners);

    return new Promise<MiningResult>((resolve) => {
      const targetPrefix = '0'.repeat(difficulty);
      let winner: MiningResult | null = null;

      const mineForMiner = async (miner: Miner) => {
        let nonce = this.generateRandomNonce();
        let attempts = 0;
        const batchSize = this.calculateRaceBatchSize(miner.hashRate);

        const mineBatch = () => {
          if (this.shouldStopMining(winner)) return;

          for (let i = 0; i < batchSize && !winner; i++) {
            const hash = this.blockchain.calculateHash(
              blockNumber,
              nonce,
              '',
              previousHash,
              transactions,
            );
            attempts++;

            this.updateMinerProgress(miner.id, nonce, hash, attempts);

            if (this.isValidMiningHash(hash, targetPrefix)) {
              winner = this.createMiningResult(miner, nonce, hash, attempts);
              this.handleRaceWinner(winner);
              resolve(winner);
              return;
            }

            nonce++;
          }

          if (!this.shouldStopMining(winner)) {
            setTimeout(mineBatch, this.RACE_BATCH_DELAY_MS);
          }
        };

        mineBatch();
      };

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

    const targetPrefix = '0'.repeat(difficulty);
    let currentNonce = 0;

    return new Promise<MiningResult>((resolve) => {
      const mineInBatches = () => {
        for (let i = 0; i < this.SINGLE_BATCH_SIZE; i++) {
          const hash = this.blockchain.calculateHash(
            blockNumber,
            currentNonce,
            data,
            previousHash,
            transactions,
          );

          this.nonce.set(currentNonce);

          if (this.isValidMiningHash(hash, targetPrefix)) {
            const defaultMiner = this.miners()[0];
            const result = this.createMiningResult(defaultMiner, currentNonce, hash, currentNonce);
            this.handleSingleMiningResult(result, resolve);
            return;
          }
          currentNonce++;
        }

        setTimeout(mineInBatches, this.SINGLE_BATCH_DELAY_MS);
      };

      mineInBatches();
    });
  }

  private initializeMinerProgress(miners: Miner[]): void {
    const progress = new Map<string, MiningProgress>();
    miners.forEach((miner) => {
      progress.set(miner.id, {
        minerId: miner.id,
        nonce: 0,
        currentHash: '',
        attempts: 0,
      });
    });
    this.miningProgress.set(progress);
  }

  private generateRandomNonce(): number {
    return Math.floor(Math.random() * this.RANDOM_NONCE_MAX);
  }

  private calculateRaceBatchSize(hashRate: number): number {
    return Math.floor(hashRate / this.RACE_BATCH_DIVISOR);
  }

  private shouldStopMining(winner: MiningResult | null): boolean {
    return this.stopMining || winner !== null;
  }

  private updateMinerProgress(
    minerId: string,
    nonce: number,
    hash: string,
    attempts: number,
  ): void {
    const currentProgress = this.miningProgress();
    const minerProgress = currentProgress.get(minerId);
    if (minerProgress) {
      minerProgress.nonce = nonce;
      minerProgress.currentHash = hash;
      minerProgress.attempts = attempts;
      this.miningProgress.set(new Map(currentProgress));
    }
  }

  private isValidMiningHash(hash: string, targetPrefix: string): boolean {
    return hash.startsWith(targetPrefix);
  }

  private createMiningResult(
    miner: Miner,
    nonce: number,
    hash: string,
    attempts: number,
  ): MiningResult {
    return {
      winner: miner,
      nonce,
      hash,
      attempts,
      timestamp: Date.now(),
    };
  }

  private handleRaceWinner(winner: MiningResult): void {
    this.miners.update((miners) =>
      miners.map((m) =>
        m.id === winner.winner.id ? { ...m, totalBlocksMined: m.totalBlocksMined + 1 } : m,
      ),
    );

    this.lastWinner.set(winner);
    this.stopMining = true;
    this.isRacing.set(false);
    setTimeout(() => this.resetMiningState(), this.RESULT_DISPLAY_DELAY_MS);
  }

  private handleSingleMiningResult(
    result: MiningResult,
    resolve: (value: MiningResult) => void,
  ): void {
    setTimeout(() => {
      resolve(result);
      setTimeout(() => this.resetMiningState(), this.STATE_RESET_DELAY_MS);
    }, this.RESULT_DISPLAY_DELAY_MS);
  }
}
