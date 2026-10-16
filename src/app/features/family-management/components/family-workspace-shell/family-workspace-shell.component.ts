import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-family-workspace-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="family-shell">
      <router-outlet />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .family-shell {
        display: grid;
        gap: var(--cf-space-2);
        min-width: 0;
      }
    `,
  ],
})
export class FamilyWorkspaceShellComponent {}
