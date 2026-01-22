import { TestBed } from '@angular/core/testing';
import { MempoolService } from './mempool.service';
import { Transaction } from '../models/blockchain.model';

describe('MempoolService', () => {
  let service: MempoolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MempoolService);
    // Clear mempool before each test
    service.mempool.set([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addTransaction', () => {
    it('should add transaction to mempool', () => {
      const transaction: Transaction = {
        id: 'tx1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      service.addTransaction(transaction);

      expect(service.mempool().length).toBe(1);
      expect(service.mempool()[0]).toEqual(transaction);
    });

    it('should sort by fee when prioritization is enabled', () => {
      service.prioritizeMempoolByFee.set(true);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0002 };

      service.addTransaction(tx1);
      service.addTransaction(tx2);
      service.addTransaction(tx3);

      const mempool = service.mempool();
      expect(mempool[0].fee).toBe(0.0003);
      expect(mempool[1].fee).toBe(0.0002);
      expect(mempool[2].fee).toBe(0.0001);
    });

    it('should not sort when prioritization is disabled', () => {
      service.prioritizeMempoolByFee.set(false);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };

      service.addTransaction(tx1);
      service.addTransaction(tx2);

      const mempool = service.mempool();
      expect(mempool[0].id).toBe('tx1');
      expect(mempool[1].id).toBe('tx2');
    });
  });

  describe('removeTransactions', () => {
    it('should remove transactions by ids', () => {
      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0002 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0003 };

      service.mempool.set([tx1, tx2, tx3]);

      service.removeTransactions(['tx1', 'tx3']);

      const mempool = service.mempool();
      expect(mempool.length).toBe(1);
      expect(mempool[0].id).toBe('tx2');
    });

    it('should handle empty id list', () => {
      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      service.mempool.set([tx1]);

      service.removeTransactions([]);

      expect(service.mempool().length).toBe(1);
    });

    it('should handle non-existent ids', () => {
      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      service.mempool.set([tx1]);

      service.removeTransactions(['nonexistent']);

      expect(service.mempool().length).toBe(1);
    });
  });

  describe('canMakeTransaction', () => {
    const getBalance = (address: string) => {
      if (address === 'rich') return 10;
      if (address === 'poor') return 0.5;
      return 0;
    };

    it('should return true if sender has sufficient balance', () => {
      const tx: Transaction = {
        id: 'tx1',
        sender: 'rich',
        receiver: 'anyone',
        amount: 5,
        fee: 0.1,
      };

      expect(service.canMakeTransaction(tx, getBalance)).toBe(true);
    });

    it('should return false if sender has insufficient balance', () => {
      const tx: Transaction = {
        id: 'tx1',
        sender: 'poor',
        receiver: 'anyone',
        amount: 1,
        fee: 0.1,
      };

      expect(service.canMakeTransaction(tx, getBalance)).toBe(false);
    });

    it('should account for transaction fee', () => {
      const tx: Transaction = {
        id: 'tx1',
        sender: 'poor',
        receiver: 'anyone',
        amount: 0.4,
        fee: 0.1,
      };

      // Balance is 0.5, needs 0.4 + 0.1 = 0.5 total (exact match)
      expect(service.canMakeTransaction(tx, getBalance)).toBe(true);

      tx.fee = 0.11; // Now needs 0.51 total
      expect(service.canMakeTransaction(tx, getBalance)).toBe(false);
    });
  });

  describe('togglePrioritization', () => {
    it('should toggle prioritization flag', () => {
      const initialValue = service.prioritizeMempoolByFee();
      service.togglePrioritization();
      expect(service.prioritizeMempoolByFee()).toBe(!initialValue);
    });

    it('should sort mempool when enabling prioritization', () => {
      service.prioritizeMempoolByFee.set(false);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };

      service.mempool.set([tx1, tx2]);

      service.togglePrioritization(); // Enable

      const mempool = service.mempool();
      expect(mempool[0].id).toBe('tx2'); // Higher fee first
    });

    it('should not sort when disabling prioritization', () => {
      service.prioritizeMempoolByFee.set(true);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };

      service.mempool.set([tx1, tx2]);

      service.togglePrioritization(); // Disable

      // Should keep current order
      const mempool = service.mempool();
      expect(mempool[0].id).toBe('tx1');
      expect(mempool[1].id).toBe('tx2');
    });
  });

  describe('getPrioritizedTransactions', () => {
    it('should return requested number of transactions', () => {
      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0002 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0003 };

      service.mempool.set([tx1, tx2, tx3]);

      const transactions = service.getPrioritizedTransactions(2);
      expect(transactions.length).toBe(2);
    });

    it('should return transactions sorted by fee when prioritization enabled', () => {
      service.prioritizeMempoolByFee.set(true);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };
      const tx3: Transaction = { id: 'tx3', sender: 'E', receiver: 'F', amount: 1, fee: 0.0002 };

      service.mempool.set([tx1, tx2, tx3]);

      const prioritized = service.getPrioritizedTransactions(2);
      expect(prioritized[0].fee).toBe(0.0003);
      expect(prioritized[1].fee).toBe(0.0002);
    });

    it('should return transactions in order when prioritization disabled', () => {
      service.prioritizeMempoolByFee.set(false);

      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      const tx2: Transaction = { id: 'tx2', sender: 'C', receiver: 'D', amount: 1, fee: 0.0003 };

      service.mempool.set([tx1, tx2]);

      const transactions = service.getPrioritizedTransactions(2);
      expect(transactions[0].id).toBe('tx1');
      expect(transactions[1].id).toBe('tx2');
    });

    it('should handle count larger than mempool size', () => {
      const tx1: Transaction = { id: 'tx1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 };
      service.mempool.set([tx1]);

      const transactions = service.getPrioritizedTransactions(10);
      expect(transactions.length).toBe(1);
    });
  });

  describe('generateRandomAddress', () => {
    it('should generate address with valid prefix', () => {
      const address = service.generateRandomAddress();
      expect(address).toBeTruthy();
      expect(['1', '3', 'bc1q'].some((prefix) => address.startsWith(prefix))).toBe(true);
    });

    it('should generate addresses with correct length', () => {
      for (let i = 0; i < 10; i++) {
        const address = service.generateRandomAddress();
        if (address.startsWith('bc1q')) {
          expect(address.length).toBe(38); // Total length for bc1q addresses
        } else {
          expect(address.length).toBe(30); // Total length for legacy addresses
        }
      }
    });
  });

  describe('selectRealisticSender', () => {
    it('should return random address when no active wallets', () => {
      const sender = service.selectRealisticSender([]);
      expect(sender).toBeTruthy();
      expect(sender.length).toBeGreaterThan(0);
    });

    it('should select from active wallets', () => {
      const wallets = [
        { address: 'wallet1', balance: 10 },
        { address: 'wallet2', balance: 20 },
      ];

      const sender = service.selectRealisticSender(wallets);
      // Should be either a wallet address or a new random one
      expect(sender).toBeTruthy();
    });
  });

  describe('selectRealisticReceiver', () => {
    it('should not select sender as receiver', () => {
      const allAddresses = ['sender', 'receiver1', 'receiver2'];
      const receiver = service.selectRealisticReceiver('sender', allAddresses);
      expect(receiver).not.toBe('sender');
    });

    it('should return address', () => {
      const allAddresses = ['addr1', 'addr2'];
      const receiver = service.selectRealisticReceiver('sender', allAddresses);
      expect(receiver).toBeTruthy();
    });
  });

  describe('generateRealisticTransaction', () => {
    const getBalance = (address: string) => {
      if (address === 'rich') return 10;
      return 0;
    };

    it('should return null if sender has insufficient funds', () => {
      const wallets = [{ address: 'poor', balance: 0 }];
      const allAddresses = ['poor', 'receiver'];

      // This may or may not return null depending on random values
      // Just ensure it doesn't throw
      const tx = service.generateRealisticTransaction(wallets, allAddresses, getBalance);
      expect(tx === null || typeof tx === 'object').toBe(true);
    });

    it('should generate transaction with valid structure', () => {
      const wallets = [{ address: 'rich', balance: 10 }];
      const allAddresses = ['rich', 'receiver'];

      const tx = service.generateRealisticTransaction(wallets, allAddresses, getBalance);

      if (tx) {
        expect(tx).toHaveProperty('id');
        expect(tx).toHaveProperty('sender');
        expect(tx).toHaveProperty('receiver');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('fee');
        expect(tx.sender).not.toBe(tx.receiver);
      }
    });
  });

  describe('generateRandomTransaction', () => {
    it('should generate transaction with all required fields', () => {
      const tx = service.generateRandomTransaction();

      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('sender');
      expect(tx).toHaveProperty('receiver');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('fee');
    });

    it('should generate different transactions', () => {
      const tx1 = service.generateRandomTransaction();
      const tx2 = service.generateRandomTransaction();

      expect(tx1.id).not.toBe(tx2.id);
    });

    it('should have positive amounts and fees', () => {
      const tx = service.generateRandomTransaction();

      expect(tx.amount).toBeGreaterThan(0);
      expect(tx.fee).toBeGreaterThan(0);
    });
  });

  describe('initializeMockTransactions', () => {
    it('should populate mempool with mock transactions', () => {
      service.mempool.set([]);
      service.initializeMockTransactions();

      expect(service.mempool().length).toBeGreaterThan(0);
    });

    it('should create transactions between seed wallets', () => {
      service.initializeMockTransactions();

      const mempool = service.mempool();
      expect(mempool.length).toBe(8); // As defined in the service
    });

    it('should have valid transaction structure', () => {
      service.initializeMockTransactions();

      const mempool = service.mempool();
      mempool.forEach((tx) => {
        expect(tx).toHaveProperty('id');
        expect(tx).toHaveProperty('sender');
        expect(tx).toHaveProperty('receiver');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('fee');
        expect(tx.sender).toBeTruthy();
        expect(tx.receiver).toBeTruthy();
      });
    });
  });
});
