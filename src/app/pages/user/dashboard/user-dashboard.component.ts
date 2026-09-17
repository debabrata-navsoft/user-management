import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getInitials } from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, UiButtonComponent, BadgeComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  userInitials = computed(() => getInitials(this.currentUser()?.name || ''));
}
