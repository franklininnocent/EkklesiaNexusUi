import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { RichTextEditorComponent } from '@shared/components/rich-text/rich-text-editor/rich-text-editor.component';
import { OrganizationCategory, OrganizationType } from '../../models/ministries.model';
import { OrganizationFormGroup } from '../../utils/organization-form.util';

/**
 * OrganizationFormFieldsComponent
 *
 * Renders the Basics/About/Contact/Settings fields shared by the
 * "Add organization" page and the organization detail page's inline
 * "Edit profile" form — previously two byte-for-byte duplicated field
 * sets. Built on the shared `app-form-field` wrapper so every field gets
 * one label/required-marker/error style. Purely presentational: the host
 * page owns the `FormGroup`, submit handling, and payload building.
 */
@Component({
  selector: 'app-organization-form-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, RichTextEditorComponent],
  templateUrl: './organization-form-fields.component.html',
  styleUrl: './organization-form-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class OrganizationFormFieldsComponent implements AfterViewInit {
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) form!: OrganizationFormGroup;
  @Input() categories: OrganizationCategory[] = [];
  @Input() types: OrganizationType[] = [];
  @Input() submitted = false;
  @Input() fieldErrors: Record<string, string> = {};
  @Input({ required: true }) maxEstablishedDate!: string;
  /** Desktop two-column section layout (create + detail edit). */
  @Input() columns = false;

  ngAfterViewInit(): void {
    const editorCount = this.hostEl.nativeElement.querySelectorAll('app-rich-text-editor').length;
    // #region agent log
    typeof fetch === 'function' && fetch('http://127.0.0.1:7590/ingest/fcdc8726-2655-43c0-b4d1-d6cb441fb521',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'158497'},body:JSON.stringify({sessionId:'158497',runId:'ministries-post-fix-3',hypothesisId:'F',location:'organization-form-fields.component.ts:ngAfterViewInit',message:'rich text editors mounted',data:{editorCount,expected:4},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  /** Resolves the first applicable validator/server error message for a control. */
  error(name: keyof OrganizationFormGroup['controls'], messages: Record<string, string>): string | null {
    const serverError = this.fieldErrors[name as string];
    if (serverError) {
      return serverError;
    }
    if (!this.submitted) {
      return null;
    }
    const control = this.form.controls[name];
    for (const key of Object.keys(messages)) {
      if (control.hasError(key)) {
        return messages[key];
      }
    }
    return null;
  }

  /** Simpler variant for single-validator "required" style fields (e.g. selects). */
  requiredError(name: keyof OrganizationFormGroup['controls'], message: string): string | null {
    return this.error(name, { required: message });
  }
}
