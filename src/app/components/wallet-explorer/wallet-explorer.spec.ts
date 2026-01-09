import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletExplorer } from './wallet-explorer';

describe('WalletExplorer', () => {
  let component: WalletExplorer;
  let fixture: ComponentFixture<WalletExplorer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletExplorer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletExplorer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
