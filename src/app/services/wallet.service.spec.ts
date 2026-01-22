import { TestBed } from '@angular/core/testing';
import { WalletService } from './wallet.service';
import { Blockchain } from './blockchain.service';
import { MempoolService } from './mempool.service';
import { Block, Transaction } from '../models/blockchain.model';

describe('WalletService', () => {
  let service: WalletService;
  let blockchain: Blockchain;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletService);
    blockchain = TestBed.inject(Blockchain);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getBalance', () => {
    it('should return 0 for address with no transactions', () => {
      const balance = service.getBalance('unknownaddress');
      expect(balance).toBe(0);
    });

    it('should calculate balance from mining rewards', () => {
      const minerAddress = 'miner123';
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress,
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      expect(service.getBalance(minerAddress)).toBe(6.25);
    });

    it('should deduct amount and fee for sent transactions', () => {
      const senderAddress = 'sender123';

      // First give sender some balance
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: senderAddress,
        reward: 10,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block1);

      // Then sender sends transaction
      const transaction: Transaction = {
        id: 'tx1',
        sender: senderAddress,
        receiver: 'receiver123',
        amount: 5,
        fee: 0.1,
      };

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [transaction],
        minerAddress: 'otherminer',
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block2);

      expect(service.getBalance(senderAddress)).toBeCloseTo(10 - 5 - 0.1, 10);
    });

    it('should add amount for received transactions', () => {
      const receiverAddress = 'receiver123';
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'sender123',
        receiver: receiverAddress,
        amount: 5,
        fee: 0.1,
      };

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block);

      expect(service.getBalance(receiverAddress)).toBe(5);
    });

    it('should accumulate balance from multiple blocks', () => {
      const address = 'address123';

      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block2);

      expect(service.getBalance(address)).toBe(12.5);
    });

    it('should return 0 when no active chain', () => {
      blockchain.activeChainId.set('nonexistent');
      const balance = service.getBalance('anyaddress');
      expect(balance).toBe(0);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return empty array for unknown address', () => {
      const history = service.getTransactionHistory('unknownaddress');
      expect(history).toEqual([]);
    });

    it('should return empty array when no active chain', () => {
      blockchain.activeChainId.set('nonexistent');
      const history = service.getTransactionHistory('anyaddress');
      expect(history).toEqual([]);
    });

    it('should include mining rewards in history', () => {
      const minerAddress = 'miner123';
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress,
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      const history = service.getTransactionHistory(minerAddress);
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('mining_reward');
      expect(history[0].amount).toBe(6.25);
      expect(history[0].blockNumber).toBe(1);
    });

    it('should include sent transactions in history', () => {
      const senderAddress = 'sender123';
      const transaction: Transaction = {
        id: 'tx1',
        sender: senderAddress,
        receiver: 'receiver',
        amount: 5,
        fee: 0.1,
      };

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block);

      const history = service.getTransactionHistory(senderAddress);
      expect(history.some((h) => h.type === 'sent' && h.amount === 5)).toBe(true);
      const sentEntry = history.find((h) => h.type === 'sent');
      expect(sentEntry?.fee).toBe(0.1);
      expect(sentEntry?.counterparty).toBe('receiver');
    });

    it('should include received transactions in history', () => {
      const receiverAddress = 'receiver123';
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'sender',
        receiver: receiverAddress,
        amount: 5,
        fee: 0.1,
      };

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block);

      const history = service.getTransactionHistory(receiverAddress);
      expect(history.some((h) => h.type === 'received' && h.amount === 5)).toBe(true);
      const receivedEntry = history.find((h) => h.type === 'received');
      expect(receivedEntry?.counterparty).toBe('sender');
    });

    it('should sort history by timestamp descending', () => {
      const address = 'address123';
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: 1000,
      };

      blockchain.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: 2000,
      };

      blockchain.addBlockToChain(block2);

      const history = service.getTransactionHistory(address);
      expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
    });

    it('should include all transaction types for same address', () => {
      const address = 'address123';

      // Mining reward
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: 1000,
      };
      blockchain.addBlockToChain(block1);

      // Sent and received in same block
      const tx1: Transaction = {
        id: 'tx1',
        sender: address,
        receiver: 'other1',
        amount: 1,
        fee: 0.01,
      };

      const tx2: Transaction = {
        id: 'tx2',
        sender: 'other2',
        receiver: address,
        amount: 2,
        fee: 0.02,
      };

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [tx1, tx2],
        minerAddress: 'otherminer',
        reward: 6.25,
        timestamp: 2000,
      };
      blockchain.addBlockToChain(block2);

      const history = service.getTransactionHistory(address);
      expect(history.length).toBe(3); // 1 mining_reward, 1 sent, 1 received
      expect(history.some((h) => h.type === 'mining_reward')).toBe(true);
      expect(history.some((h) => h.type === 'sent')).toBe(true);
      expect(history.some((h) => h.type === 'received')).toBe(true);
    });
  });

  describe('getAllAddresses', () => {
    it('should return empty array for empty blockchain', () => {
      expect(service.getAllAddresses()).toEqual([]);
    });

    it('should return empty array when no active chain', () => {
      blockchain.activeChainId.set('nonexistent');
      expect(service.getAllAddresses()).toEqual([]);
    });

    it('should return unique addresses from blockchain', () => {
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'alice',
        receiver: 'bob',
        amount: 1,
        fee: 0.1,
      };

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      const addresses = service.getAllAddresses();
      expect(addresses).toContain('alice');
      expect(addresses).toContain('bob');
      expect(addresses).toContain('miner');
    });

    it('should not duplicate addresses', () => {
      const transaction1: Transaction = {
        id: 'tx1',
        sender: 'alice',
        receiver: 'bob',
        amount: 1,
        fee: 0.1,
      };
      const transaction2: Transaction = {
        id: 'tx2',
        sender: 'alice',
        receiver: 'charlie',
        amount: 1,
        fee: 0.1,
      };

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [transaction1, transaction2],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      const addresses = service.getAllAddresses();
      const aliceCount = addresses.filter((a) => a === 'alice').length;
      expect(aliceCount).toBe(1);
    });
  });

  describe('getActiveWallets', () => {
    it('should return empty array for empty blockchain', () => {
      const wallets = service.getActiveWallets();
      expect(wallets).toEqual([]);
    });

    it('should return only wallets with positive balance', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      const wallets = service.getActiveWallets();
      expect(wallets.every((w) => w.balance > 0)).toBe(true);
    });

    it('should sort wallets by balance descending', () => {
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner1',
        reward: 10,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: 'miner2',
        reward: 5,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block2);

      const wallets = service.getActiveWallets();
      if (wallets.length > 1) {
        expect(wallets[0].balance).toBeGreaterThanOrEqual(wallets[1].balance);
      }
    });

    it('should return wallet with address and balance', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      const wallets = service.getActiveWallets();
      expect(wallets.length).toBe(1);
      expect(wallets[0]).toHaveProperty('address');
      expect(wallets[0]).toHaveProperty('balance');
      expect(wallets[0].address).toBe('miner');
      expect(wallets[0].balance).toBe(6.25);
    });

    it('should exclude wallets that spent all their balance', () => {
      const senderAddress = 'sender';
      const receiverAddress = 'receiver';

      // Give sender some balance
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: senderAddress,
        reward: 10,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block1);

      // Sender sends all balance (minus fee)
      const tx: Transaction = {
        id: 'tx1',
        sender: senderAddress,
        receiver: receiverAddress,
        amount: 9.9,
        fee: 0.1,
      };

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: blockchain.previousHash(),
        hash: '0000hash2',
        transactions: [tx],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      blockchain.addBlockToChain(block2);

      const wallets = service.getActiveWallets();
      expect(wallets.some((w) => w.address === senderAddress)).toBe(false);
      expect(wallets.some((w) => w.address === receiverAddress)).toBe(true);
    });
  });
});
