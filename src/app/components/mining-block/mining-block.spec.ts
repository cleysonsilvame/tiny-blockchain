import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiningBlock } from './mining-block';

describe('MiningBlock', () => {
  let component: MiningBlock;
  let fixture: ComponentFixture<MiningBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiningBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiningBlock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
