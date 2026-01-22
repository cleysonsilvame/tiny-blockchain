import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiningBlock } from './mining-block';
import { Blockchain } from '../../services/blockchain.service';
import { MempoolService } from '../../services/mempool.service';
import { MiningService } from '../../services/mining.service';

describe('MiningBlock Component', () => {
  let component: MiningBlock;
  let fixture: ComponentFixture<MiningBlock>;
  let blockchain: Blockchain;
  let mempoolService: MempoolService;
  let miningService: MiningService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiningBlock],
    }).compileComponents();

    fixture = TestBed.createComponent(MiningBlock);
    component = fixture.componentInstance;
    blockchain = TestBed.inject(Blockchain);
    mempoolService = TestBed.inject(MempoolService);
    miningService = TestBed.inject(MiningService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle mining mode when not mining', () => {
    miningService.isMining.set(false);
    miningService.miningMode.set('single');
    
    component.toggleMiningMode();
    
    expect(miningService.miningMode()).toBe('race');
  });

  it('should not toggle mining mode when mining', () => {
    miningService.isMining.set(true);
    miningService.miningMode.set('single');
    
    component.toggleMiningMode();
    
    expect(miningService.miningMode()).toBe('single');
  });

  it('should update nonce on change', () => {
    component.onNonceChange('42');
    expect(miningService.nonce()).toBe(42);
  });

  it('should update data on change', () => {
    component.onDataChange('test data');
    expect(miningService.data()).toBe('test data');
  });

  it('should calculate total reward correctly', () => {
    miningService.selectedTransactions.set([
      { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
      { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
    ]);
    
    const reward = component.totalReward();
    expect(reward).toBeGreaterThan(0);
  });

  it('should calculate total fees correctly', () => {
    miningService.selectedTransactions.set([
      { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
      { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0002 },
    ]);
    
    const fees = component.totalFees();
    expect(fees).toBeCloseTo(0.0003, 4);
  });
});
