import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
})
export class BadgeComponent {
  variant = input<'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' | 'indigo'>(
    'neutral',
  );
  dot = input<boolean>(false);
}
