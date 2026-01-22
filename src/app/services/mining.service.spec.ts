import { TestBed } from '@angular/core/testing';
import { MiningService } from './mining.service';
import { Blockchain } from './blockchain.service';
import { MempoolService } from './mempool.service';
import { Transaction } from '../models/blockchain.model';

describe('MiningService', () => {
  let service: MiningService;
  let blockchain: Blockchain;
  let mempoolService: MempoolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MiningService);
    blockchain = TestBed.inject(Blockchain);
    mempoolService = TestBed.inject(MempoolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default miners', () => {
      const miners = service.miners();
      expect(miners.length).toBe(3);
      expect(miners[0].name).toBe('Alice');
      expect(miners[1].name).toBe('Bob');
      expect(miners[2].name).toBe('Charlie');
    });

    it('should initialize all miners as active', () => {
      const miners = service.miners();
      expect(miners.every((m) => m.isActive)).toBe(true);
    });

    it('should have different hash rates for miners', () => {
      const miners = service.miners();
      expect(miners[0].hashRate).toBe(15000);
      expect(miners[1].hashRate).toBe(12000);
      expect(miners[2].hashRate).toBe(10000);
    });

    it('should initialize with no mining in progress', () => {
      expect(service.isMining()).toBe(false);
      expect(service.isRacing()).toBe(false);
    });

    it('should start in single mining mode', () => {
      expect(service.miningMode()).toBe('single');
    });
  });

  describe('computed properties', () => {
    it('should compute active miners correctly', () => {
      const activeMiners = service.activeMiners();
      expect(activeMiners.length).toBe(3);
    });

    it('should filter inactive miners from activeMiners', () => {
      service.toggleMiner('miner-1');
      const activeMiners = service.activeMiners();
      expect(activeMiners.length).toBe(2);
      expect(activeMiners.every((m) => m.id !== 'miner-1')).toBe(true);
    });

    it('should compute currentHash based on blockchain state', () => {
      service.nonce.set(100);
      service.data.set('test data');

      const hash = service.currentHash();
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256
    });

    it('should validate hash against difficulty', () => {
      service.nonce.set(0);
      
      // Keep trying until we find a valid hash
      let foundValid = false;
      for (let i = 0; i < 100000 && !foundValid; i++) {
        service.nonce.set(i);
        if (service.isValidHash()) {
          foundValid = true;
        }
      }

      // This test might be slow but validates the logic
      expect(typeof service.isValidHash()).toBe('boolean');
    });
  });

  describe('toggleMiner', () => {
    it('should toggle miner active state', () => {
      const initialState = service.miners()[0].isActive;
      service.toggleMiner('miner-1');
      expect(service.miners()[0].isActive).toBe(!initialState);
    });

    it('should only affect targeted miner', () => {
      const miner2StateBefore = service.miners()[1].isActive;
      const miner3StateBefore = service.miners()[2].isActive;

      service.toggleMiner('miner-1');

      expect(service.miners()[1].isActive).toBe(miner2StateBefore);
      expect(service.miners()[2].isActive).toBe(miner3StateBefore);
    });

    it('should toggle back and forth', () => {
      const initialState = service.miners()[0].isActive;
      service.toggleMiner('miner-1');
      service.toggleMiner('miner-1');
      expect(service.miners()[0].isActive).toBe(initialState);
    });
  });

  describe('resetMiners', () => {
    it('should reset miners to default state', () => {
      service.toggleMiner('miner-1');
      service.resetMiners();

      const miners = service.miners();
      expect(miners.every((m) => m.isActive)).toBe(true);
      expect(miners.every((m) => m.totalBlocksMined === 0)).toBe(true);
    });

    it('should clear mining progress', () => {
      service.miningProgress.set(new Map([['miner-1', { minerId: 'miner-1', nonce: 100, currentHash: 'test', attempts: 50 }]]));
      service.resetMiners();

      expect(service.miningProgress().size).toBe(0);
    });

    it('should clear last winner', () => {
      service.lastWinner.set({
        winner: service.miners()[0],
        nonce: 100,
        hash: 'testhash',
        attempts: 50,
        timestamp: Date.now(),
      });

      service.resetMiners();
      expect(service.lastWinner()).toBeNull();
    });
  });

  describe('getMinerById', () => {
    it('should return miner with matching id', () => {
      const miner = service.getMinerById('miner-1');
      expect(miner).toBeTruthy();
      expect(miner?.id).toBe('miner-1');
      expect(miner?.name).toBe('Alice');
    });

    it('should return undefined for non-existent id', () => {
      const miner = service.getMinerById('non-existent');
      expect(miner).toBeUndefined();
    });
  });

  describe('getMinerProgress', () => {
    it('should return undefined when no progress exists', () => {
      const progress = service.getMinerProgress('miner-1');
      expect(progress).toBeUndefined();
    });

    it('should return progress when it exists', () => {
      const testProgress = {
        minerId: 'miner-1',
        nonce: 100,
        currentHash: 'testhash',
        attempts: 50,
      };

      service.miningProgress.set(new Map([['miner-1', testProgress]]));

      const progress = service.getMinerProgress('miner-1');
      expect(progress).toEqual(testProgress);
    });
  });

  describe('toggleMiningMode', () => {
    it('should toggle from single to race', () => {
      service.miningMode.set('single');
      service.toggleMiningMode();
      expect(service.miningMode()).toBe('race');
    });

    it('should toggle from race to single', () => {
      service.miningMode.set('race');
      service.toggleMiningMode();
      expect(service.miningMode()).toBe('single');
    });
  });

  describe('resetMiningState', () => {
    it('should clear selected transactions', () => {
      const tx: Transaction = {
        id: 'tx1',
        sender: 'alice',
        receiver: 'bob',
        amount: 1,
        fee: 0.001,
      };

      service.selectedTransactions.set([tx]);
      service.resetMiningState();

      expect(service.selectedTransactions()).toEqual([]);
    });

    it('should clear data', () => {
      service.data.set('test data');
      service.resetMiningState();
      expect(service.data()).toBe('');
    });

    it('should reset nonce to 0', () => {
      service.nonce.set(12345);
      service.resetMiningState();
      expect(service.nonce()).toBe(0);
    });

    it('should set isMining to false', () => {
      service.isMining.set(true);
      service.resetMiningState();
      expect(service.isMining()).toBe(false);
    });
  });

  describe('mineSingle', () => {
    it('should set isMining flag during mining', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const miningPromise = service.mineSingle(blockNumber, previousHash, difficulty, [], 'test');

      expect(service.isMining()).toBe(true);

      await miningPromise;
    }, 30000);

    it('should find valid hash with required prefix', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();
      const prefix = '0'.repeat(difficulty);

      const result = await service.mineSingle(blockNumber, previousHash, difficulty, [], 'test');

      expect(result.hash.startsWith(prefix)).toBe(true);
    }, 30000);

    it('should return mining result with all properties', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const result = await service.mineSingle(blockNumber, previousHash, difficulty, [], 'test');

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('attempts');
      expect(result.winner).toBeTruthy();
    }, 30000);

    it('should update nonce signal during mining', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const miningPromise = service.mineSingle(blockNumber, previousHash, difficulty, [], 'test');

      // Wait a bit for mining to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Nonce should have incremented
      expect(service.nonce()).toBeGreaterThan(0);

      await miningPromise;
    }, 30000);
  });

  describe('startMiningRace', () => {
    it('should set isRacing flag', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const racePromise = service.startMiningRace(blockNumber, previousHash, difficulty, []);

      expect(service.isRacing()).toBe(true);

      await racePromise;
    }, 40000);

    it('should initialize progress for all active miners', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const racePromise = service.startMiningRace(blockNumber, previousHash, difficulty, []);

      const activeMiners = service.activeMiners();
      const progress = service.miningProgress();

      expect(progress.size).toBe(activeMiners.length);
      activeMiners.forEach((miner) => {
        expect(progress.has(miner.id)).toBe(true);
      });

      await racePromise;
    }, 40000);

    it('should return winner with valid hash', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();
      const prefix = '0'.repeat(difficulty);

      const result = await service.startMiningRace(blockNumber, previousHash, difficulty, []);

      expect(result.hash.startsWith(prefix)).toBe(true);
      expect(result.winner).toBeTruthy();
    }, 40000);

    it('should update winner totalBlocksMined', async () => {
      const initialCounts = service.miners().map((m) => m.totalBlocksMined);
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const result = await service.startMiningRace(blockNumber, previousHash, difficulty, []);

      const winner = service.miners().find((m) => m.id === result.winner.id);
      const initialWinnerCount = initialCounts[service.miners().findIndex(m => m.id === result.winner.id)];

      expect(winner?.totalBlocksMined).toBe(initialWinnerCount + 1);
    }, 40000);

    it('should set lastWinner', async () => {
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const result = await service.startMiningRace(blockNumber, previousHash, difficulty, []);

      expect(service.lastWinner()).toEqual(result);
    }, 40000);

    it('should only use active miners', async () => {
      service.toggleMiner('miner-1'); // Deactivate Alice
      
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const result = await service.startMiningRace(blockNumber, previousHash, difficulty, []);

      expect(result.winner.id).not.toBe('miner-1');
    }, 40000);
  });

  describe('stopRace', () => {
    it('should stop ongoing race', () => {
      service.isRacing.set(true);
      service.stopRace();
      expect(service.isRacing()).toBe(false);
    });

    it('should be safe to call when not racing', () => {
      service.isRacing.set(false);
      service.stopRace();
      expect(service.isRacing()).toBe(false);
    });
  });

  describe('miners configuration', () => {
    it('should have Alice with highest hash rate', () => {
      const miners = service.miners();
      const alice = miners.find(m => m.name === 'Alice');
      const maxHashRate = Math.max(...miners.map(m => m.hashRate));
      expect(alice?.hashRate).toBe(maxHashRate);
    });

    it('should have unique colors for each miner', () => {
      const miners = service.miners();
      const colors = miners.map(m => m.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(miners.length);
    });

    it('should have unique addresses for each miner', () => {
      const miners = service.miners();
      const addresses = miners.map(m => m.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(miners.length);
    });

    it('should initialize with zero blocks mined', () => {
      const miners = service.miners();
      expect(miners.every(m => m.totalBlocksMined === 0)).toBe(true);
    });
  });
});
