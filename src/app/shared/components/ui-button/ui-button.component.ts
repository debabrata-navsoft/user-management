import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.css',
})
export class UiButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  size = input<'sm' | 'md' | 'lg'>('md');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);
}
