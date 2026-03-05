import { Injectable, inject, computed } from '@angular/core';
import { Blockchain } from './blockchain.service';

export interface Wallet {
  address: string;
  balance: number;
}

export interface TransactionHistoryEntry {
  blockNumber: number;
  type: 'sent' | 'received' | 'mining_reward';
  amount: number;
  fee?: number;
  counterparty?: string;
  timestamp: number;
}

type WalletBalances = Record<string, number>;

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private blockchain = inject(Blockchain);

  private balancesCache = computed<WalletBalances>(() => {
    const chain = this.blockchain.activeChain();
    if (!chain) return {};

    const balances: WalletBalances = {};

    for (const block of chain.chain) {
      if (!balances[block.minerAddress]) {
        balances[block.minerAddress] = 0;
      }
      balances[block.minerAddress] += block.reward;

      for (const tx of block.transactions) {
        if (!balances[tx.sender]) {
          balances[tx.sender] = 0;
        }
        if (!balances[tx.receiver]) {
          balances[tx.receiver] = 0;
        }

        balances[tx.sender] -= tx.amount + tx.fee;
        balances[tx.receiver] += tx.amount;
      }
    }

    return balances;
  });

  allAddresses = computed(() => {
    return Object.keys(this.balancesCache());
  });

  activeWallets = computed<Wallet[]>(() => {
    const balances = this.balancesCache();
    const wallets: Wallet[] = [];

    for (const address in balances) {
      const balance = balances[address];
      if (balance > 0) {
        wallets.push({ address, balance });
      }
    }

    return wallets.sort((a, b) => b.balance - a.balance);
  });

  getBalance(address: string): number {
    return this.balancesCache()[address] || 0;
  }

  getTransactionHistory(address: string): TransactionHistoryEntry[] {
    const history: TransactionHistoryEntry[] = [];
    const chain = this.blockchain.activeChain();
    if (!chain) return history;

    for (const block of chain.chain) {
      if (block.minerAddress === address) {
        history.push({
          blockNumber: block.number,
          type: 'mining_reward',
          amount: block.reward,
          timestamp: block.timestamp,
        });
      }

      for (const tx of block.transactions) {
        if (tx.sender === address) {
          history.push({
            blockNumber: block.number,
            type: 'sent',
            amount: tx.amount,
            fee: tx.fee,
            counterparty: tx.receiver,
            timestamp: block.timestamp,
          });
        }
        if (tx.receiver === address) {
          history.push({
            blockNumber: block.number,
            type: 'received',
            amount: tx.amount,
            counterparty: tx.sender,
            timestamp: block.timestamp,
          });
        }
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllAddresses(): string[] {
    return this.allAddresses();
  }

  getActiveWallets(): Wallet[] {
    return this.activeWallets();
  }
}
