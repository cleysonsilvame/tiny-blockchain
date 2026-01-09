import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Blockchain } from '../../services/blockchain';
import { MiningService } from '../../services/mining.service';

interface MinerStats {
  name: string;
  address: string;
  color: string;
  blocksMined: number;
  totalRewards: number;
  percentage: number;
}

@Component({
  selector: 'app-stats-dashboard',
  imports: [CommonModule],
  templateUrl: './stats-dashboard.html',
  styleUrl: './stats-dashboard.css',
})
export class StatsDashboard {
  blocks = computed(() => this.blockchain.blockchain());
  miners = computed(() => this.miningService.miners());

  // Total de blocos na cadeia
  totalBlocks = computed(() => this.blocks().length);

  // Total de BTC em circulação (recompensas mineradas)
  totalBTC = computed(() => {
    return this.blocks().reduce((sum, block) => sum + block.reward, 0);
  });

  // Tempo médio entre blocos (em segundos)
  averageBlockTime = computed(() => {
    const blocks = this.blocks();
    if (blocks.length < 2) return 0;

    const timestamps = blocks.map(b => b.timestamp);
    const differences = [];

    for (let i = 1; i < timestamps.length; i++) {
      differences.push(timestamps[i] - timestamps[i - 1]);
    }

    const avg = differences.reduce((a, b) => a + b, 0) / differences.length;
    return Math.round(avg / 1000); // Convert to seconds
  });

  // Estatísticas por minerador
  minerStats = computed(() => {
    const blocks = this.blocks();
    const miners = this.miners();
    const defaultMinerAddress = this.blockchain.getDefaultMinerAddress();
    const stats: MinerStats[] = [];

    // Add solo miner stats (default miner address)
    const soloBlocks = blocks.filter(b => b.minerAddress === defaultMinerAddress);
    if (soloBlocks.length > 0) {
      const totalRewards = soloBlocks.reduce((sum, b) => sum + b.reward, 0);
      stats.push({
        name: 'Solo',
        address: defaultMinerAddress,
        color: '#6366f1', // indigo
        blocksMined: soloBlocks.length,
        totalRewards,
        percentage: blocks.length > 0 ? (soloBlocks.length / blocks.length) * 100 : 0
      });
    }

    // Add competition miners stats
    miners.forEach(miner => {
      const minerBlocks = blocks.filter(b => b.minerAddress === miner.address);
      const totalRewards = minerBlocks.reduce((sum, b) => sum + b.reward, 0);

      if (minerBlocks.length > 0) {
        stats.push({
          name: miner.name,
          address: miner.address,
          color: miner.color,
          blocksMined: minerBlocks.length,
          totalRewards,
          percentage: blocks.length > 0 ? (minerBlocks.length / blocks.length) * 100 : 0
        });
      }
    });

    // Sort by blocks mined descending
    return stats.sort((a, b) => b.blocksMined - a.blocksMined);
  });

  // Hashrate aproximado da rede (baseado no último bloco)
  networkHashrate = computed(() => {
    const miners = this.miners().filter(m => m.isActive);
    return miners.reduce((sum, m) => sum + m.hashRate, 0);
  });

  // Total de transações processadas
  totalTransactions = computed(() => {
    return this.blocks().reduce((sum, block) => sum + block.transactions.length, 0);
  });

  // Total de taxas coletadas
  totalFees = computed(() => {
    let total = 0;
    this.blocks().forEach(block => {
      block.transactions.forEach(tx => {
        total += tx.fee;
      });
    });
    return total;
  });

  constructor(
    private blockchain: Blockchain,
    private miningService: MiningService
  ) {}

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatBTC(amount: number): string {
    return amount.toFixed(4);
  }
}
