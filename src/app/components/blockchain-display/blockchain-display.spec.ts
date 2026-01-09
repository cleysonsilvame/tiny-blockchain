import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockchainDisplay } from './blockchain-display';

describe('BlockchainDisplay', () => {
  let component: BlockchainDisplay;
  let fixture: ComponentFixture<BlockchainDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockchainDisplay],
    }).compileComponents();

    fixture = TestBed.createComponent(BlockchainDisplay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
