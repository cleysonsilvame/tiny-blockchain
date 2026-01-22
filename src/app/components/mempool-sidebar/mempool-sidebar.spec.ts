import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MempoolSidebar } from './mempool-sidebar';
import { MempoolService } from '../../services/mempool.service';
import { WalletService } from '../../services/wallet.service';
import { Blockchain } from '../../services/blockchain.service';

describe('MempoolSidebar Component', () => {
  let component: MempoolSidebar;
  let fixture: ComponentFixture<MempoolSidebar>;
  let mempoolService: MempoolService;
  let walletService: WalletService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MempoolSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(MempoolSidebar);
    component = fixture.componentInstance;
    mempoolService = TestBed.inject(MempoolService);
    walletService = TestBed.inject(WalletService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add transaction to mempool when sender has sufficient balance', () => {
    // First mine a block to give the sender some balance
    const blockchain = TestBed.inject(Blockchain);
    const senderAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const block = {
      number: 1,
      nonce: 0,
      data: 'genesis',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: senderAddress, // Give this address some balance
      reward: 50,
      timestamp: Date.now(),
    };
    blockchain.addBlockToChain(block);
    
    const initialCount = mempoolService.mempool().length;
    
    component.sender.set(senderAddress);
    component.receiver.set('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
    component.amount.set('1.5');
    component.fee.set('0.0001');
    
    component.submitTransaction(new Event('submit'));
    
    expect(mempoolService.mempool().length).toBe(initialCount + 1);
  });

  it('should clear form after submitting valid transaction', () => {
    // First mine a block to give the sender some balance
    const blockchain = TestBed.inject(Blockchain);
    const senderAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const block = {
      number: 1,
      nonce: 0,
      data: 'genesis',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: senderAddress,
      reward: 50,
      timestamp: Date.now(),
    };
    blockchain.addBlockToChain(block);
    
    component.sender.set(senderAddress);
    component.receiver.set('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
    component.amount.set('1.5');
    component.fee.set('0.0001');
    
    component.submitTransaction(new Event('submit'));
    
    expect(component.sender()).toBe('');
    expect(component.receiver()).toBe('');
    expect(component.amount()).toBe('');
    expect(component.fee()).toBe('0.0001');
  });

  it('should fill random data correctly', () => {
    component.fillRandomData();
    
    expect(component.sender()).toBeTruthy();
    expect(component.receiver()).toBeTruthy();
    expect(component.amount()).toBeTruthy();
    expect(component.fee()).toBeTruthy();
  });

  it('should toggle auto generation', () => {
    expect(component.autoGenerate()).toBe(false);
    
    component.toggleAutoGenerate();
    expect(component.autoGenerate()).toBe(true);
    
    component.toggleAutoGenerate();
    expect(component.autoGenerate()).toBe(false);
  });

  it('should toggle generation mode between realistic and random', () => {
    component.generationMode.set('realistic');
    component.toggleGenerationMode();
    expect(component.generationMode()).toBe('random');
    
    component.toggleGenerationMode();
    expect(component.generationMode()).toBe('realistic');
  });

  it('should sort transactions by fee when prioritized', () => {
    mempoolService.prioritizeMempoolByFee.set(true);
    mempoolService.mempool.set([
      { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
      { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0003 },
      { id: '3', sender: 'E', receiver: 'F', amount: 3, fee: 0.0002 },
    ]);
    
    const sorted = component.sortedTransactions();
    expect(sorted[0].fee).toBe(0.0003);
    expect(sorted[1].fee).toBe(0.0002);
    expect(sorted[2].fee).toBe(0.0001);
  });

  it('should not sort transactions when not prioritized', () => {
    mempoolService.prioritizeMempoolByFee.set(false);
    const originalTxs = [
      { id: '1', sender: 'A', receiver: 'B', amount: 1, fee: 0.0001 },
      { id: '2', sender: 'C', receiver: 'D', amount: 2, fee: 0.0003 },
    ];
    mempoolService.mempool.set(originalTxs);
    
    const sorted = component.sortedTransactions();
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
  });
});
