import { Component, inject } from '@angular/core';

import { MiningProgress } from '../../models/miner.model';
import { MiningService } from '../../services/mining.service';

@Component({
  selector: 'app-mining-race',
  imports: [],
  templateUrl: './mining-race.html',
  styleUrl: './mining-race.css',
})
export class MiningRace {
  miningService = inject(MiningService);

  toggleMiner(minerId: string): void {
    this.miningService.toggleMiner(minerId);
  }

  getMinerProgress(minerId: string): MiningProgress | undefined {
    return this.miningService.miningProgress().get(minerId);
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
