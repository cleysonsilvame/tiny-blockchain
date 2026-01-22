import { TestBed } from '@angular/core/testing';
import { Blockchain } from '../services/blockchain.service';
import { MiningService } from '../services/mining.service';
import { MempoolService } from '../services/mempool.service';
import { WalletService } from '../services/wallet.service';
import { Transaction, Block } from '../models/blockchain.model';

/**
 * Integration tests for blockchain application flows.
 * These tests validate the interaction between multiple services working together.
 */
describe('Integration Tests', () => {
  let blockchain: Blockchain;
  let miningService: MiningService;
  let mempoolService: MempoolService;
  let walletService: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    blockchain = TestBed.inject(Blockchain);
    miningService = TestBed.inject(MiningService);
    mempoolService = TestBed.inject(MempoolService);
    walletService = TestBed.inject(WalletService);
  });

  describe('Complete Mining Flow', () => {
    it('should create transactions, mine block, and update blockchain', async () => {
      // 1. Setup: Clear mempool and add test transactions
      mempoolService.mempool.set([]);
      
      const tx1: Transaction = {
        id: 'tx-integration-1',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.5,
        fee: 0.0001,
      };

      const tx2: Transaction = {
        id: 'tx-integration-2',
        sender: 'Charlie',
        receiver: 'Dave',
        amount: 2.0,
        fee: 0.0002,
      };

      mempoolService.addTransaction(tx1);
      mempoolService.addTransaction(tx2);

      expect(mempoolService.mempool().length).toBe(2);

      // 2. Mine a block with these transactions
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();
      const transactions = [tx1, tx2];

      const result = await miningService.mineSingle(
        blockNumber,
        previousHash,
        difficulty,
        transactions,
        'Integration Test Block',
      );

      // 3. Add block to blockchain
      const reward = blockchain.calculateBlockReward(transactions);

      const block: Block = {
        number: blockNumber,
        nonce: result.nonce,
        data: 'Integration Test Block',
        previousHash: previousHash,
        hash: result.hash,
        transactions: transactions,
        minerAddress: result.winner.address,
        reward: reward,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      // 4. Verify blockchain state
      const mainChain = blockchain.mainChain();
      expect(mainChain?.chain.length).toBe(1);
      expect(mainChain?.chain[0]).toEqual(block);

      // 5. Verify transactions removed from mempool
      expect(mempoolService.mempool().length).toBe(0);

      // 6. Verify blockchain tracking
      expect(blockchain.currentBlockNumber()).toBe(2);
      expect(blockchain.previousHash()).toBe(result.hash);
    }, 40000);

    it('should handle fee prioritization in mining flow', async () => {
      // Enable fee prioritization
      mempoolService.prioritizeMempoolByFee.set(true);
      mempoolService.mempool.set([]);

      const lowFeeTx: Transaction = {
        id: 'low-fee-tx',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0001,
      };

      const highFeeTx: Transaction = {
        id: 'high-fee-tx',
        sender: 'Charlie',
        receiver: 'Dave',
        amount: 1.0,
        fee: 0.0005,
      };

      mempoolService.addTransaction(lowFeeTx);
      mempoolService.addTransaction(highFeeTx);

      // Get prioritized transactions
      const prioritized = mempoolService.getPrioritizedTransactions(2);
      
      // High fee transaction should be first
      expect(prioritized[0].id).toBe('high-fee-tx');
      expect(prioritized[1].id).toBe('low-fee-tx');

      // Mine block with prioritized transactions
      const result = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        prioritized,
        'Prioritized Block',
      );

      expect(result.hash.startsWith('0000')).toBe(true);
    }, 40000);

    it('should update miner balance after mining reward', async () => {
      const minerAddress = 'TestMinerAddress123';
      
      // Mine a block
      const blockNumber = blockchain.currentBlockNumber();
      const previousHash = blockchain.previousHash();
      const difficulty = blockchain.getDifficulty();

      const tx: Transaction = {
        id: 'reward-test-tx',
        sender: 'Alice',
        receiver: 'Bob',
        amount: 1.0,
        fee: 0.0002,
      };

      const result = await miningService.mineSingle(
        blockNumber,
        previousHash,
        difficulty,
        [tx],
        'Reward Test',
      );

      const reward = blockchain.calculateBlockReward([tx]);
      
      const block: Block = {
        number: blockNumber,
        nonce: result.nonce,
        data: 'Reward Test',
        previousHash: previousHash,
        hash: result.hash,
        transactions: [tx],
        minerAddress: minerAddress,
        reward: reward,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      // Check miner balance
      const balance = walletService.getBalance(minerAddress);
      expect(balance).toBe(reward);

      // Check transaction history
      const history = walletService.getTransactionHistory(minerAddress);
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('mining_reward');
      expect(history[0].amount).toBe(reward);
    }, 40000);
  });

  describe('Fork/Chain Resolution Flow', () => {
    it('should create fork, mine on both chains, and resolve to longest', async () => {
      // 1. Mine first block on main chain
      const result1 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Main Block 1',
      );

      const block1: Block = {
        number: 1,
        nonce: result1.nonce,
        data: 'Main Block 1',
        previousHash: blockchain.previousHash(),
        hash: result1.hash,
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block1);

      // 2. Create a fork from block 0
      const forkId = blockchain.createChain(0, 'Test Fork');
      const forksBefore = blockchain.chains().length;
      
      expect(forksBefore).toBe(2); // main + new fork

      // 3. Mine two blocks on the fork
      blockchain.activeChainId.set(forkId);

      const result2 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Fork Block 1',
      );

      const forkBlock1: Block = {
        number: blockchain.currentBlockNumber(),
        nonce: result2.nonce,
        data: 'Fork Block 1',
        previousHash: blockchain.previousHash(),
        hash: result2.hash,
        transactions: [],
        minerAddress: 'miner2',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(forkBlock1, forkId);

      const result3 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Fork Block 2',
      );

      const forkBlock2: Block = {
        number: blockchain.currentBlockNumber(),
        nonce: result3.nonce,
        data: 'Fork Block 2',
        previousHash: blockchain.previousHash(),
        hash: result3.hash,
        transactions: [],
        minerAddress: 'miner2',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(forkBlock2, forkId);

      // 4. Wait for consensus to resolve
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Fork should now be the main chain (longest)
      const fork = blockchain.chains().find(c => c.id === forkId);
      expect(fork?.isMainChain).toBe(true);
      expect(fork?.chain.length).toBeGreaterThan(1);

      const originalMain = blockchain.chains().find(c => c.id === 'main');
      expect(originalMain?.isMainChain).toBe(false);
    }, 120000);
  });

  describe('Validation and Tamper Detection Flow', () => {
    it('should detect tampering after mining valid blocks', async () => {
      // 1. Mine valid blocks
      const result1 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Valid Block 1',
      );

      const block1: Block = {
        number: 1,
        nonce: result1.nonce,
        data: 'Valid Block 1',
        previousHash: blockchain.previousHash(),
        hash: result1.hash,
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block1);

      const result2 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Valid Block 2',
      );

      const block2: Block = {
        number: 2,
        nonce: result2.nonce,
        data: 'Valid Block 2',
        previousHash: blockchain.previousHash(),
        hash: result2.hash,
        transactions: [],
        minerAddress: 'miner1',
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block2);

      // 2. Validate chain is valid
      const validationBefore = blockchain.validateChain();
      expect(validationBefore.isValid).toBe(true);
      expect(validationBefore.invalidBlocks.length).toBe(0);

      // 3. Tamper with a block
      blockchain.tamperBlock(1, 'TAMPERED DATA!!!');

      // 4. Validate chain again
      const validationAfter = blockchain.validateChain();
      expect(validationAfter.isValid).toBe(false);
      expect(validationAfter.invalidBlocks).toContain(1);

      // 5. Check if block is marked as invalid
      expect(blockchain.isBlockInvalid(1)).toBe(true);
      expect(blockchain.isBlockInvalid(2)).toBe(false);
    }, 80000);

    it('should validate chain integrity across multiple blocks', async () => {
      const numBlocks = 3;
      
      for (let i = 0; i < numBlocks; i++) {
        const result = await miningService.mineSingle(
          blockchain.currentBlockNumber(),
          blockchain.previousHash(),
          blockchain.getDifficulty(),
          [],
          `Block ${i + 1}`,
        );

        const block: Block = {
          number: blockchain.currentBlockNumber(),
          nonce: result.nonce,
          data: `Block ${i + 1}`,
          previousHash: blockchain.previousHash(),
          hash: result.hash,
          transactions: [],
          minerAddress: 'miner1',
          reward: 6.25,
          timestamp: Date.now(),
        };

        blockchain.addBlockToChain(block);
      }

      // Validate entire chain
      const validation = blockchain.validateChain();
      expect(validation.isValid).toBe(true);
      expect(blockchain.mainChain()?.chain.length).toBe(numBlocks);

      // Verify previousHash links
      const chain = blockchain.mainChain()?.chain || [];
      for (let i = 1; i < chain.length; i++) {
        expect(chain[i].previousHash).toBe(chain[i - 1].hash);
      }
    }, 120000);
  });

  describe('Wallet and Transaction Flow', () => {
    it('should track balances through mining and transactions', async () => {
      const minerAddr = 'MinerWallet123';
      const senderAddr = 'SenderWallet456';
      const receiverAddr = 'ReceiverWallet789';

      // 1. Miner mines first block (gets reward)
      const result1 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
        'Mining Reward Block',
      );

      const block1: Block = {
        number: 1,
        nonce: result1.nonce,
        data: 'Mining Reward Block',
        previousHash: blockchain.previousHash(),
        hash: result1.hash,
        transactions: [],
        minerAddress: minerAddr,
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block1);

      expect(walletService.getBalance(minerAddr)).toBe(6.25);

      // 2. Create transaction from sender to receiver
      const tx: Transaction = {
        id: 'wallet-test-tx',
        sender: minerAddr,
        receiver: receiverAddr,
        amount: 2.0,
        fee: 0.001,
      };

      // 3. Mine block with transaction
      const result2 = await miningService.mineSingle(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [tx],
        'Transaction Block',
      );

      const reward2 = blockchain.calculateBlockReward([tx]);

      const block2: Block = {
        number: 2,
        nonce: result2.nonce,
        data: 'Transaction Block',
        previousHash: blockchain.previousHash(),
        hash: result2.hash,
        transactions: [tx],
        minerAddress: senderAddr,
        reward: reward2,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block2);

      // 4. Verify balances
      // Miner: 6.25 - 2.0 - 0.001 = 4.249
      expect(walletService.getBalance(minerAddr)).toBeCloseTo(4.249, 3);
      
      // Receiver: 2.0
      expect(walletService.getBalance(receiverAddr)).toBe(2.0);
      
      // Second miner: reward (6.25 + 0.001 fee)
      expect(walletService.getBalance(senderAddr)).toBeCloseTo(6.251, 3);

      // 5. Check active wallets
      const activeWallets = walletService.getActiveWallets();
      expect(activeWallets.length).toBe(3);
      expect(activeWallets.some(w => w.address === minerAddr)).toBe(true);
      expect(activeWallets.some(w => w.address === receiverAddr)).toBe(true);
      expect(activeWallets.some(w => w.address === senderAddr)).toBe(true);
    }, 80000);
  });

  describe('Competitive Mining Flow', () => {
    it('should handle race mining and update winner statistics', async () => {
      // Get initial miner states
      const minersBefore = miningService.miners().map(m => ({
        id: m.id,
        totalBlocksMined: m.totalBlocksMined,
      }));

      // Start a race
      const result = await miningService.startMiningRace(
        blockchain.currentBlockNumber(),
        blockchain.previousHash(),
        blockchain.getDifficulty(),
        [],
      );

      // Verify winner exists and hash is valid
      expect(result.winner).toBeTruthy();
      expect(result.hash.startsWith('0000')).toBe(true);

      // Verify winner's totalBlocksMined increased
      const winnerBefore = minersBefore.find(m => m.id === result.winner.id);
      const winnerAfter = miningService.miners().find(m => m.id === result.winner.id);
      
      expect(winnerAfter?.totalBlocksMined).toBe((winnerBefore?.totalBlocksMined || 0) + 1);

      // Add block to blockchain
      const block: Block = {
        number: blockchain.currentBlockNumber(),
        nonce: result.nonce,
        data: 'Race Block',
        previousHash: blockchain.previousHash(),
        hash: result.hash,
        transactions: [],
        minerAddress: result.winner.address,
        reward: 6.25,
        timestamp: Date.now(),
      };

      blockchain.addBlockToChain(block);

      // Verify blockchain updated
      expect(blockchain.mainChain()?.chain.length).toBe(1);
      expect(walletService.getBalance(result.winner.address)).toBe(6.25);
    }, 50000);
  });
});
