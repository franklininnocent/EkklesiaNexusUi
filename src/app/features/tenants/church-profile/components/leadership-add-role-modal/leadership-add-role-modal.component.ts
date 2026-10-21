import { CommonModule } from '@angular/common';
import { ApiError, apiErrorMessage } from '@core/errors/api-error';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LeadershipCategory,
  LeadershipCategoryOption,
  LeadershipRoleOption,
} from '@core/models/church/leadership-governance.model';
import { ChurchLeadershipGovernanceService } from '@core/services/church/church-leadership-governance.service';
import { ToastService } from '@core/services/toast.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import {
  canonicalizeLeadershipRoleTitle,
  findExactRoleMatch,
} from '../../utils/leadership-role-query.util';

@Component({
  selector: 'app-leadership-add-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  templateUrl: './leadership-add-role-modal.component.html',
  styleUrl: './leadership-add-role-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadershipAddRoleModalComponent implements OnInit, AfterViewInit {
  private readonly api = inject(ChurchLeadershipGovernanceService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('roleNameInput') roleNameInput?: ElementRef<HTMLInputElement>;

  @Input() nested = true;
  @Input() initialName = '';
  @Input() defaultCategory: LeadershipCategory = 'PARISH_CLERGY';
  @Input() showCategory = false;
  @Input() categoryOptions: LeadershipCategoryOption[] = [];
  @Input() existingRoles: LeadershipRoleOption[] = [];
  @Input() nameInputId = 'new_role_name';

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<LeadershipRoleOption>();
  @Output() rolesRefresh = new EventEmitter<LeadershipRoleOption[]>();

  roleName = '';
  category: LeadershipCategory = 'PARISH_CLERGY';
  error: string | null = null;
  creating = false;

  ngOnInit(): void {
    this.roleName = canonicalizeLeadershipRoleTitle(this.initialName);
    this.category = this.defaultCategory;
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.roleNameInput?.nativeElement.focus());
  }

  cancel(): void {
    if (this.creating) {
      return;
    }
    this.closed.emit();
  }

  save(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const title = canonicalizeLeadershipRoleTitle(this.roleName);
    if (!title) {
      this.error = 'Role name is required.';
      this.cdr.markForCheck();
      return;
    }

    if (this.creating) {
      return;
    }

    const existing = findExactRoleMatch(this.existingRoles, title);
    if (existing) {
      this.toast.warning(
        `"${existing.title}" is already available and has been selected.`,
        'Role already exists',
      );
      this.created.emit(existing);
      this.closed.emit();
      return;
    }

    this.creating = true;
    this.error = null;
    this.cdr.markForCheck();

    this.api.createRole({ title, category: this.category }).subscribe({
      next: (response) => {
        const created = response.data;
        const nextRoles = [...this.existingRoles.filter((role) => role.id !== created.id), created];
        this.rolesRefresh.emit(nextRoles);
        this.created.emit(created);
        this.toast.success(
          `${created.title} is now available for this church.`,
          'Custom role added',
        );
        this.creating = false;
        this.closed.emit();
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.creating = false;
        if ((error instanceof HttpErrorResponse || error instanceof ApiError) && error.status === 409 && error.error?.code === 'ROLE_ALREADY_EXISTS') {
          this.refreshRolesAndSelect(title);
          return;
        }
        const message = (error instanceof HttpErrorResponse || error instanceof ApiError)
          ? apiErrorMessage(error, 'Could not create custom role.')
          : 'Could not create custom role.';
        this.error = message;
        this.toast.error(message);
        this.cdr.markForCheck();
      },
    });
  }

  onNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.save(event);
    }
  }

  private refreshRolesAndSelect(title: string): void {
    this.api.listRoles().subscribe({
      next: (response) => {
        this.rolesRefresh.emit(response.data);
        const match = findExactRoleMatch(response.data, title);
        this.toast.warning(
          `"${title}" is already available and has been selected.`,
          'Role already exists',
        );
        if (match) {
          this.created.emit(match);
        }
        this.creating = false;
        this.closed.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.creating = false;
        this.error = 'Could not create custom role.';
        this.cdr.markForCheck();
      },
    });
  }
}
