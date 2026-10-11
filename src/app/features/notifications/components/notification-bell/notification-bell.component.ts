import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NotificationInboxService } from '../../services/notification-inbox.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  readonly inbox = inject(NotificationInboxService);

  readonly badgeLabel = computed(() => {
    const count = this.inbox.unreadCount();
    if (count <= 0) {
      return 'Notifications';
    }
    if (count > 99) {
      return 'Notifications, 99 plus unread';
    }
    return `Notifications, ${count} unread`;
  });

  readonly badgeText = computed(() => {
    const count = this.inbox.unreadCount();
    if (count <= 0) {
      return '';
    }
    return count > 99 ? '99+' : String(count);
  });

  toggle(): void {
    this.inbox.togglePopover();
  }
}
