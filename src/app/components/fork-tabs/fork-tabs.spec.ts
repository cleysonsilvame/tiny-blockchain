import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForkTabs } from './fork-tabs';
import { Blockchain } from '../../services/blockchain.service';
import { MiningService } from '../../services/mining.service';

describe('ForkTabs Component', () => {
  let component: ForkTabs;
  let fixture: ComponentFixture<ForkTabs>;
  let blockchain: Blockchain;
  let miningService: MiningService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForkTabs],
    }).compileComponents();

    fixture = TestBed.createComponent(ForkTabs);
    component = fixture.componentInstance;
    blockchain = TestBed.inject(Blockchain);
    miningService = TestBed.inject(MiningService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select fork correctly', () => {
    // Create a fork first
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
    
    const forkId = blockchain.createChain(0, 'Test Fork');
    
    component.selectFork(forkId);
    
    expect(blockchain.activeChainId()).toBe(forkId);
  });

  it('should create fork from main chain', () => {
    // Add a block to main chain
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
    
    const initialChainCount = blockchain.chains().length;
    
    component.createFork();
    
    expect(blockchain.chains().length).toBe(initialChainCount + 1);
  });

  it('should delete fork correctly', () => {
    // Create a fork
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
    
    const forkId = blockchain.createChain(0, 'Test Fork');
    const initialCount = blockchain.chains().length;
    
    const event = new Event('click');
    component.deleteFork(forkId, event);
    
    expect(blockchain.chains().length).toBe(initialCount - 1);
  });

  it('should not delete main chain', () => {
    const initialCount = blockchain.chains().length;
    const event = new Event('click');
    
    component.deleteFork('main', event);
    
    expect(blockchain.chains().length).toBe(initialCount);
  });

  it('should disable fork actions during mining', () => {
    miningService.isMining.set(true);
    expect(component.isDisabled()).toBe(true);
    
    miningService.isMining.set(false);
    miningService.isRacing.set(true);
    expect(component.isDisabled()).toBe(true);
    
    miningService.isRacing.set(false);
    expect(component.isDisabled()).toBe(false);
  });
});
