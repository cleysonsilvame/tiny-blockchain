import { TestBed } from '@angular/core/testing';
import { Blockchain } from './blockchain';
import { Block, Transaction } from '../models/blockchain.model';

describe('Blockchain', () => {
  let service: Blockchain;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Blockchain);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with empty blockchain', () => {
      expect(service.blockchain()).toEqual([]);
    });

    it('should initialize with mock transactions in mempool', () => {
      expect(service.mempool().length).toBeGreaterThan(0);
    });

    it('should start with block number 1', () => {
      expect(service.currentBlockNumber()).toBe(1);
    });

    it('should start with genesis hash', () => {
      expect(service.previousHash()).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('should have prioritization enabled by default', () => {
      expect(service.prioritizeMempoolByFee()).toBe(true);
    });
  });

  describe('calculateHash', () => {
    it('should calculate SHA-256 hash correctly', () => {
      const transaction: Transaction = {
        id: '1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      const hash = service.calculateHash(1, 12345, 'test data', 'prevhash', [transaction]);

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different nonces', () => {
      const transaction: Transaction = {
        id: '1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      const hash1 = service.calculateHash(1, 1, 'data', 'prevhash', [transaction]);
      const hash2 = service.calculateHash(1, 2, 'data', 'prevhash', [transaction]);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same inputs', () => {
      const transaction: Transaction = {
        id: '1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      const hash1 = service.calculateHash(1, 100, 'data', 'prevhash', [transaction]);
      const hash2 = service.calculateHash(1, 100, 'data', 'prevhash', [transaction]);

      expect(hash1).toBe(hash2);
    });
  });

  describe('addBlockToChain', () => {
    it('should add block to chain', () => {
      const block: Block = {
        number: 1,
        nonce: 12345,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000abcd',
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      expect(service.blockchain().length).toBe(1);
      expect(service.blockchain()[0]).toEqual(block);
    });

    it('should update previousHash after adding block', () => {
      const block: Block = {
        number: 1,
        nonce: 12345,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000newblockhash',
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      expect(service.previousHash()).toBe('0000newblockhash');
    });

    it('should increment currentBlockNumber', () => {
      const initialBlockNumber = service.currentBlockNumber();
      const block: Block = {
        number: initialBlockNumber,
        nonce: 12345,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      expect(service.currentBlockNumber()).toBe(initialBlockNumber + 1);
    });

    it('should remove mined transactions from mempool', () => {
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      service.addTransaction(transaction);
      const initialMempoolSize = service.mempool().length;

      const block: Block = {
        number: 1,
        nonce: 12345,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      expect(service.mempool().length).toBe(initialMempoolSize - 1);
      expect(service.mempool().some((tx) => tx.id === 'tx1')).toBe(false);
    });
  });

  describe('addTransaction', () => {
    it('should add transaction to mempool', () => {
      const initialLength = service.mempool().length;
      const transaction: Transaction = {
        id: 'newtx',
        sender: 'Charlie',
        receiver: 'Dave',
        amount: 2.0,
        fee: 0.0002,
      };

      service.addTransaction(transaction);

      expect(service.mempool().length).toBe(initialLength + 1);
      expect(service.mempool().some((tx) => tx.id === 'newtx')).toBe(true);
    });

    it('should sort mempool by fee when prioritization is enabled', () => {
      // Clear mempool and disable prioritization first
      service['mempool'].set([]);
      service.prioritizeMempoolByFee.set(true);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0002 };

      service.addTransaction(tx1);
      service.addTransaction(tx2);
      service.addTransaction(tx3);

      const mempool = service.mempool();
      expect(mempool[0].fee).toBeGreaterThanOrEqual(mempool[1].fee);
      expect(mempool[1].fee).toBeGreaterThanOrEqual(mempool[2].fee);
    });
  });

  describe('toggleMempoolPrioritization', () => {
    it('should toggle prioritization flag', () => {
      const initialValue = service.prioritizeMempoolByFee();
      service.toggleMempoolPrioritization();
      expect(service.prioritizeMempoolByFee()).toBe(!initialValue);
    });

    it('should sort mempool when enabling prioritization', () => {
      service.prioritizeMempoolByFee.set(false);
      service['mempool'].set([]);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };

      service.addTransaction(tx1);
      service.addTransaction(tx2);

      service.toggleMempoolPrioritization(); // Enable

      const mempool = service.mempool();
      expect(mempool[0].id).toBe('tx2'); // Higher fee first
    });
  });

  describe('getPrioritizedTransactions', () => {
    it('should return requested number of transactions', () => {
      const transactions = service.getPrioritizedTransactions(3);
      expect(transactions.length).toBeLessThanOrEqual(3);
    });

    it('should return transactions sorted by fee when prioritization enabled', () => {
      service.prioritizeMempoolByFee.set(true);
      service['mempool'].set([]);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0002 };

      service.addTransaction(tx1);
      service.addTransaction(tx2);
      service.addTransaction(tx3);

      const prioritized = service.getPrioritizedTransactions(2);
      expect(prioritized[0].fee).toBeGreaterThanOrEqual(prioritized[1].fee);
    });
  });

  describe('calculateTotalFees', () => {
    it('should sum all transaction fees', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
        { id: 'tx2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
        { id: 'tx3', sender: 'E', receiver: 'F', amount: 3, fee: 0.0003 },
      ];

      const total = service.calculateTotalFees(transactions);
      expect(total).toBeCloseTo(0.0006, 10);
    });

    it('should return 0 for empty transaction list', () => {
      expect(service.calculateTotalFees([])).toBe(0);
    });
  });

  describe('calculateBlockReward', () => {
    it('should return base reward plus transaction fees', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
        { id: 'tx2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
      ];

      const reward = service.calculateBlockReward(transactions);
      expect(reward).toBeCloseTo(6.25 + 0.0003, 10);
    });

    it('should return base reward for block with no transactions', () => {
      const reward = service.calculateBlockReward([]);
      expect(reward).toBe(6.25);
    });
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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress,
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      expect(service.getBalance(minerAddress)).toBe(6.25);
    });

    it('should deduct amount and fee for sent transactions', () => {
      const senderAddress = 'sender123';

      // First give sender some balance
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: senderAddress,
        reward: 10,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

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
        previousHash: service.previousHash(),
        hash: '0000hash2',
        transactions: [transaction],
        minerAddress: 'otherminer',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block2);

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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block);

      expect(service.getBalance(receiverAddress)).toBe(5);
    });
  });

  describe('getAddressHistory', () => {
    it('should return empty array for unknown address', () => {
      const history = service.getAddressHistory('unknownaddress');
      expect(history).toEqual([]);
    });

    it('should include mining rewards in history', () => {
      const minerAddress = 'miner123';
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress,
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const history = service.getAddressHistory(minerAddress);
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('mining_reward');
      expect(history[0].amount).toBe(6.25);
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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block);

      const history = service.getAddressHistory(senderAddress);
      expect(history.some((h) => h.type === 'sent' && h.amount === 5)).toBe(true);
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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block);

      const history = service.getAddressHistory(receiverAddress);
      expect(history.some((h) => h.type === 'received' && h.amount === 5)).toBe(true);
    });

    it('should sort history by timestamp descending', () => {
      const address = 'address123';
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: 1000,
      };

      service.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: address,
        reward: 6.25,
        timestamp: 2000,
      };

      service.addBlockToChain(block2);

      const history = service.getAddressHistory(address);
      expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
    });
  });

  describe('getAllAddresses', () => {
    it('should return empty array for empty blockchain', () => {
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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

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
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [transaction1, transaction2],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const addresses = service.getAllAddresses();
      const aliceCount = addresses.filter((a) => a === 'alice').length;
      expect(aliceCount).toBe(1);
    });
  });

  describe('getActiveWallets', () => {
    it('should return only wallets with positive balance', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const wallets = service.getActiveWallets();
      expect(wallets.every((w) => w.balance > 0)).toBe(true);
    });

    it('should sort wallets by balance descending', () => {
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner1',
        reward: 10,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: 'miner2',
        reward: 5,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block2);

      const wallets = service.getActiveWallets();
      if (wallets.length > 1) {
        expect(wallets[0].balance).toBeGreaterThanOrEqual(wallets[1].balance);
      }
    });
  });

  describe('validateChain', () => {
    it('should return valid for empty blockchain', () => {
      const result = service.validateChain();
      expect(result.isValid).toBe(true);
      expect(result.invalidBlocks).toEqual([]);
    });

    it('should validate correct blockchain', () => {
      const blockNumber = service.currentBlockNumber();
      const prevHash = service.previousHash();

      // Mine a valid block
      let nonce = 0;
      let hash = '';
      const transactions: Transaction[] = [];
      const data = 'valid block';

      while (!hash.startsWith('0000')) {
        hash = service.calculateHash(blockNumber, nonce, data, prevHash, transactions);
        nonce++;
      }
      nonce--; // Adjust back to the valid nonce

      const block: Block = {
        number: blockNumber,
        nonce,
        data,
        previousHash: prevHash,
        hash,
        transactions,
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const result = service.validateChain();
      expect(result.isValid).toBe(true);
      expect(result.invalidBlocks).toEqual([]);
    });

    it('should detect tampered block', () => {
      const blockNumber = service.currentBlockNumber();
      const prevHash = service.previousHash();

      // Create a block with valid hash
      let nonce = 0;
      let hash = '';
      const transactions: Transaction[] = [];
      const data = 'original data';

      while (!hash.startsWith('0000')) {
        hash = service.calculateHash(blockNumber, nonce, data, prevHash, transactions);
        nonce++;
      }
      nonce--;

      const block: Block = {
        number: blockNumber,
        nonce,
        data,
        previousHash: prevHash,
        hash,
        transactions,
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      // Tamper the block
      service.tamperBlock(blockNumber, 'tampered data');

      const result = service.validateChain();
      expect(result.isValid).toBe(false);
      expect(result.invalidBlocks).toContain(blockNumber);
    });

    it('should verify hash meets difficulty requirement', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: 'invalid', // Does not start with 0000
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const result = service.validateChain();
      expect(result.isValid).toBe(false);
    });

    it('should verify previousHash chain', () => {
      // Add first valid block
      const blockNumber1 = service.currentBlockNumber();
      const prevHash1 = service.previousHash();
      let nonce1 = 0;
      let hash1 = '';

      while (!hash1.startsWith('0000')) {
        hash1 = service.calculateHash(blockNumber1, nonce1, 'data1', prevHash1, []);
        nonce1++;
      }
      nonce1--;

      const block1: Block = {
        number: blockNumber1,
        nonce: nonce1,
        data: 'data1',
        previousHash: prevHash1,
        hash: hash1,
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block1);

      // Add second block with wrong previousHash
      const block2: Block = {
        number: 2,
        nonce: 100,
        data: 'data2',
        previousHash: 'wronghash',
        hash: '0000fakehash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service['blockchain'].update((chain) => [...chain, block2]);

      const result = service.validateChain();
      expect(result.isValid).toBe(false);
      expect(result.invalidBlocks).toContain(2);
    });
  });

  describe('tamperBlock', () => {
    it('should change block data without recalculating hash', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'original',
        previousHash: service.previousHash(),
        hash: '0000originalhash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);
      service.tamperBlock(1, 'tampered');

      const tamperedBlock = service.blockchain()[0];
      expect(tamperedBlock.data).toBe('tampered');
      expect(tamperedBlock.hash).toBe('0000originalhash'); // Hash unchanged
    });

    it('should not modify block if block number not found', () => {
      const originalChain = service.blockchain();
      service.tamperBlock(999, 'new data');
      expect(service.blockchain()).toEqual(originalChain);
    });
  });

  describe('isBlockInvalid', () => {
    it('should return false for valid block', () => {
      expect(service.isBlockInvalid(1)).toBe(false);
    });

    it('should return true for invalid block after validation', () => {
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: 'invalid',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);
      service.validateChain();

      expect(service.isBlockInvalid(1)).toBe(true);
    });
  });

  describe('canMakeTransaction', () => {
    it('should return false if sender has insufficient balance', () => {
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'pooraddress',
        receiver: 'richaddress',
        amount: 100,
        fee: 0.1,
      };

      expect(service.canMakeTransaction(transaction)).toBe(false);
    });

    it('should return true if sender has sufficient balance', () => {
      const senderAddress = 'richaddress';

      // Give sender some balance
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: senderAddress,
        reward: 10,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      const transaction: Transaction = {
        id: 'tx1',
        sender: senderAddress,
        receiver: 'receiver',
        amount: 5,
        fee: 0.1,
      };

      expect(service.canMakeTransaction(transaction)).toBe(true);
    });

    it('should account for transaction fee in balance check', () => {
      const senderAddress = 'address123';

      // Give sender exactly 10 BTC
      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: service.previousHash(),
        hash: '0000hash',
        transactions: [],
        minerAddress: senderAddress,
        reward: 10,
        timestamp: Date.now(),
      };

      service.addBlockToChain(block);

      // Try to send 10 BTC with 0.1 fee (needs 10.1 total)
      const transaction: Transaction = {
        id: 'tx1',
        sender: senderAddress,
        receiver: 'receiver',
        amount: 10,
        fee: 0.1,
      };

      expect(service.canMakeTransaction(transaction)).toBe(false);
    });
  });

  describe('constants', () => {
    it('should return correct difficulty', () => {
      expect(service.getDifficulty()).toBe(4);
    });

    it('should return correct block reward', () => {
      expect(service.getBlockReward()).toBe(6.25);
    });

    it('should return default miner address', () => {
      expect(service.getDefaultMinerAddress()).toBeTruthy();
      expect(service.getDefaultMinerAddress().length).toBeGreaterThan(0);
    });
  });
});
