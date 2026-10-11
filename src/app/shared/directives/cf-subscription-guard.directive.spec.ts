import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { CfSubscriptionGuardDirective } from './cf-subscription-guard.directive';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService } from '@core/services/subscription-restriction.service';

@Component({
  standalone: true,
  imports: [CfSubscriptionGuardDirective],
  template: `<button type="button" cfSubscriptionGuard (click)="clicked = true">Add</button>`,
})
class HostComponent {
  clicked = false;
}

describe('CfSubscriptionGuardDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let blocksMutations: ReturnType<typeof signal<boolean>>;
  let handleRestrictedAction: jest.Mock;

  beforeEach(async () => {
    blocksMutations = signal(false);
    handleRestrictedAction = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: SubscriptionAccessService,
          useValue: { blocksMutations: () => blocksMutations() },
        },
        {
          provide: SubscriptionRestrictionService,
          useValue: { handleRestrictedAction },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('allows click when subscription is full access', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(fixture.componentInstance.clicked).toBe(true);
    expect(handleRestrictedAction).not.toHaveBeenCalled();
  });

  it('blocks click and opens restriction modal when mutations are blocked', () => {
    blocksMutations.set(true);
    handleRestrictedAction.mockReturnValue(false);

    const directive = fixture.debugElement
      .query(By.directive(CfSubscriptionGuardDirective))
      .injector.get(CfSubscriptionGuardDirective);
    const event = new MouseEvent('click', { cancelable: true });
    directive.onClick(event);

    expect(handleRestrictedAction).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
