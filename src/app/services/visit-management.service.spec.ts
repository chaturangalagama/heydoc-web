import { TestBed } from '@angular/core/testing';

import { VisitManagementService } from './visit-management.service';

describe('VisitManagementService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: VisitManagementService = TestBed.get(VisitManagementService);
    expect(service).toBeTruthy();
  });
});
