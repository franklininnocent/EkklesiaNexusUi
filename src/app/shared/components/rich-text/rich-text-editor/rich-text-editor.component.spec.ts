import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<RichTextEditorComponent>;
  let component: RichTextEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorComponent);
    component = fixture.componentInstance;
    component.id = 'test-rich-text';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('mounts an editable ProseMirror surface with the field id', () => {
    const root = fixture.nativeElement as HTMLElement;
    const pm = root.querySelector('.ProseMirror[contenteditable="true"]');
    expect(pm).not.toBeNull();
    expect(pm?.getAttribute('id')).toBe('test-rich-text');
  });

  it('writes and reads values through the CVA', () => {
    const control = new FormControl('');
    component.registerOnChange((value) => control.setValue(value));
    component.writeValue('<p>Hello</p>');
    fixture.detectChanges();

    const html = component.editor?.getHTML() ?? '';
    expect(html).toContain('Hello');
  });

  it('disables editing when setDisabledState(true) is called', () => {
    component.setDisabledState(true);
    fixture.detectChanges();
    const pm = fixture.nativeElement.querySelector('.ProseMirror') as HTMLElement | null;
    expect(pm?.getAttribute('contenteditable')).toBe('false');
    expect(component.editor?.isEditable).toBe(false);
  });
});
