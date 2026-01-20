import { TestBed } from '@angular/core/testing';
import { Blockchain } from './blockchain.service';
import { MempoolService } from './mempool.service';
import { Block, Transaction, Chain } from '../models/blockchain.model';

describe('Blockchain', () => {
  let service: Blockchain;
  let mempoolService: MempoolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Blockchain);
    mempoolService = TestBed.inject(MempoolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with main chain', () => {
      const chains = service.chains();
      expect(chains.length).toBe(1);
      expect(chains[0].id).toBe('main');
      expect(chains[0].isMainChain).toBe(true);
    });

    it('should initialize main chain as empty', () => {
      const mainChain = service.mainChain();
      expect(mainChain).toBeTruthy();
      expect(mainChain?.chain.length).toBe(0);
    });

    it('should set active chain to main by default', () => {
      expect(service.activeChainId()).toBe('main');
      const activeChain = service.activeChain();
      expect(activeChain?.id).toBe('main');
    });

    it('should start with block number 1', () => {
      expect(service.currentBlockNumber()).toBe(1);
    });

    it('should start with genesis hash', () => {
      expect(service.previousHash()).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('should initialize mock transactions in mempool', () => {
      expect(mempoolService.mempool().length).toBeGreaterThan(0);
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
    it('should add block to active chain', () => {
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

      const mainChain = service.mainChain();
      expect(mainChain?.chain.length).toBe(1);
      expect(mainChain?.chain[0]).toEqual(block);
    });

    it('should add block to specific chain', () => {
      // Add first block to main
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'block1',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

      // Create new chain
      const chainId = service.createChain(0, 'Test Chain');

      // Add block to new chain
      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'block2',
        previousHash: '0000hash1',
        hash: '0000hash2',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block2, chainId);

      const newChain = service.chains().find((c) => c.id === chainId);
      expect(newChain?.chain.length).toBe(2);
    });

    it('should remove mined transactions from mempool', () => {
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      mempoolService.addTransaction(transaction);
      const initialMempoolSize = mempoolService.mempool().length;

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

      expect(mempoolService.mempool().length).toBe(initialMempoolSize - 1);
      expect(mempoolService.mempool().some((tx) => tx.id === 'tx1')).toBe(false);
    });
  });

  describe('chain management', () => {
    it('should create new chain from fork point', () => {
      // Add blocks to main chain first
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'block1',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

      const initialChainCount = service.chains().length;
      const chainId = service.createChain(0, 'New Chain');

      expect(service.chains().length).toBe(initialChainCount + 1);
      const newChain = service.chains().find((c) => c.id === chainId);
      expect(newChain).toBeTruthy();
      expect(newChain?.name).toBe('New Chain');
      expect(newChain?.forkPoint).toBe(0);
    });

    it('should copy blocks up to fork point', () => {
      // Add two blocks to main
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'block1',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'block2',
        previousHash: service.previousHash(),
        hash: '0000hash2',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block2);

      const chainId = service.createChain(0, 'Fork Chain');
      const forkChain = service.chains().find((c) => c.id === chainId);

      expect(forkChain?.chain.length).toBe(1); // Fork point 0 means only first block
    });

    it('should throw error for invalid fork point', () => {
      expect(() => service.createChain(-1, 'Invalid')).toThrow('Invalid fork point');
      expect(() => service.createChain(999, 'Invalid')).toThrow('Invalid fork point');
    });

    it('should mark new chain as not main', () => {
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'block1',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

      const chainId = service.createChain(0, 'Fork Chain');
      const forkChain = service.chains().find((c) => c.id === chainId);

      expect(forkChain?.isMainChain).toBe(false);
    });
  });

  describe('longest chain consensus', () => {
    it('should mark longest chain as main', async () => {
      const block1: Block = {
        number: 1,
        nonce: 100,
        data: 'block1',
        previousHash: service.previousHash(),
        hash: '0000hash1',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block1);

      const forkId = service.createChain(0, 'Longer Chain');

      // Add two more blocks to fork
      const block2: Block = {
        number: 2,
        nonce: 200,
        data: 'block2',
        previousHash: '0000hash1',
        hash: '0000hash2',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block2, forkId);

      const block3: Block = {
        number: 3,
        nonce: 300,
        data: 'block3',
        previousHash: '0000hash2',
        hash: '0000hash3',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block3, forkId);

      // Wait for effect to run
      await new Promise(resolve => setTimeout(resolve, 100));

      const longerChain = service.chains().find((c) => c.id === forkId);
      expect(longerChain?.isMainChain).toBe(true);

      const originalMain = service.chains().find((c) => c.id === 'main');
      expect(originalMain?.isMainChain).toBe(false);
    });
  });

  describe('validateChain', () => {
    it('should return valid for empty chain', () => {
      const result = service.validateChain();
      expect(result.isValid).toBe(true);
      expect(result.invalidBlocks).toEqual([]);
    });

    it('should validate correct chain', () => {
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

      const mainChain = service.mainChain();
      const tamperedBlock = mainChain?.chain[0];
      expect(tamperedBlock?.data).toBe('tampered');
      expect(tamperedBlock?.hash).toBe('0000originalhash'); // Hash unchanged
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

      expect(service.isBlockInvalid(1)).toBe(true);
    });
  });

  describe('calculated rewards', () => {
    it('should calculate total fees from transactions', () => {
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

    it('should calculate block reward as base plus fees', () => {
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

  describe('computed properties', () => {
    it('should compute currentBlockNumber based on active chain', () => {
      expect(service.currentBlockNumber()).toBe(1);

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

      expect(service.currentBlockNumber()).toBe(2);
    });

    it('should compute previousHash based on active chain', () => {
      const genesisHash = service.previousHash();
      expect(genesisHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');

      const block: Block = {
        number: 1,
        nonce: 100,
        data: 'test',
        previousHash: genesisHash,
        hash: '0000newhash',
        transactions: [],
        minerAddress: 'miner',
        reward: 6.25,
        timestamp: Date.now(),
      };
      service.addBlockToChain(block);

      expect(service.previousHash()).toBe('0000newhash');
    });

    it('should find active chain by id', () => {
      const activeChain = service.activeChain();
      expect(activeChain?.id).toBe('main');

      // Add block and create fork
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

      const forkId = service.createChain(0, 'Fork');
      service.activeChainId.set(forkId);

      const newActiveChain = service.activeChain();
      expect(newActiveChain?.id).toBe(forkId);
    });

    it('should find main chain', () => {
      const mainChain = service.mainChain();
      expect(mainChain).toBeTruthy();
      expect(mainChain?.isMainChain).toBe(true);
    });
  });
});
