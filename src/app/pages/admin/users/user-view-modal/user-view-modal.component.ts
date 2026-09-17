import { Component, input, output } from '@angular/core';
import { User } from '../../../../core/models/user.model';
import { formatDate, getInitials, roleBadgeVariant } from '../../../../core/utils/formatters';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-user-view-modal',
  standalone: true,
  imports: [ModalComponent, BadgeComponent, UiButtonComponent],
  templateUrl: './user-view-modal.component.html',
  styleUrl: './user-view-modal.component.css',
})
export class UserViewModalComponent {
  isOpen = input<boolean>(false);
  user = input<User | null>(null);

  close = output<void>();
  edit = output<User>();

  formatDate = formatDate;
  getInitials = getInitials;
  roleBadgeVariant = roleBadgeVariant;

  requestEdit(): void {
    const u = this.user();
    if (u) {
      this.edit.emit(u);
    }
  }
}
