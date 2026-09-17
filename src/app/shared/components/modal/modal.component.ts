import { CommonModule } from '@angular/common';
import { Component, HostListener, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  closable = input<boolean>(true);
  hasFooter = input<boolean>(true);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen() && this.closable()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closable()) {
      this.close.emit();
    }
  }
}
