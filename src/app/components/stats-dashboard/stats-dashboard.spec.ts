import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsDashboard } from './stats-dashboard';
import { Blockchain } from '../../services/blockchain.service';
import { MiningService } from '../../services/mining.service';

describe('StatsDashboard Component', () => {
  let component: StatsDashboard;
  let fixture: ComponentFixture<StatsDashboard>;
  let blockchain: Blockchain;
  let miningService: MiningService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsDashboard);
    component = fixture.componentInstance;
    blockchain = TestBed.inject(Blockchain);
    miningService = TestBed.inject(MiningService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate total blocks correctly', () => {
    // Initially should have 0 blocks
    expect(component.totalBlocks()).toBe(0);
    
    // Add a block
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: Date.now(),
    };
    blockchain.addBlockToChain(block);
    
    expect(component.totalBlocks()).toBe(1);
  });

  it('should calculate total BTC in circulation', () => {
    const block1 = {
      number: 1,
      nonce: 0,
      data: 'test1',
      previousHash: '0',
      hash: '0000test1',
      transactions: [],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: Date.now(),
    };
    
    const block2 = {
      number: 2,
      nonce: 0,
      data: 'test2',
      previousHash: '0000test1',
      hash: '0000test2',
      transactions: [],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: Date.now() + 1000,
    };
    
    blockchain.addBlockToChain(block1);
    blockchain.addBlockToChain(block2);
    
    expect(component.totalBTC()).toBe(100);
  });

  it('should calculate average block time correctly', () => {
    const now = Date.now();
    
    const block1 = {
      number: 1,
      nonce: 0,
      data: 'test1',
      previousHash: '0',
      hash: '0000test1',
      transactions: [],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: now,
    };
    
    const block2 = {
      number: 2,
      nonce: 0,
      data: 'test2',
      previousHash: '0000test1',
      hash: '0000test2',
      transactions: [],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: now + 10000, // 10 seconds later
    };
    
    blockchain.addBlockToChain(block1);
    blockchain.addBlockToChain(block2);
    
    expect(component.averageBlockTime()).toBe(10);
  });

  it('should calculate miner statistics correctly', () => {
    const minerAddress = miningService.miners()[0].address;
    
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: minerAddress,
      reward: 50,
      timestamp: Date.now(),
    };
    
    blockchain.addBlockToChain(block);
    
    const stats = component.minerStats();
    const minerStat = stats.find(s => s.address === minerAddress);
    
    expect(minerStat).toBeDefined();
    expect(minerStat!.blocksMined).toBe(1);
    expect(minerStat!.totalRewards).toBe(50);
  });

  it('should calculate network hashrate from active miners', () => {
    const initialHashrate = component.networkHashrate();
    
    // All miners are active by default
    const activeMiners = miningService.miners().filter(m => m.isActive);
    const expectedHashrate = activeMiners.reduce((sum, m) => sum + m.hashRate, 0);
    
    expect(initialHashrate).toBe(expectedHashrate);
  });

  it('should calculate total transactions processed', () => {
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [
        { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
        { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
      ],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: Date.now(),
    };
    
    blockchain.addBlockToChain(block);
    
    expect(component.totalTransactions()).toBe(2);
  });

  it('should calculate total fees collected', () => {
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [
        { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
        { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
      ],
      minerAddress: blockchain.getDefaultMinerAddress(),
      reward: 50,
      timestamp: Date.now(),
    };
    
    blockchain.addBlockToChain(block);
    
    expect(component.totalFees()).toBeCloseTo(0.0003, 4);
  });

  it('should format numbers correctly', () => {
    expect(component.formatNumber(1000)).toBe('1,000');
    expect(component.formatNumber(1000000)).toBe('1,000,000');
  });

  it('should format BTC amounts correctly', () => {
    expect(component.formatBTC(50.123456)).toBe('50.1235');
    expect(component.formatBTC(0.0001)).toBe('0.0001');
  });
});
