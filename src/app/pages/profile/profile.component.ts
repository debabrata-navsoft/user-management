import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { formatDate, getInitials } from '../../core/utils/formatters';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ChangePasswordComponent } from '../auth/change-password/change-password.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    BadgeComponent,
    ChangePasswordComponent,
    LucideAngularModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  userInitials = computed(() => getInitials(this.currentUser()?.name || ''));

  formatDate = formatDate;
}
