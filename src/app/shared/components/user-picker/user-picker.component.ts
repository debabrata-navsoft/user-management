import { Component, computed, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { User } from '../../../core/models/user.model';
import { getInitials, roleBadgeVariant } from '../../../core/utils/formatters';
import { BadgeComponent } from '../badge/badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoaderComponent } from '../loader/loader.component';
import { SearchInputComponent } from '../search-input/search-input.component';

/**
 * The list an admin or manager lands on in the Gallery and Drive: pick a user, then see
 * what they uploaded. Both pages scope their own view to one owner at a time.
 */
@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [
    BadgeComponent,
    EmptyStateComponent,
    LoaderComponent,
    SearchInputComponent,
    LucideAngularModule,
  ],
  templateUrl: './user-picker.component.html',
  styleUrl: './user-picker.component.css',
})
export class UserPickerComponent {
  users = input<User[]>([]);
  isLoading = input<boolean>(false);
  title = input<string>('Browse by user');
  subtitle = input<string>('Open a user to see what they uploaded');

  select = output<User>();

  search = signal<string>('');

  getInitials = getInitials;
  roleBadgeVariant = roleBadgeVariant;

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.users();

    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q),
    );
  });
}
