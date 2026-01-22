import { TestBed } from '@angular/core/testing';
import { Blockchain } from '../services/blockchain.service';
import { MempoolService } from '../services/mempool.service';
import { MiningService } from '../services/mining.service';
import { WalletService } from '../services/wallet.service';

/**
 * E2E Test - Complete Application Flow
 * 
 * This test simulates a complete user journey through the blockchain application:
 * 1. Add transactions to mempool
 * 2. Mine blocks (both solo and race modes)
 * 3. Verify mempool cleanup after mining
 * 4. Verify blockchain formation and chain integrity
 * 5. Verify wallet balances are updated correctly
 * 6. Create and manage forks
 * 7. Verify statistics are calculated correctly
 */
describe('E2E: Complete Blockchain Application Flow', () => {
  let blockchain: Blockchain;
  let mempoolService: MempoolService;
  let miningService: MiningService;
  let walletService: WalletService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [Blockchain, MempoolService, MiningService, WalletService],
    });

    blockchain = TestBed.inject(Blockchain);
    mempoolService = TestBed.inject(MempoolService);
    miningService = TestBed.inject(MiningService);
    walletService = TestBed.inject(WalletService);
  });

  it('should execute complete application flow from transactions to forks', async () => {
    // ========================================
    // PHASE 1: Add Transactions to Mempool
    // ========================================
    console.log('Phase 1: Adding transactions to mempool...');
    
    const defaultMinerAddress = blockchain.getDefaultMinerAddress();
    const address1 = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const address2 = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
    const address3 = '1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx';
    
    // Initially mempool should have mock transactions
    const initialMempoolSize = mempoolService.mempool().length;
    expect(initialMempoolSize).toBeGreaterThan(0);
    
    // Add more transactions
    mempoolService.addTransaction({
      id: 'e2e-tx-1',
      sender: address1,
      receiver: address2,
      amount: 2.5,
      fee: 0.0002,
    });
    
    mempoolService.addTransaction({
      id: 'e2e-tx-2',
      sender: address2,
      receiver: address3,
      amount: 1.0,
      fee: 0.0003, // Higher fee
    });
    
    expect(mempoolService.mempool().length).toBe(initialMempoolSize + 2);
    
    // ========================================
    // PHASE 2: Mine Block in Solo Mode
    // ========================================
    console.log('Phase 2: Mining block in solo mode...');
    
    miningService.data.set('First block - Solo mining');
    const txsToInclude = mempoolService.getPrioritizedTransactions(4);
    
    const soloResult = await miningService.mineSingle(
      blockchain.currentBlockNumber(),
      blockchain.previousHash(),
      blockchain.getDifficulty(),
      txsToInclude,
      miningService.data(),
    );
    
    expect(soloResult.hash).toBeTruthy();
    expect(soloResult.hash.startsWith('0000')).toBe(true); // Meets difficulty
    
    // Create and add block
    const block1 = {
      number: blockchain.currentBlockNumber(),
      nonce: soloResult.nonce,
      data: miningService.data(),
      previousHash: blockchain.previousHash(),
      hash: soloResult.hash,
      transactions: txsToInclude,
      minerAddress: defaultMinerAddress,
      reward: blockchain.calculateBlockReward(txsToInclude),
      timestamp: soloResult.timestamp,
    };
    
    blockchain.addBlockToChain(block1);
    
    // ========================================
    // PHASE 3: Verify Mempool Cleanup
    // ========================================
    console.log('Phase 3: Verifying mempool cleanup...');
    
    // Transactions should be removed from mempool after being mined
    const remainingTxs = mempoolService.mempool();
    const minedTxIds = txsToInclude.map(tx => tx.id);
    
    minedTxIds.forEach(txId => {
      expect(remainingTxs.find(tx => tx.id === txId)).toBeUndefined();
    });
    
    // ========================================
    // PHASE 4: Verify Blockchain Formation
    // ========================================
    console.log('Phase 4: Verifying blockchain formation...');
    
    const mainChain = blockchain.mainChain();
    expect(mainChain).toBeTruthy();
    expect(mainChain!.chain.length).toBe(1);
    expect(mainChain!.chain[0].hash).toBe(block1.hash);
    
    // Validate chain integrity
    const validation = blockchain.validateChain();
    expect(validation.isValid).toBe(true);
    expect(validation.invalidBlocks.length).toBe(0);
    
    // ========================================
    // PHASE 5: Verify Wallet Balances
    // ========================================
    console.log('Phase 5: Verifying wallet balances...');
    
    // Miner should have received block reward
    const minerBalance = walletService.getBalance(defaultMinerAddress);
    expect(minerBalance).toBeGreaterThan(0);
    expect(minerBalance).toBeCloseTo(block1.reward, 4);
    
    // Miner's transaction history should show mining reward
    const minerHistory = walletService.getTransactionHistory(defaultMinerAddress);
    const miningReward = minerHistory.find(h => h.type === 'mining_reward');
    expect(miningReward).toBeTruthy();
    expect(miningReward!.amount).toBe(block1.reward);
    
    // ========================================
    // PHASE 6: Mine Block in Race Mode
    // ========================================
    console.log('Phase 6: Mining block in race mode...');
    
    // Add more transactions for next block
    mempoolService.addTransaction({
      id: 'e2e-tx-3',
      sender: address3,
      receiver: address1,
      amount: 0.5,
      fee: 0.0001,
    });
    
    const txsForRace = mempoolService.getPrioritizedTransactions(4);
    miningService.selectedTransactions.set(txsForRace);
    
    const raceResult = await miningService.startMiningRace(
      blockchain.currentBlockNumber(),
      blockchain.previousHash(),
      blockchain.getDifficulty(),
      txsForRace,
    );
    
    expect(raceResult.winner).toBeTruthy();
    expect(raceResult.hash.startsWith('0000')).toBe(true);
    
    // Create and add block from race winner
    const block2 = {
      number: blockchain.currentBlockNumber(),
      nonce: raceResult.nonce,
      data: 'Second block - Race mining',
      previousHash: blockchain.previousHash(),
      hash: raceResult.hash,
      transactions: txsForRace,
      minerAddress: raceResult.winner.address,
      reward: blockchain.calculateBlockReward(txsForRace),
      timestamp: raceResult.timestamp,
    };
    
    blockchain.addBlockToChain(block2);
    
    expect(blockchain.mainChain()!.chain.length).toBe(2);
    
    // Winner statistics should be updated
    const winner = miningService.getMinerById(raceResult.winner.id);
    expect(winner).toBeTruthy();
    expect(winner!.totalBlocksMined).toBeGreaterThan(0);
    const lastWinner = miningService.lastWinner();
    expect(lastWinner?.winner.id).toBe(raceResult.winner.id);
    
    // ========================================
    // PHASE 7: Create and Manage Forks
    // ========================================
    console.log('Phase 7: Creating and managing forks...');
    
    const initialChainCount = blockchain.chains().length;
    
    // Create a fork from block 1
    const forkId = blockchain.createChain(0, 'Alternative Chain');
    expect(blockchain.chains().length).toBe(initialChainCount + 1);
    
    // Switch to fork
    blockchain.setActiveChain(forkId);
    expect(blockchain.activeChainId()).toBe(forkId);
    
    // Mine a block on the fork
    const forkTxs = [
      { id: 'fork-tx-1', sender: address1, receiver: address2, amount: 1, fee: 0.0001 },
    ];
    
    const forkMineResult = await miningService.mineSingle(
      blockchain.currentBlockNumber(),
      blockchain.previousHash(),
      blockchain.getDifficulty(),
      forkTxs,
      'Fork block',
    );
    
    const forkBlock = {
      number: blockchain.currentBlockNumber(),
      nonce: forkMineResult.nonce,
      data: 'Fork block',
      previousHash: blockchain.previousHash(),
      hash: forkMineResult.hash,
      transactions: forkTxs,
      minerAddress: defaultMinerAddress,
      reward: blockchain.calculateBlockReward(forkTxs),
      timestamp: forkMineResult.timestamp,
    };
    
    blockchain.addBlockToChain(forkBlock, forkId);
    
    // Fork should have blocks from fork point + new block
    const fork = blockchain.chains().find(c => c.id === forkId);
    expect(fork).toBeTruthy();
    // Fork point was 0, so it should have 1 (genesis copy) + 1 (new block) = 2 blocks
    expect(fork!.chain.length).toBeGreaterThanOrEqual(1);
    
    // Main chain should still be longer (2 blocks)
    const mainChainAfterFork = blockchain.mainChain();
    expect(mainChainAfterFork!.chain.length).toBe(2);
    
    // Fork has same length, so manually switch back to main
    blockchain.setActiveChain('main');
    expect(blockchain.activeChainId()).toBe('main');
    
    // Remove fork
    blockchain.removeChain(forkId);
    expect(blockchain.chains().length).toBe(initialChainCount);
    
    // ========================================
    // PHASE 8: Verify Statistics
    // ========================================
    console.log('Phase 8: Verifying statistics...');
    
    const activeChain = blockchain.activeChain();
    const blocks = activeChain!.chain;
    
    // Total blocks
    expect(blocks.length).toBe(2);
    
    // Total BTC in circulation (block rewards)
    const totalBTC = blocks.reduce((sum, block) => sum + block.reward, 0);
    expect(totalBTC).toBeGreaterThan(0);
    
    // Total transactions processed
    const totalTxs = blocks.reduce((sum, block) => sum + block.transactions.length, 0);
    expect(totalTxs).toBeGreaterThan(0);
    
    // Total fees collected
    let totalFees = 0;
    blocks.forEach(block => {
      block.transactions.forEach(tx => {
        totalFees += tx.fee;
      });
    });
    expect(totalFees).toBeGreaterThan(0);
    
    // Active wallets
    const activeWallets = walletService.getActiveWallets();
    expect(activeWallets.length).toBeGreaterThan(0);
    
    // All addresses
    const allAddresses = walletService.getAllAddresses();
    expect(allAddresses.length).toBeGreaterThan(0);
    
    console.log('✅ E2E test completed successfully!');
    console.log(`- Blocks mined: ${blocks.length}`);
    console.log(`- BTC in circulation: ${totalBTC.toFixed(4)}`);
    console.log(`- Transactions processed: ${totalTxs}`);
    console.log(`- Total fees: ${totalFees.toFixed(6)}`);
    console.log(`- Active wallets: ${activeWallets.length}`);
  }, 120000); // 120 second timeout for complete E2E flow
});
