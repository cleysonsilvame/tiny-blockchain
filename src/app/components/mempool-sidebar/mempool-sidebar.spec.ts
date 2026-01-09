import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MempoolSidebar } from './mempool-sidebar';

describe('MempoolSidebar', () => {
  let component: MempoolSidebar;
  let fixture: ComponentFixture<MempoolSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MempoolSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(MempoolSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
