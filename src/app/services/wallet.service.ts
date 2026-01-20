import { Injectable, inject } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private blockchain = inject(Blockchain);

  getBalance(address: string): number {
    const chain = this.blockchain.activeChain();
    if (!chain) return 0;

    let balance = 0;

    for (const block of chain.chain) {
      if (block.minerAddress === address) {
        balance += block.reward;
      }

      for (const tx of block.transactions) {
        if (tx.sender === address) {
          balance -= tx.amount + tx.fee;
        }
        if (tx.receiver === address) {
          balance += tx.amount;
        }
      }
    }

    return balance;
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
    const addresses = new Set<string>();
    const chain = this.blockchain.activeChain();
    if (!chain) return [];

    for (const block of chain.chain) {
      addresses.add(block.minerAddress);
      for (const tx of block.transactions) {
        addresses.add(tx.sender);
        addresses.add(tx.receiver);
      }
    }

    return Array.from(addresses);
  }

  getActiveWallets(): Wallet[] {
    const addresses = this.getAllAddresses();
    const wallets: Wallet[] = [];

    for (const address of addresses) {
      const balance = this.getBalance(address);
      if (balance > 0) {
        wallets.push({ address, balance });
      }
    }

    return wallets.sort((a, b) => b.balance - a.balance);
  }
}
