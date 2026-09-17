import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { LoadingService } from '../core/services/loading.service';
import { getInitials } from '../core/utils/formatters';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../shared/components/badge/badge.component';
import { ImageModalComponent } from '../shared/components/image-modal/image-modal.component';
import { LoaderComponent } from '../shared/components/loader/loader.component';

export type NavIconType =
  'admin-dash' | 'manager-dash' | 'user-dash' | 'users' | 'drive' | 'gallery' | 'profile';

interface NavItem {
  label: string;
  route: string;
  iconName: string;
  roles: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BadgeComponent,
    LoaderComponent,
    ImageModalComponent,
    LucideAngularModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  loadingService = inject(LoadingService);

  isSidebarCollapsed = signal<boolean>(false);
  isMobileNavOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);

  currentUser = this.authService.currentUser;
  userInitials = computed(() => getInitials(this.currentUser()?.name || ''));

  allNavItems: NavItem[] = [
    {
      label: 'Admin Dashboard',
      route: '/admin/dashboard',
      roles: ['admin'],
      iconName: 'layout-dashboard',
    },
    {
      label: 'Manager Dashboard',
      route: '/manager/dashboard',
      roles: ['manager'],
      iconName: 'layout-dashboard',
    },
    {
      label: 'My Dashboard',
      route: '/user/dashboard',
      roles: ['employee'],
      iconName: 'home',
    },
    {
      label: 'User Management',
      route: '/admin/users',
      roles: ['admin'],
      iconName: 'users',
    },
    {
      label: 'File & Drive Manager',
      route: '/drive',
      roles: ['admin', 'manager', 'employee'],
      iconName: 'folder',
    },
    {
      label: 'Image Gallery & Zoom',
      route: '/gallery',
      roles: ['admin', 'manager', 'employee'],
      iconName: 'image',
    },
    {
      label: 'Profile & Security',
      route: '/profile',
      roles: ['admin', 'manager', 'employee'],
      iconName: 'user',
    },
  ];

  filteredNavItems = computed(() => {
    const role = this.currentUser()?.role || 'employee';
    return this.allNavItems.filter((item) => item.roles.includes(role));
  });

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((v) => !v);
  }

  toggleMobileNav(): void {
    this.isMobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout(true);
  }

  getRoleBadgeVariant(role: string): 'primary' | 'purple' | 'indigo' {
    if (role === 'admin') return 'primary';
    if (role === 'manager') return 'purple';
    return 'indigo';
  }
}
