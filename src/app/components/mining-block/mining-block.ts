import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Blockchain } from '../../services/blockchain.service';
import { MempoolService } from '../../services/mempool.service';
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
  blockchainService = inject(Blockchain);
  mempoolService = inject(MempoolService);
  miningService = inject(MiningService);

  showRewardTooltip = signal<boolean>(false);

  blockNumber = computed(() => this.blockchainService.currentBlockNumber());
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
    if (this.miningService.miningMode() === 'race') {
      await this.mineWithRace();
    } else {
      await this.mineSingle();
    }
  }

  async mineSingle(): Promise<void> {
    const txsToInclude = this.mempoolService.getPrioritizedTransactions(4);

    try {
      const result = await this.miningService.mineSingle(
        this.blockchainService.currentBlockNumber(),
        this.blockchainService.previousHash(),
        this.blockchainService.getDifficulty(),
        txsToInclude,
        this.miningService.data(),
      );

      this.blockchainService.mineAndAddBlock(
        result.nonce,
        result.hash,
        this.miningService.data(),
        txsToInclude,
        this.blockchainService.getDefaultMinerAddress(),
        result.timestamp,
      );
    } catch (error) {
      console.error('Mining error:', error);
      this.miningService.isMining.set(false);
    }
  }

  async mineWithRace(): Promise<void> {
    const txsToInclude = this.mempoolService.getPrioritizedTransactions(4);
    this.miningService.selectedTransactions.set(txsToInclude);

    try {
      const result = await this.miningService.startMiningRace(
        this.blockchainService.currentBlockNumber(),
        this.blockchainService.previousHash(),
        this.blockchainService.getDifficulty(),
        txsToInclude,
      );

      this.blockchainService.mineAndAddBlock(
        result.nonce,
        result.hash,
        this.miningService.data(),
        txsToInclude,
        result.winner.address,
        result.timestamp,
      );
    } catch (error) {
      console.error('Mining race error:', error);
      this.miningService.isMining.set(false);
    }
  }

  toggleMiningMode(): void {
    if (!this.miningService.isMining()) {
      this.miningService.toggleMiningMode();
    }
  }
}
