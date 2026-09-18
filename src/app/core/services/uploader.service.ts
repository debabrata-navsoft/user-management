import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '../models/user.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class UploaderService {
  private userService = inject(UserService);

  private users = signal<User[]>([]);

  constructor() {
    this.userService.getAllUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => undefined,
    });
  }

  private nameByEmail = computed(
    () => new Map(this.users().map((u) => [u.email?.toLowerCase(), u.name])),
  );

  nameFor(uploadedBy?: string): string {
    const value = (uploadedBy || '').trim();
    if (!value) return 'Unknown';
    if (!value.includes('@')) return value;
    return this.nameByEmail().get(value.toLowerCase()) || value;
  }
}
