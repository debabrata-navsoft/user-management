import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UiButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  title = input<string>('No items found');
  description = input<string>('There are no items matching your criteria at this moment.');
  actionText = input<string>('');

  action = output<void>();
}
