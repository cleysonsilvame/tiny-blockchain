import { Component, Input, signal, OnInit, OnChanges, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Block, Transaction } from '../../models/blockchain.model';
import { Blockchain } from '../../services/blockchain';
import { MiningService } from '../../services/mining.service';
import { ForkService } from '../../services/fork.service';
import { MiningRace } from '../mining-race/mining-race';

@Component({
  selector: 'app-mining-block',
  imports: [FormsModule, MiningRace],
  templateUrl: './mining-block.html',
  styleUrl: './mining-block.css',
  standalone: true,
})
export class MiningBlock implements OnInit, OnChanges {
  private blockchainService = inject(Blockchain);
  private miningService = inject(MiningService);
  private forkService = inject(ForkService);

  @Input() blockNumber!: number;
  @Input() previousHash!: string;
  @Input() difficulty!: number;
  @Input() pendingTransactions: Transaction[] = [];
  @Input() minerAddress = '';

  nonce = signal<number>(0);
  data = signal<string>('');
  isMining = signal<boolean>(false);
  selectedTransactions = signal<Transaction[]>([]);
  currentHash = signal<string>('');
  isValid = signal<boolean>(false);
  miningMode = signal<'single' | 'race'>('single'); // New: mining mode toggle
  selectedForkId = signal<string>('main'); // Selected fork to mine on
  showRewardTooltip = signal<boolean>(false);

  totalFees = computed(() =>
    this.blockchainService.calculateTotalFees(this.selectedTransactions()),
  );
  totalReward = computed(() =>
    this.blockchainService.calculateBlockReward(this.selectedTransactions()),
  );
  blockReward = computed(() => this.blockchainService.getBlockReward());
  isRacing = computed(() => this.miningService.isRacing());
  availableForks = computed(() => this.forkService.forks());

  // No constructor needed; using inject() for DI

  ngOnInit(): void {
    this.updateHash();
  }

  ngOnChanges(): void {
    this.updateHash();
  }

  updateHash(): void {
    const txs = this.selectedTransactions();
    const hash = this.blockchainService.calculateHash(
      this.blockNumber,
      this.nonce(),
      this.data(),
      this.previousHash,
      txs,
    );
    this.currentHash.set(hash);
    this.isValid.set(hash.startsWith('0'.repeat(this.difficulty)));
  }

  onNonceChange(value: string): void {
    this.nonce.set(parseInt(value) || 0);
    this.updateHash();
  }

  onDataChange(value: string): void {
    this.data.set(value);
    this.updateHash();
  }

  async mine(): Promise<void> {
    if (this.miningMode() === 'race') {
      await this.mineWithRace();
    } else {
      await this.mineSingle();
    }
  }

  async mineSingle(): Promise<void> {
    this.isMining.set(true);
    const txsToInclude = this.pendingTransactions.slice(0, 4);
    this.selectedTransactions.set(txsToInclude);

    let currentNonce = 0;
    let hash = '';
    const targetPrefix = '0'.repeat(this.difficulty);

    await new Promise<void>((resolve) => {
      const mineInBatches = () => {
        const batchSize = 10000;

        for (let i = 0; i < batchSize; i++) {
          hash = this.blockchainService.calculateHash(
            this.blockNumber,
            currentNonce,
            this.data(),
            this.previousHash,
            txsToInclude,
          );

          if (hash.startsWith(targetPrefix)) {
            this.nonce.set(currentNonce);
            this.currentHash.set(hash);
            this.isValid.set(true);

            setTimeout(() => {
              this.isMining.set(false);
              const block: Block = {
                number: this.blockNumber,
                nonce: currentNonce,
                data: this.data(),
                previousHash: this.previousHash,
                hash: hash,
                transactions: txsToInclude,
                minerAddress: this.minerAddress || this.blockchainService.getDefaultMinerAddress(),
                reward: this.blockchainService.calculateBlockReward(txsToInclude),
                timestamp: Date.now(),
              };

              // Add to selected fork or main chain
              if (this.selectedForkId() === 'main') {
                this.blockchainService.addBlockToChain(block);
              } else {
                this.forkService.addBlockToFork(this.selectedForkId(), block);
              }

              // Signal which fork received the new block
              this.forkService.miningForkId.set(this.selectedForkId());

              this.selectedTransactions.set([]);
              this.data.set('');
              this.nonce.set(0);
              resolve();
            }, 300);
            return;
          }
          currentNonce++;
        }

        this.nonce.set(currentNonce);
        this.updateHash();
        setTimeout(mineInBatches, 10);
      };

      mineInBatches();
    });
  }

  async mineWithRace(): Promise<void> {
    this.isMining.set(true);
    const txsToInclude = this.pendingTransactions.slice(0, 4);
    this.selectedTransactions.set(txsToInclude);

    try {
      const result = await this.miningService.startMiningRace(
        this.blockNumber,
        this.previousHash,
        this.difficulty,
        txsToInclude,
      );

      // Winner found!
      this.nonce.set(result.nonce);
      this.currentHash.set(result.hash);
      this.isValid.set(true);

      setTimeout(() => {
        this.isMining.set(false);
        const block: Block = {
          number: this.blockNumber,
          nonce: result.nonce,
          data: this.data(),
          previousHash: this.previousHash,
          hash: result.hash,
          transactions: txsToInclude,
          minerAddress: result.winner.address,
          reward: this.blockchainService.calculateBlockReward(txsToInclude),
          timestamp: result.timestamp,
        };

        // Add to selected fork or main chain
        if (this.selectedForkId() === 'main') {
          this.blockchainService.addBlockToChain(block);
        } else {
          this.forkService.addBlockToFork(this.selectedForkId(), block);
        }

        // Signal which fork received the new block
        this.forkService.miningForkId.set(this.selectedForkId());

        this.selectedTransactions.set([]);
        this.data.set('');
        this.nonce.set(0);
      }, 500);
    } catch (error) {
      console.error('Mining race error:', error);
      this.isMining.set(false);
    }
  }

  toggleMiningMode(): void {
    if (!this.isMining()) {
      this.miningMode.update((mode) => (mode === 'single' ? 'race' : 'single'));
    }
  }
}
