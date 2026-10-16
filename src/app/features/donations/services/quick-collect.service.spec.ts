import { TestBed } from '@angular/core/testing';
import { QuickCollectService } from './quick-collect.service';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

describe('QuickCollectService', () => {
  let service: QuickCollectService;
  let blocksMutations: boolean;
  let handleRestrictedAction: jest.Mock;

  beforeEach(() => {
    blocksMutations = false;
    handleRestrictedAction = jest.fn().mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        QuickCollectService,
        {
          provide: SubscriptionAccessService,
          useValue: { blocksMutations: () => blocksMutations },
        },
        {
          provide: SubscriptionRestrictionService,
          useValue: { handleRestrictedAction },
        },
      ],
    });

    service = TestBed.inject(QuickCollectService);
  });

  it('opens drawer when mutations are allowed', () => {
    const next: unknown[] = [];
    service.open$.subscribe((ctx) => next.push(ctx));

    service.open({ familyId: 'family-1' });

    expect(next).toEqual([{ familyId: 'family-1' }]);
    expect(handleRestrictedAction).not.toHaveBeenCalled();
  });

  it('blocks open and shows restriction modal when subscription blocks mutations', () => {
    blocksMutations = true;
    const next: unknown[] = [];
    service.open$.subscribe((ctx) => next.push(ctx));

    service.open();

    expect(next).toHaveLength(0);
    expect(handleRestrictedAction).toHaveBeenCalled();
  });
});
