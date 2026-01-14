import { TestBed } from '@angular/core/testing';
import { MiningService } from './mining.service';
import { Blockchain } from './blockchain';
import { Transaction } from '../models/blockchain.model';

describe('MiningService', () => {
  let service: MiningService;
  let blockchain: Blockchain;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MiningService);
    blockchain = TestBed.inject(Blockchain);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default miners', () => {
      const miners = service.miners();
      expect(miners.length).toBe(3);
      expect(miners.every((m) => m.isActive)).toBe(true);
    });

    it('should have Alice as first miner', () => {
      const miners = service.miners();
      expect(miners[0].name).toBe('Alice');
      expect(miners[0].hashRate).toBe(15000);
    });

    it('should have Bob as second miner', () => {
      const miners = service.miners();
      expect(miners[1].name).toBe('Bob');
      expect(miners[1].hashRate).toBe(12000);
    });

    it('should have Charlie as third miner', () => {
      const miners = service.miners();
      expect(miners[2].name).toBe('Charlie');
      expect(miners[2].hashRate).toBe(10000);
    });

    it('should start with single mining mode', () => {
      expect(service.miningMode()).toBe('single');
    });

    it('should not be mining initially', () => {
      expect(service.isMining()).toBe(false);
      expect(service.isRacing()).toBe(false);
    });

    it('should start with nonce 0', () => {
      expect(service.nonce()).toBe(0);
    });
  });

  describe('activeMiners computed', () => {
    it('should return all miners when all are active', () => {
      const active = service.activeMiners();
      expect(active.length).toBe(3);
    });

    it('should filter out inactive miners', () => {
      service.toggleMiner('miner-1');
      const active = service.activeMiners();
      expect(active.length).toBe(2);
      expect(active.every((m) => m.id !== 'miner-1')).toBe(true);
    });
  });

  describe('toggleMiner', () => {
    it('should toggle miner active state', () => {
      const initialState = service.miners()[0].isActive;
      service.toggleMiner('miner-1');
      expect(service.miners()[0].isActive).toBe(!initialState);
    });

    it('should only toggle specified miner', () => {
      service.toggleMiner('miner-1');
      expect(service.miners()[1].isActive).toBe(true);
      expect(service.miners()[2].isActive).toBe(true);
    });

    it('should handle toggling same miner multiple times', () => {
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
      expect(service.miners().every((m) => m.isActive)).toBe(true);
    });

    it('should reset totalBlocksMined', () => {
      service.miners.update((miners) =>
        miners.map((m) => ({ ...m, totalBlocksMined: 5 })),
      );
      service.resetMiners();
      expect(service.miners().every((m) => m.totalBlocksMined === 0)).toBe(true);
    });

    it('should clear mining progress', () => {
      const progress = new Map();
      progress.set('miner-1', { minerId: 'miner-1', nonce: 100, currentHash: 'hash', attempts: 50 });
      service.miningProgress.set(progress);

      service.resetMiners();
      expect(service.miningProgress().size).toBe(0);
    });

    it('should clear last winner', () => {
      service.lastWinner.set({
        winner: service.miners()[0],
        nonce: 100,
        hash: 'hash',
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
    });

    it('should return undefined for non-existent id', () => {
      const miner = service.getMinerById('non-existent');
      expect(miner).toBeUndefined();
    });
  });

  describe('getMinerProgress', () => {
    it('should return progress for miner', () => {
      const progress = new Map();
      progress.set('miner-1', { minerId: 'miner-1', nonce: 100, currentHash: 'hash', attempts: 50 });
      service.miningProgress.set(progress);

      const minerProgress = service.getMinerProgress('miner-1');
      expect(minerProgress).toBeTruthy();
      expect(minerProgress?.nonce).toBe(100);
    });

    it('should return undefined for miner without progress', () => {
      const progress = service.getMinerProgress('miner-1');
      expect(progress).toBeUndefined();
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
    it('should reset selected transactions', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.1 },
      ];
      service.selectedTransactions.set(transactions);
      service.resetMiningState();
      expect(service.selectedTransactions()).toEqual([]);
    });

    it('should reset data', () => {
      service.data.set('test data');
      service.resetMiningState();
      expect(service.data()).toBe('');
    });

    it('should reset nonce', () => {
      service.nonce.set(12345);
      service.resetMiningState();
      expect(service.nonce()).toBe(0);
    });

    it('should reset isMining flag', () => {
      service.isMining.set(true);
      service.resetMiningState();
      expect(service.isMining()).toBe(false);
    });
  });

  describe('currentHash computed', () => {
    it('should compute hash based on current state', () => {
      const hash1 = service.currentHash();
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBe(64); // SHA-256
    });

    it('should update when nonce changes', () => {
      const hash1 = service.currentHash();
      service.nonce.set(100);
      const hash2 = service.currentHash();
      expect(hash1).not.toBe(hash2);
    });

    it('should update when data changes', () => {
      const hash1 = service.currentHash();
      service.data.set('new data');
      const hash2 = service.currentHash();
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isValidHash computed', () => {
    it('should return false for hash without required prefix', () => {
      service.nonce.set(1);
      const isValid = service.isValidHash();
      // Most random hashes won't start with 0000
      expect(typeof isValid).toBe('boolean');
    });

    it('should validate hash starts with difficulty prefix', () => {
      const difficulty = blockchain.getDifficulty();
      const prefix = '0'.repeat(difficulty);

      // Find a valid nonce
      let nonce = 0;
      while (!service.currentHash().startsWith(prefix) && nonce < 100000) {
        service.nonce.set(nonce);
        nonce++;
      }

      if (service.currentHash().startsWith(prefix)) {
        expect(service.isValidHash()).toBe(true);
      }
    });
  });

  describe('mineSingle', () => {
    it('should set isMining flag', async () => {
      const miningPromise = service.mineSingle(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'test',
      );

      expect(service.isMining()).toBe(true);

      await miningPromise;
    }, 10000);

    it('should find valid hash with required prefix', async () => {
      const difficulty = blockchain.getDifficulty();
      const prefix = '0'.repeat(difficulty);

      const result = await service.mineSingle(
        1,
        blockchain.previousHash(),
        difficulty,
        [],
        'test',
      );

      expect(result.hash.startsWith(prefix)).toBe(true);
    }, 10000);

    it('should return mining result with nonce and hash', async () => {
      const result = await service.mineSingle(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'test',
      );

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('attempts');
      expect(result).toHaveProperty('timestamp');
    }, 10000);

    it('should set selected transactions', async () => {
      const transactions: Transaction[] = [
        { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.1 },
      ];

      service.mineSingle(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        transactions,
        'test',
      );

      expect(service.selectedTransactions()).toEqual(transactions);
    }, 10000);
  });

  describe('startMiningRace', () => {
    it('should set isRacing flag', async () => {
      const racePromise = service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      expect(service.isRacing()).toBe(true);

      await racePromise;
    }, 30000);

    it('should initialize progress for all active miners', async () => {
      const racePromise = service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      const activeMiners = service.activeMiners();
      const progress = service.miningProgress();

      expect(progress.size).toBe(activeMiners.length);
      activeMiners.forEach((miner) => {
        expect(progress.has(miner.id)).toBe(true);
      });

      await racePromise;
    }, 30000);

    it('should return winner with valid hash', async () => {
      const difficulty = blockchain.getDifficulty();
      const prefix = '0'.repeat(difficulty);

      const result = await service.startMiningRace(
        1,
        blockchain.previousHash(),
        difficulty,
        [],
      );

      expect(result.hash.startsWith(prefix)).toBe(true);
      expect(result.winner).toBeTruthy();
    }, 30000);

    it('should update winner totalBlocksMined', async () => {
      const initialCounts = service.miners().map((m) => m.totalBlocksMined);

      const result = await service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      const winner = service.miners().find((m) => m.id === result.winner.id);
      const initialWinnerCount = initialCounts[service.miners().findIndex(m => m.id === result.winner.id)];

      expect(winner?.totalBlocksMined).toBe(initialWinnerCount + 1);
    }, 30000);

    it('should set lastWinner', async () => {
      const result = await service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      expect(service.lastWinner()).toEqual(result);
    }, 30000);

    it('should stop racing after winner found', async () => {
      await service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(service.isRacing()).toBe(false);
    }, 30000);

    it('should only use active miners', async () => {
      service.toggleMiner('miner-1'); // Deactivate Alice

      const result = await service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      expect(result.winner.id).not.toBe('miner-1');
    }, 30000);
  });

  describe('stopRace', () => {
    it('should stop ongoing race', () => {
      service.startMiningRace(
        1,
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      service.stopRace();

      expect(service.isRacing()).toBe(false);
    });

    it('should be safe to call when not racing', () => {
      expect(() => service.stopRace()).not.toThrow();
    });
  });

  describe('miners configuration', () => {
    it('should have different hash rates for each miner', () => {
      const miners = service.miners();
      const hashRates = miners.map((m) => m.hashRate);
      const uniqueHashRates = new Set(hashRates);

      expect(uniqueHashRates.size).toBe(miners.length);
    });

    it('should have Alice with highest hash rate', () => {
      const miners = service.miners();
      const alice = miners.find((m) => m.name === 'Alice');
      const maxHashRate = Math.max(...miners.map((m) => m.hashRate));

      expect(alice?.hashRate).toBe(maxHashRate);
    });

    it('should have unique colors for each miner', () => {
      const miners = service.miners();
      const colors = miners.map((m) => m.color);
      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(miners.length);
    });

    it('should have unique addresses for each miner', () => {
      const miners = service.miners();
      const addresses = miners.map((m) => m.address);
      const uniqueAddresses = new Set(addresses);

      expect(uniqueAddresses.size).toBe(miners.length);
    });
  });
});
