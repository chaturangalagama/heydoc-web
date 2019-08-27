import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimManualComponent } from './claim-manual.component';

describe('ClaimManualComponent', () => {
  let component: ClaimManualComponent;
  let fixture: ComponentFixture<ClaimManualComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClaimManualComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClaimManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
