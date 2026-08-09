import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaxCategory, TaxRegime } from './models';
import { TaxService } from './tax.service';

describe('TaxService', () => {
  let service: TaxService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaxService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listsRegimesFromThePlatformApi', () => {
    service.regimes().subscribe();
    const req = httpMock.expectOne('/api/platform/tax/regimes');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('fetchesTheHistoryOfARegime', () => {
    service.history(TaxRegime.TGC).subscribe();
    const req = httpMock.expectOne('/api/platform/tax/regimes/TGC/history');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('schedulesANewRate', () => {
    service.scheduleRate(TaxRegime.TGC, {
      category: TaxCategory.NORMAL, rate: 0.12, label: 'Taux normal', validFrom: '2027-01-01',
    }).subscribe();

    const req = httpMock.expectOne('/api/platform/tax/regimes/TGC/rates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      category: TaxCategory.NORMAL, rate: 0.12, label: 'Taux normal', validFrom: '2027-01-01',
    });
    req.flush({ category: TaxCategory.NORMAL, label: 'Taux normal', rate: 0.12, validFrom: '2027-01-01', validTo: null });
  });
});
