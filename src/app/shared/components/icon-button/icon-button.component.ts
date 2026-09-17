import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'button[appIconButton]',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.css',
  host: {
    type: 'button',
    class: 'icon-btn',
    '[class.danger]': "variant() === 'danger'",
    '[attr.title]': 'label()',
    '[attr.aria-label]': 'label()',
    '[disabled]': 'disabled() ? true : null',
  },
})
export class IconButtonComponent {
  icon = input.required<string>();
  label = input<string>('');
  variant = input<'default' | 'danger'>('default');
  size = input<number>(14);
  disabled = input<boolean>(false);
}
