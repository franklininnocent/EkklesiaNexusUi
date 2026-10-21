import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CfSelectCreateFooterComponent } from './cf-select-create-footer.component';

describe('CfSelectCreateFooterComponent', () => {
  let fixture: ComponentFixture<CfSelectCreateFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CfSelectCreateFooterComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CfSelectCreateFooterComponent);
    fixture.componentInstance.ariaLabel = 'Add new collection purpose';
    fixture.detectChanges();
  });

  it('emits activated on mousedown (ng-select footer pattern)', () => {
    const spy = jest.fn();
    fixture.componentInstance.activated.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits activated on click for keyboard activation', () => {
    const spy = jest.fn();
    fixture.componentInstance.activated.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit on pointer when suppressPointerActivation is set', () => {
    const spy = jest.fn();
    fixture.componentInstance.suppressPointerActivation = true;
    fixture.detectChanges();
    fixture.componentInstance.activated.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    btn.click();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not emit when disabled', () => {
    const spy = jest.fn();
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    fixture.componentInstance.activated.subscribe(spy);
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    btn.click();
    expect(spy).not.toHaveBeenCalled();
  });

  it('cancels mousedown default to keep the parent panel open until click', () => {
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    btn.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('uses the entity-specific accessible name', () => {
    const btn = fixture.nativeElement.querySelector('.cf-select-create__btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Add new collection purpose');
  });
});
