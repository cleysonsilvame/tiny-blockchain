import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MiningService } from '../../services/mining.service';
import { Miner, MiningProgress } from '../../models/miner.model';

@Component({
  selector: 'app-mining-race',
  imports: [CommonModule],
  templateUrl: './mining-race.html',
  styleUrl: './mining-race.css',
})
export class MiningRace {
  miners = computed(() => this.miningService.miners());
  miningProgress = computed(() => this.miningService.miningProgress());
  isRacing = computed(() => this.miningService.isRacing());
  lastWinner = computed(() => this.miningService.lastWinner());

  constructor(public miningService: MiningService) {}

  toggleMiner(minerId: string): void {
    this.miningService.toggleMiner(minerId);
  }

  getMinerProgress(minerId: string): MiningProgress | undefined {
    return this.miningProgress().get(minerId);
  }

  formatHash(hash: string): string {
    if (!hash) return '';
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getProgressPercentage(attempts: number): number {
    // Visual progress based on attempts (just for UI feedback)
    const maxAttempts = 100000;
    return Math.min((attempts / maxAttempts) * 100, 100);
  }
}
