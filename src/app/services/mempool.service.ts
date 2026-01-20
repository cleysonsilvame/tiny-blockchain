import { Injectable, signal } from '@angular/core';
import { Transaction } from '../models/blockchain.model';

interface Wallet {
  address: string;
  balance: number;
}

@Injectable({
  providedIn: 'root',
})
export class MempoolService {
  mempool = signal<Transaction[]>([]);
  prioritizeMempoolByFee = signal<boolean>(true);

  addTransaction(transaction: Transaction): void {
    this.mempool.update((pool) => {
      const newPool = [...pool, transaction];
      return this.prioritizeMempoolByFee() ? this.sortByFee(newPool) : newPool;
    });
  }

  removeTransactions(txIds: string[]): void {
    const idsSet = new Set(txIds);
    this.mempool.update((pool) => pool.filter((tx) => !idsSet.has(tx.id)));
  }

  canMakeTransaction(transaction: Transaction, getBalance: (address: string) => number): boolean {
    const balance = getBalance(transaction.sender);
    const requiredAmount = transaction.amount + transaction.fee;
    return balance >= requiredAmount;
  }

  togglePrioritization(): void {
    this.prioritizeMempoolByFee.update((enabled) => !enabled);

    if (this.prioritizeMempoolByFee()) {
      this.mempool.update((pool) => this.sortByFee(pool));
    }
  }

  getPrioritizedTransactions(count: number): Transaction[] {
    const pool = this.mempool();
    return this.prioritizeMempoolByFee()
      ? this.sortByFee(pool).slice(0, count)
      : pool.slice(0, count);
  }

  private sortByFee(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) => b.fee - a.fee);
  }

  // Transaction generation utilities
  generateRandomAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const prefixes = ['1', '3', 'bc1q'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let address = prefix;
    const length = prefix === 'bc1q' ? 38 : 30;
    for (let i = prefix.length; i < length; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
  }

  selectRealisticSender(activeWallets: Wallet[]): string {
    if (activeWallets.length === 0) {
      return this.generateRandomAddress();
    }

    // 80% chance de usar carteira ativa, 20% novo endereço
    if (Math.random() < 0.8) {
      const wallet = activeWallets[Math.floor(Math.random() * activeWallets.length)];
      return wallet.address;
    }

    return this.generateRandomAddress();
  }

  selectRealisticReceiver(excludeSender: string, allAddresses: string[]): string {
    const otherAddresses = allAddresses.filter((addr) => addr !== excludeSender);

    // Se há outros endereços, prefere um deles (60%)
    if (otherAddresses.length > 0 && Math.random() < 0.6) {
      return otherAddresses[Math.floor(Math.random() * otherAddresses.length)];
    }

    return this.generateRandomAddress();
  }

  generateRealisticTransaction(
    activeWallets: Wallet[],
    allAddresses: string[],
    getBalance: (address: string) => number,
  ): Transaction | null {
    const sender = this.selectRealisticSender(activeWallets);
    const receiver = this.selectRealisticReceiver(sender, allAddresses);
    const amount = parseFloat((Math.random() * 5).toFixed(3));
    const fee = parseFloat((Math.random() * 0.001).toFixed(6));

    const tx: Transaction = {
      id: `auto-${Date.now()}-${Math.random()}`,
      sender,
      receiver,
      amount,
      fee,
    };

    // Valida se sender tem fundos suficientes
    if (!this.canMakeTransaction(tx, getBalance)) {
      return null;
    }

    return tx;
  }

  generateRandomTransaction(): Transaction {
    const sender = this.generateRandomAddress();
    const receiver = this.generateRandomAddress();
    const amount = parseFloat((Math.random() * 5).toFixed(3));
    const fee = parseFloat((Math.random() * 0.001).toFixed(6));

    return {
      id: `auto-${Date.now()}-${Math.random()}`,
      sender,
      receiver,
      amount,
      fee,
    };
  }

  initializeMockTransactions(): void {
    const seedWallets = [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
      '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    ];

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        sender: seedWallets[0],
        receiver: seedWallets[1],
        amount: 0.5,
        fee: 0.0001,
      },
      {
        id: '2',
        sender: seedWallets[1],
        receiver: seedWallets[2],
        amount: 1.2,
        fee: 0.0002,
      },
      {
        id: '3',
        sender: seedWallets[2],
        receiver: seedWallets[3],
        amount: 0.025,
        fee: 0.00005,
      },
      {
        id: '4',
        sender: seedWallets[3],
        receiver: seedWallets[0],
        amount: 2.5,
        fee: 0.0003,
      },
      {
        id: '5',
        sender: seedWallets[0],
        receiver: seedWallets[2],
        amount: 0.75,
        fee: 0.00015,
      },
      {
        id: '6',
        sender: seedWallets[1],
        receiver: seedWallets[3],
        amount: 0.1,
        fee: 0.00005,
      },
      {
        id: '7',
        sender: seedWallets[3],
        receiver: seedWallets[1],
        amount: 3.0,
        fee: 0.00025,
      },
      {
        id: '8',
        sender: seedWallets[2],
        receiver: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
        amount: 0.5,
        fee: 0.0001,
      },
    ];

    this.mempool.set(mockTransactions);
  }
}
