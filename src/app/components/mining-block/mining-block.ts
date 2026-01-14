import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Block } from '../../models/blockchain.model';
import { Blockchain } from '../../services/blockchain';
import { ForkService } from '../../services/fork.service';
import { MiningService } from '../../services/mining.service';
import { MiningRace } from '../mining-race/mining-race';

@Component({
  selector: 'app-mining-block',
  imports: [FormsModule, MiningRace],
  templateUrl: './mining-block.html',
  styleUrl: './mining-block.css',
  standalone: true,
})
export class MiningBlock {
  private blockchainService = inject(Blockchain);
  private miningService = inject(MiningService);
  private forkService = inject(ForkService);

  showRewardTooltip = signal<boolean>(false);

  get isMining() { return this.miningService.isMining(); }
  get miningMode() { return this.miningService.miningMode(); }
  get isValid() { return this.miningService.isValidHash(); }
  get nonce() { return this.miningService.nonce(); }
  get data() { return this.miningService.data(); }
  get currentHash() { return this.miningService.currentHash(); }
  get isRacing() { return this.miningService.isRacing(); }
  blockNumber = computed(() => {
    const activeForkId = this.forkService.activeForkId();
    const forks = this.forkService.forks();
    const activeFork = forks.find(f => f.id === activeForkId);
    return activeFork ? activeFork.chain.length : 0;
  });
  get previousHash() { return this.blockchainService.previousHash(); }
  get difficulty() { return this.blockchainService.getDifficulty(); }
  get pendingTransactions() { return this.blockchainService.mempool(); }
  get minerAddress() { return this.blockchainService.getDefaultMinerAddress(); }
  get blockReward() {
    return this.blockchainService.calculateBlockReward(this.miningService.selectedTransactions());
  }

  totalFees = computed(() =>
    this.blockchainService.calculateTotalFees(this.miningService.selectedTransactions()),
  );
  totalReward = computed(() =>
    this.blockchainService.calculateBlockReward(this.miningService.selectedTransactions()),
  );

  onNonceChange(value: string): void {
    this.miningService.nonce.set(parseInt(value) || 0);
  }

  onDataChange(value: string): void {
    this.miningService.data.set(value);
  }

  async mine(): Promise<void> {
    if (this.miningMode === 'race') {
      await this.mineWithRace();
    } else {
      await this.mineSingle();
    }
  }

  async mineSingle(): Promise<void> {
    const txsToInclude = this.blockchainService.mempool().slice(0, 4);

    try {
      const result = await this.miningService.mineSingle(
        this.blockchainService.currentBlockNumber(),
        this.blockchainService.previousHash(),
        this.blockchainService.getDifficulty(),
        txsToInclude,
        this.data,
      );

      // Create and add block after mining completes
      const block = this.createBlock(result, this.blockchainService.getDefaultMinerAddress());
      this.addBlockToChain(block);
    } catch (error) {
      console.error('Mining error:', error);
      this.miningService.isMining.set(false);
    }
  }

  async mineWithRace(): Promise<void> {
    const txsToInclude = this.blockchainService.mempool().slice(0, 4);
    this.miningService.selectedTransactions.set(txsToInclude);

    try {
      const result = await this.miningService.startMiningRace(
        this.blockchainService.currentBlockNumber(),
        this.blockchainService.previousHash(),
        this.blockchainService.getDifficulty(),
        txsToInclude,
      );

      // Create and add block after mining completes
      const block = this.createBlock(result, result.winner.address);
      this.addBlockToChain(block);
    } catch (error) {
      console.error('Mining race error:', error);
      this.miningService.isMining.set(false);
    }
  }

  toggleMiningMode(): void {
    if (!this.isMining) {
      this.miningService.toggleMiningMode();
    }
  }

  private createBlock(result: { nonce: number; hash: string; timestamp: number }, minerAddress: string): Block {
    return {
      number: this.blockNumber(),
      nonce: result.nonce,
      data: this.data,
      previousHash: this.previousHash,
      hash: result.hash,
      transactions: this.miningService.selectedTransactions(),
      minerAddress,
      reward: this.blockchainService.calculateBlockReward(this.miningService.selectedTransactions()),
      timestamp: result.timestamp,
    };
  }

  private addBlockToChain(block: Block): void {
    const targetForkId = this.forkService.activeForkId();
    if (targetForkId === 'main') {
      this.blockchainService.addBlockToChain(block);
    } else if (targetForkId) {
      this.forkService.addBlockToFork(targetForkId, block);
    }
  }
}
