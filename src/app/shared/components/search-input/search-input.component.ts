import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css',
})
export class SearchInputComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  placeholder = input<string>('Search...');
  value = input<string>('');
  debounce = input<number>(300);

  searchChange = output<string>();

  control = new FormControl<string>('');

  constructor() {
    effect(() => {
      const next = this.value();
      if (next !== (this.control.value ?? '')) {
        this.control.setValue(next, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.control.valueChanges
      .pipe(
        debounceTime(this.debounce()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((val) => {
        this.searchChange.emit(val || '');
      });
  }

  clear(): void {
    this.control.setValue('');
  }
}
