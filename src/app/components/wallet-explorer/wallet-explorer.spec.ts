import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletExplorer } from './wallet-explorer';
import { Blockchain } from '../../services/blockchain.service';
import { WalletService } from '../../services/wallet.service';

describe('WalletExplorer Component', () => {
  let component: WalletExplorer;
  let fixture: ComponentFixture<WalletExplorer>;
  let blockchain: Blockchain;
  let walletService: WalletService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletExplorer],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletExplorer);
    component = fixture.componentInstance;
    blockchain = TestBed.inject(Blockchain);
    walletService = TestBed.inject(WalletService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search wallet by address', () => {
    const testAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    component.searchAddress.set(testAddress);
    
    component.searchWallet();
    
    expect(component.selectedAddress()).toBe(testAddress);
  });

  it('should select address directly', () => {
    const testAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
    
    component.selectAddress(testAddress);
    
    expect(component.selectedAddress()).toBe(testAddress);
    expect(component.searchAddress()).toBe(testAddress);
  });

  it('should clear search', () => {
    component.searchAddress.set('test');
    component.selectedAddress.set('test');
    
    component.clearSearch();
    
    expect(component.searchAddress()).toBe('');
    expect(component.selectedAddress()).toBe(null);
  });

  it('should display balance for selected address', () => {
    const testAddress = blockchain.getDefaultMinerAddress();
    
    // Mine a block to give the miner a reward
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: testAddress,
      reward: 50,
      timestamp: Date.now(),
    };
    blockchain.addBlockToChain(block);
    
    component.selectAddress(testAddress);
    
    expect(component.balance()).toBeGreaterThan(0);
  });

  it('should display transaction history for selected address', () => {
    const testAddress = blockchain.getDefaultMinerAddress();
    
    // Mine a block
    const block = {
      number: 1,
      nonce: 0,
      data: 'test',
      previousHash: '0',
      hash: '0000test',
      transactions: [],
      minerAddress: testAddress,
      reward: 50,
      timestamp: Date.now(),
    };
    blockchain.addBlockToChain(block);
    
    component.selectAddress(testAddress);
    
    const history = component.history();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].type).toBe('mining_reward');
  });
});
