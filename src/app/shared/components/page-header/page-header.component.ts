import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { BreadcrumbItem } from '../../../core/models/drive.model';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css',
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  badgeText = input<string>('');
  breadcrumbs = input<BreadcrumbItem[] | null>(null);
}
