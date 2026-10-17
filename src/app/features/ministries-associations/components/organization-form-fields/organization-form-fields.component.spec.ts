import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { createOrganizationFormGroup } from '../../utils/organization-form.util';
import { OrganizationFormFieldsComponent } from './organization-form-fields.component';

describe('OrganizationFormFieldsComponent', () => {
  let fixture: ComponentFixture<OrganizationFormFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationFormFieldsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationFormFieldsComponent);
    fixture.componentInstance.form = createOrganizationFormGroup(new FormBuilder());
    fixture.componentInstance.maxEstablishedDate = '2026-10-17';
    fixture.componentInstance.categories = [{ id: 'c1', name: 'Ministry' } as never];
    fixture.componentInstance.types = [{ id: 't1', name: 'Parish' } as never];
    fixture.detectChanges();
  });

  it('renders the four About rich-text editors immediately', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('Scroll to load rich text editors');
    expect(root.querySelectorAll('app-rich-text-editor').length).toBe(4);
    expect(root.querySelector('#org-field-description')).not.toBeNull();
    expect(root.querySelector('#org-field-vision')).not.toBeNull();
    expect(root.querySelector('#org-field-mission')).not.toBeNull();
    expect(root.querySelector('#org-field-objectives')).not.toBeNull();
  });
});
