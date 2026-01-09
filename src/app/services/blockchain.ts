import { Injectable, signal } from '@angular/core';
import { Block, Transaction } from '../models/blockchain.model';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class Blockchain {
  private readonly GENESIS_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000';
  private readonly DIFFICULTY = 4;
  private readonly BLOCK_REWARD = 6.25; // Recompensa base por bloco em BTC
  private readonly DEFAULT_MINER_ADDRESS = '1MinerDefaultAddress123456789ABC'; // Endereço padrão

  blockchain = signal<Block[]>([]);
  mempool = signal<Transaction[]>([]);
  currentBlockNumber = signal<number>(1);
  previousHash = signal<string>(this.GENESIS_HASH);
  invalidBlocks = signal<Set<number>>(new Set()); // Track invalid block numbers
  prioritizeMempoolByFee = signal<boolean>(true); // Sort mempool by fee

  constructor() {
    // Initialize with mock transactions
    this.initializeMockTransactions();
  }

  private initializeMockTransactions(): void {
    // Define um pequeno conjunto de carteiras "seed" que irão interagir
    const seedWallets = [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
      '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    ];

    const mockTransactions: Transaction[] = [
      // Transações circulares entre as carteiras seed (mais realistas)
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
      // Transações adicionais criando mais fluxo entre existentes
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
      // Uma transação para um novo endereço
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

  calculateHash(
    blockNum: number,
    nonce: number,
    data: string,
    prevHash: string,
    transactions: Transaction[],
  ): string {
    const txData = transactions.map((tx) => `${tx.sender}${tx.receiver}${tx.amount}`).join('');
    return CryptoJS.SHA256(`${blockNum}${nonce}${data}${prevHash}${txData}`).toString();
  }

  addBlockToChain(block: Block): void {
    this.blockchain.update((chain) => [...chain, block]);
    this.previousHash.set(block.hash);
    this.currentBlockNumber.update((n) => n + 1);

    // Remove transactions from mempool
    this.mempool.update((pool) =>
      pool.filter((tx) => !block.transactions.some((blockTx) => blockTx.id === tx.id)),
    );
  }

  addTransaction(transaction: Transaction): void {
    this.mempool.update((pool) => {
      const newPool = [...pool, transaction];
      return this.prioritizeMempoolByFee() ? this.sortMempoolByFee(newPool) : newPool;
    });
  }

  // Valida se uma transação pode ser realizada (sender tem fundos suficientes)
  canMakeTransaction(transaction: Transaction): boolean {
    const balance = this.getBalance(transaction.sender);
    const requiredAmount = transaction.amount + transaction.fee;
    return balance >= requiredAmount;
  }

  private sortMempoolByFee(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) => b.fee - a.fee); // Highest fee first
  }

  toggleMempoolPrioritization(): void {
    this.prioritizeMempoolByFee.update((enabled) => !enabled);

    // Re-sort mempool if enabling prioritization
    if (this.prioritizeMempoolByFee()) {
      this.mempool.update((pool) => this.sortMempoolByFee(pool));
    }
  }

  getPrioritizedTransactions(count: number): Transaction[] {
    const pool = this.mempool();
    return this.prioritizeMempoolByFee()
      ? this.sortMempoolByFee(pool).slice(0, count)
      : pool.slice(0, count);
  }

  getDifficulty(): number {
    return this.DIFFICULTY;
  }

  getBlockReward(): number {
    return this.BLOCK_REWARD;
  }

  getDefaultMinerAddress(): string {
    return this.DEFAULT_MINER_ADDRESS;
  }

  calculateTotalFees(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => sum + tx.fee, 0);
  }

  calculateBlockReward(transactions: Transaction[]): number {
    return this.BLOCK_REWARD + this.calculateTotalFees(transactions);
  }

  // Calcula saldo de um endereço baseado na blockchain
  getBalance(address: string): number {
    let balance = 0;
    const chain = this.blockchain();

    for (const block of chain) {
      // Recompensa de mineração
      if (block.minerAddress === address) {
        balance += block.reward;
      }

      // Transações
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

  // Obtém histórico de transações de um endereço
  getAddressHistory(address: string): {
    blockNumber: number;
    type: 'sent' | 'received' | 'mining_reward';
    amount: number;
    fee?: number;
    counterparty?: string;
    timestamp: number;
  }[] {
    const history: {
      blockNumber: number;
      type: 'sent' | 'received' | 'mining_reward';
      amount: number;
      fee?: number;
      counterparty?: string;
      timestamp: number;
    }[] = [];
    const chain = this.blockchain();

    for (const block of chain) {
      // Recompensa de mineração
      if (block.minerAddress === address) {
        history.push({
          blockNumber: block.number,
          type: 'mining_reward',
          amount: block.reward,
          timestamp: block.timestamp,
        });
      }

      // Transações
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

  // Obtém todos os endereços únicos na blockchain
  getAllAddresses(): string[] {
    const addresses = new Set<string>();
    const chain = this.blockchain();

    for (const block of chain) {
      addresses.add(block.minerAddress);
      for (const tx of block.transactions) {
        addresses.add(tx.sender);
        addresses.add(tx.receiver);
      }
    }

    return Array.from(addresses);
  }

  // Obtém carteiras ativas com saldo positivo
  getActiveWallets(): { address: string; balance: number }[] {
    const addresses = this.getAllAddresses();
    const wallets = addresses
      .map((address) => ({
        address,
        balance: this.getBalance(address),
      }))
      .filter((w) => w.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    return wallets;
  }

  // Valida toda a blockchain
  validateChain(): { isValid: boolean; invalidBlocks: number[] } {
    const chain = this.blockchain();
    const invalidBlockNumbers: number[] = [];

    if (chain.length === 0) {
      return { isValid: true, invalidBlocks: [] };
    }

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      let isBlockValid = true;

      // 1. Verify block hash matches content
      const calculatedHash = this.calculateHash(
        block.number,
        block.nonce,
        block.data,
        block.previousHash,
        block.transactions,
      );

      if (calculatedHash !== block.hash) {
        isBlockValid = false;
      }

      // 2. Verify hash meets difficulty requirement
      const targetPrefix = '0'.repeat(this.DIFFICULTY);
      if (!block.hash.startsWith(targetPrefix)) {
        isBlockValid = false;
      }

      // 3. Verify previousHash chain (except for first block)
      if (i > 0) {
        const prevBlock = chain[i - 1];
        if (block.previousHash !== prevBlock.hash) {
          isBlockValid = false;
        }
      } else {
        // First block should have genesis hash
        if (block.previousHash !== this.GENESIS_HASH) {
          isBlockValid = false;
        }
      }

      // 4. Verify block number sequence
      if (block.number !== i + 1) {
        isBlockValid = false;
      }

      if (!isBlockValid) {
        invalidBlockNumbers.push(block.number);
      }
    }

    // Update the invalid blocks signal
    this.invalidBlocks.set(new Set(invalidBlockNumbers));

    return {
      isValid: invalidBlockNumbers.length === 0,
      invalidBlocks: invalidBlockNumbers,
    };
  }

  // Permite editar um bloco existente (para demonstrar quebra de integridade)
  tamperBlock(blockNumber: number, newData: string): void {
    this.blockchain.update((chain) => {
      const blockIndex = chain.findIndex((b) => b.number === blockNumber);
      if (blockIndex !== -1) {
        const block = { ...chain[blockIndex] };
        block.data = newData;
        // Não recalcula o hash - isso quebra a integridade!
        const newChain = [...chain];
        newChain[blockIndex] = block;
        return newChain;
      }
      return chain;
    });
  }

  isBlockInvalid(blockNumber: number): boolean {
    return this.invalidBlocks().has(blockNumber);
  }
}
