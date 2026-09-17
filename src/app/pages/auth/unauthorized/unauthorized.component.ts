import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UiButtonComponent],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css',
})
export class UnauthorizedComponent {
  private authService = inject(AuthService);

  goHome(): void {
    this.authService.redirectAfterLogin();
  }
}
