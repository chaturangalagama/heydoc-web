import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoLogoutPopupComponent } from './auto-logout-popup.component';

describe('CaseManagerDeleteVisitComponent', () => {
  let component: AutoLogoutPopupComponent;
  let fixture: ComponentFixture<AutoLogoutPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AutoLogoutPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AutoLogoutPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
